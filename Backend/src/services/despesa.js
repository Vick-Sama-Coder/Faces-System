import pool from '../config/database.js';
import Despesa from '../repository/despesa.js';
import Caixa from '../repository/caixa.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';

//derivar o total dos itens evita divergencia entre o detalhe e o valor guardado
function totalDosItens(itens) {
    return itens.reduce((total, item) => total + Number(item.quantidade) * Number(item.preco_unitario), 0);
}

//registar despesa; se paga pelo caixa, gera o movimento de saida (RF13)
const criar = async (dados, registado_por) => {
    const { itens } = dados;
    const temItens = Array.isArray(itens) && itens.length > 0;
    const valor_total = temItens ? totalDosItens(itens) : Number(dados.valor_total);

    if (!(valor_total > 0)) {
        throw criarErro(400, "O valor da despesa tem de ser positivo");
    }

    const client = await pool.connect();

    try {
        await client.query('begin');

        const despesa_id = await Despesa.insert(client, {
            descricao: dados.descricao,
            categoria_id: dados.categoria_id,
            valor_total,
            data_compra: dados.data_compra,
            metodo_pagamento: dados.metodo_pagamento,
            caixa_sessao_id: dados.caixa_sessao_id,
            comprovativo: dados.comprovativo,
            registado_por
        });

        if (temItens) {
            for (const item of itens) {
                await Despesa.insertItem(client, {
                    despesa_id,
                    produto_id: item.produto_id,
                    funcionario_id: item.funcionario_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    valor_total: Number(item.quantidade) * Number(item.preco_unitario)
                });
            }
        }

        //despesa paga pelo caixa -> movimento de saida associado (idempotente)
        if (dados.caixa_sessao_id) {
            await Caixa.inserirMovimento(client, {
                id_sessao: dados.caixa_sessao_id,
                tipo_movimento: "Saida",
                valor: valor_total,
                descricao: dados.descricao,
                origem: "Despesa",
                referencia_id: despesa_id,
                registado_por
            });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "despesa",
            id_registo: despesa_id,
            operacao: "criar",
            depois: { descricao: dados.descricao, categoria_id: dados.categoria_id, valor_total, itens: temItens ? itens.length : 0 }
        }, client);

        await client.query('commit');
        return despesa_id;
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const DespesaService = {
    criar
};

export default DespesaService;
