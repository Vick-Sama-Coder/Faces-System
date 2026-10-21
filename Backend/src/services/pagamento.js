import pool from '../config/database.js';
import Pagamento from '../repository/pagamento.js';
import Atendimento from '../repository/atendimento.js';
import Comissao from '../repository/comissao.js';
import Caixa from '../repository/caixa.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';

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
    const client = await pool.connect();

    try {
        await client.query('begin');

        const jaPago = await Pagamento.somaParcelas(client, atendimento_id);
        const devido = atendimento.valor_total;

        //sem credito nesta fase: a soma das parcelas nao pode exceder o devido (RN07)
        if (jaPago + somaNovas > devido) {
            throw criarErro(400, `O total das parcelas excede o valor devido (${devido - jaPago} em falta)`);
        }

        const totalPago = jaPago + somaNovas;
        const estado = devido > 0 && totalPago >= devido ? "Liquidado" : "Parcial";

        const pagamento_id = await Pagamento.insert(client, {
            atendimento_id,
            valor_total: somaNovas,
            estado,
            registado_por
        });

        for (const parcela of parcelas) {
            await Pagamento.insertParcela(client, {
                pagamento_id,
                metodo_pagamento: parcela.metodo_pagamento,
                valor: parcela.valor,
                referencia: parcela.referencia
            });
        }

        //entrada no caixa, se houver sessao aberta (RF13/RF10); idempotente por referencia
        const sessao = await Caixa.findSessaoAberta(client);
        if (sessao) {
            await Caixa.inserirMovimento(client, {
                id_sessao: sessao.id,
                tipo_movimento: "Entrada",
                valor: somaNovas,
                descricao: `Pagamento #${pagamento_id}`,
                origem: "Pagamento",
                referencia_id: pagamento_id,
                registado_por
            });
        }

        //liquidacao total -> atendimento fica "Pago" e gera as comissoes (RN08/RN10)
        if (estado === "Liquidado") {
            await client.query("update atendimento set estado = 'Pago' where id = $1", [atendimento_id]);
            await Comissao.gerarParaAtendimento(client, atendimento_id);
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "pagamento",
            id_registo: pagamento_id,
            operacao: "criar",
            depois: { atendimento_id, valor_total: somaNovas, estado, parcelas: parcelas.length }
        }, client);

        await client.query('commit');
        return pagamento_id;
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
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

    const client = await pool.connect();

    try {
        await client.query('begin');

        await Pagamento.updateEstado(client, pagamento_id, { estado: "Anulado", motivo_anulacao: motivo });

        const atendimento = await Atendimento.findById(pagamento.atendimento_id);
        const pago = await Pagamento.somaParcelas(client, pagamento.atendimento_id);

        const estadoAtendimento = atendimento.valor_total > 0 && pago >= atendimento.valor_total
            ? "Pago"
            : (pago > 0 ? "Concluido" : "Em andamento");

        await client.query(
            "update atendimento set estado = $2 where id = $1",
            [pagamento.atendimento_id, estadoAtendimento]
        );

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "pagamento",
            id_registo: pagamento_id,
            operacao: "anular",
            antes: { estado: pagamento.estado },
            depois: { estado: "Anulado" },
            motivo
        }, client);

        await client.query('commit');
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const PagamentoService = {
    registrar,
    anular
};

export default PagamentoService;
