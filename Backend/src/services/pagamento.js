import db from '../db/client.js';
import Pagamento from '../repository/pagamento.js';
import Atendimento from '../repository/atendimento.js';
import Agendamento from '../repository/agendamento.js';
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

function validarParcelas(parcelas) {
    const soma = parcelas.reduce((total, p) => total + Number(p.valor), 0);

    if (!Number.isFinite(soma) || soma <= 0) {
        throw criarErro(400, 'O valor total das parcelas deve ser maior que zero');
    }

    for (const parcela of parcelas) {
        if (!METODOS_PAGAMENTO.includes(parcela.metodo_pagamento)) {
            throw criarErro(400, 'Metodo de pagamento invalido');
        }
        if (!Number.isFinite(Number(parcela.valor)) || Number(parcela.valor) <= 0) {
            throw criarErro(400, 'Cada parcela deve ter um valor maior que zero');
        }
    }

    return soma;
}

// Regista um pagamento para um atendimento ou para um agendamento pre-pago.
// A receita do agendamento e reconhecida aqui; as comissoes ficam para a
// execucao dos servicos.
const registrarPara = async ({ atendimento_id = null, agendamento_id = null }, { parcelas, registado_por }) => {
    const somaNovas = validarParcelas(parcelas);

    if (atendimento_id) {
        const atendimento = await Atendimento.findById(atendimento_id);

        if (!atendimento) {
            throw criarErro(404, 'Atendimento nao encontrado');
        }
        if (atendimento.estado === 'Anulado') {
            throw criarErro(409, 'Um atendimento anulado nao pode ser pago');
        }

        return db.transaction(async (tx) => {
            const sessao = await Caixa.findSessaoAberta(tx);
            if (!sessao) {
                throw criarErro(409, 'Abra uma sessao de Caixa antes de registar pagamentos');
            }

            const jaPago = await Pagamento.somaParcelas(tx, atendimento_id);
            const devido = Number(atendimento.valor_total);

            if (jaPago + somaNovas > devido) {
                throw criarErro(400, `O total das parcelas excede o valor devido (${devido - jaPago} em falta)`);
            }

            const totalPago = jaPago + somaNovas;
            const estado = devido > 0 && totalPago >= devido ? 'Liquidado' : 'Parcial';

            const pagamento_id = await Pagamento.insert(tx, {
                atendimento_id,
                valor_total: somaNovas,
                estado,
                registado_por
            });

            await registarParcelasEMovimentos(tx, {
                pagamento_id,
                sessao_id: sessao.id,
                parcelas,
                registado_por,
                descricao: (metodo) => `Pagamento #${pagamento_id} (${metodo})`
            });

            // A liquidacao total gera as comissoes (RN08/RN10). O estado do
            // atendimento mantem-se Concluido: o pagamento ja nao o altera.
            if (estado === 'Liquidado') {
                await Comissao.gerarParaAtendimento(tx, atendimento_id);
            }

            await AuditoriaService.registar({
                id_utilizador: registado_por,
                entidade: 'pagamento',
                id_registo: pagamento_id,
                operacao: 'criar',
                depois: {
                    atendimento_id,
                    valor_total: somaNovas,
                    estado,
                    metodos: agruparParcelasPorMetodo(parcelas)
                }
            }, tx);

            return pagamento_id;
        });
    }

    // Agendamento pre-pago: o pagamento e independente da execucao.
    return db.transaction(async (tx) => {
        await Agendamento.findForUpdate(tx, agendamento_id);

        const agendamento = await Agendamento.findById(agendamento_id, tx);
        if (!agendamento) {
            throw criarErro(404, 'Agendamento nao encontrado');
        }
        if (agendamento.estado === 'Anulado') {
            throw criarErro(409, 'Um agendamento anulado nao pode ser pago');
        }
        if (agendamento.estado === 'Concluido') {
            throw criarErro(409, 'Um agendamento concluido nao pode ser pago');
        }

        const sessao = await Caixa.findSessaoAberta(tx);
        if (!sessao) {
            throw criarErro(409, 'Abra uma sessao de Caixa antes de registar pagamentos');
        }

        const devido = Number(agendamento.valor_devido);
        const jaPago = Math.max(Number(agendamento.valor_pago) - Number(agendamento.valor_reembolsado), 0);

        if (somaNovas > devido - jaPago) {
            throw criarErro(400, `O total das parcelas excede o valor devido (${Math.max(devido - jaPago, 0)} em falta)`);
        }

        const totalPago = jaPago + somaNovas;
        const estado = devido > 0 && totalPago >= devido ? 'Liquidado' : 'Parcial';

        const pagamento_id = await Pagamento.insert(tx, {
            agendamento_id,
            valor_total: somaNovas,
            estado,
            registado_por
        });

        await registarParcelasEMovimentos(tx, {
            pagamento_id,
            sessao_id: sessao.id,
            parcelas,
            registado_por,
            descricao: (metodo) => `Pagamento #${pagamento_id} - Agendamento #${agendamento_id} (${metodo})`
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: 'pagamento',
            id_registo: pagamento_id,
            operacao: 'criar',
            depois: {
                agendamento_id,
                valor_total: somaNovas,
                estado,
                metodos: agruparParcelasPorMetodo(parcelas)
            }
        }, tx);

        return pagamento_id;
    });
};

async function registarParcelasEMovimentos(tx, {
    pagamento_id,
    sessao_id,
    parcelas,
    registado_por,
    descricao
}) {
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
            id_sessao: sessao_id,
            tipo_movimento: 'Entrada',
            metodo_pagamento,
            valor,
            descricao: descricao(metodo_pagamento),
            origem: 'Pagamento',
            referencia_id: pagamento_id,
            registado_por
        });
    }
}

const registrar = (atendimento_id, dados) => {
    return registrarPara({ atendimento_id }, dados);
};

const registrarAgendamento = (agendamento_id, dados) => {
    return registrarPara({ agendamento_id }, dados);
};

// Anular preserva o registo e recalcula o estado, para o historico nao se perder.
// Pagamentos de agendamentos sao devolvidos pelo cancelamento do saldo restante.
const anular = async (pagamento_id, { motivo, registado_por }) => {
    const pagamento = await Pagamento.findById(pagamento_id);

    if (!pagamento) {
        throw criarErro(404, 'Pagamento nao encontrado');
    }
    if (pagamento.estado === 'Anulado') {
        throw criarErro(409, 'Este pagamento ja esta anulado');
    }
    if (pagamento.agendamento_id) {
        throw criarErro(409, 'Pagamentos de agendamento sao devolvidos pelo cancelamento do agendamento');
    }

    await db.transaction(async (tx) => {
        await Pagamento.updateEstado(tx, pagamento_id, { estado: 'Anulado', motivo_anulacao: motivo });
        await Caixa.anularMovimentosPorReferencia(tx, 'Pagamento', pagamento_id);

        // O estado financeiro vive no pagamento; o atendimento continua
        // Concluido e o saldo em falta e recalculado pelas parcelas ativas.

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: 'pagamento',
            id_registo: pagamento_id,
            operacao: 'anular',
            antes: { estado: pagamento.estado },
            depois: { estado: 'Anulado' },
            motivo
        }, tx);
    });
};

const PagamentoService = {
    registrar,
    registrarAgendamento,
    anular
};

export default PagamentoService;
