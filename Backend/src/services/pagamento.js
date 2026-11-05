import db from '../db/client.js';
import Pagamento from '../repository/pagamento.js';
import Atendimento from '../repository/atendimento.js';
import Comissao from '../repository/comissao.js';
import Caixa from '../repository/caixa.js';
import { METODOS_PAGAMENTO } from './caixa.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';

export function agruparParcelasPorMetodo(parcelas) {
    const valores = new Map();
    for (const parcela of parcelas) {
        valores.set(
            parcela.metodo_pagamento,
            (valores.get(parcela.metodo_pagamento) ?? 0) + Number(parcela.valor)
        );
    }

    return [...valores].map(([metodo_pagamento, valor]) => ({ metodo_pagamento, valor }));
}

//so quando a soma das parcelas cobre o devido o atendimento passa a liquidado (RN08)
const registrar = async (atendimento_id, { parcelas, registado_por }) => {
    const atendimento = await Atendimento.findById(atendimento_id);

    if (!atendimento) {
        throw criarErro(404, "Atendimento nao encontrado");
    }
    if (atendimento.estado === "Anulado") {
        throw criarErro(409, "Um atendimento anulado nao pode ser pago");
    }

    const somaNovas = parcelas.reduce((total, p) => total + Number(p.valor), 0);
    for (const parcela of parcelas) {
        if (!METODOS_PAGAMENTO.includes(parcela.metodo_pagamento)) {
            throw criarErro(400, 'Metodo de pagamento invalido');
        }
    }

    return db.transaction(async (tx) => {
        const sessao = await Caixa.findSessaoAberta(tx);
        if (!sessao) {
            throw criarErro(409, 'Abra uma sessao de Caixa antes de registar pagamentos');
        }

        const jaPago = await Pagamento.somaParcelas(tx, atendimento_id);
        const devido = atendimento.valor_total;

        //sem credito nesta fase: a soma das parcelas nao pode exceder o devido (RN07)
        if (jaPago + somaNovas > devido) {
            throw criarErro(400, `O total das parcelas excede o valor devido (${devido - jaPago} em falta)`);
        }

        const totalPago = jaPago + somaNovas;
        const estado = devido > 0 && totalPago >= devido ? "Liquidado" : "Parcial";

        const pagamento_id = await Pagamento.insert(tx, {
            atendimento_id,
            valor_total: somaNovas,
            estado,
            registado_por
        });

        for (const parcela of parcelas) {
            await Pagamento.insertParcela(tx, {
                pagamento_id,
                metodo_pagamento: parcela.metodo_pagamento,
                valor: parcela.valor,
                referencia: parcela.referencia
            });
        }

        for (const { metodo_pagamento, valor } of agruparParcelasPorMetodo(parcelas)) {
            await Caixa.inserirMovimento(tx, {
                id_sessao: sessao.id,
                tipo_movimento: "Entrada",
                metodo_pagamento,
                valor,
                descricao: `Pagamento #${pagamento_id} (${metodo_pagamento})`,
                origem: "Pagamento",
                referencia_id: pagamento_id,
                registado_por
            });
        }

        // A liquidacao total gera as comissoes (RN08/RN10). O estado do
        // atendimento mantem-se Concluido: o pagamento ja nao o altera.
        if (estado === "Liquidado") {
            await Comissao.gerarParaAtendimento(tx, atendimento_id);
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "pagamento",
            id_registo: pagamento_id,
            operacao: "criar",
            depois: {
                atendimento_id,
                valor_total: somaNovas,
                estado,
                metodos: agruparParcelasPorMetodo(parcelas)
            }
        }, tx);

        return pagamento_id;
    });
};

//anular preserva o registo e recalcula o estado, para o historico nao se perder
const anular = async (pagamento_id, { motivo, registado_por }) => {
    const pagamento = await Pagamento.findById(pagamento_id);

    if (!pagamento) {
        throw criarErro(404, "Pagamento nao encontrado");
    }
    if (pagamento.estado === "Anulado") {
        throw criarErro(409, "Este pagamento ja esta anulado");
    }

    await db.transaction(async (tx) => {
        await Pagamento.updateEstado(tx, pagamento_id, { estado: "Anulado", motivo_anulacao: motivo });
        await Caixa.anularMovimentosPorReferencia(tx, "Pagamento", pagamento_id);

        // O estado financeiro vive no pagamento; o atendimento continua
        // Concluido e o saldo em falta e recalculado pelas parcelas ativas.

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "pagamento",
            id_registo: pagamento_id,
            operacao: "anular",
            antes: { estado: pagamento.estado },
            depois: { estado: "Anulado" },
            motivo
        }, tx);
    });
};

const PagamentoService = {
    registrar,
    anular
};

export default PagamentoService;
