import db from '../db/client.js';
import Despesa from '../repository/despesa.js';
import Caixa from '../repository/caixa.js';
import AuditoriaService from './auditoria.js';
import { METODOS_PAGAMENTO } from './caixa.js';
import MovimentoEstoqueService from './movimento_estoque.js';
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
    if (!METODOS_PAGAMENTO.includes(dados.metodo_pagamento)) {
        throw criarErro(400, "Metodo de pagamento invalido");
    }

    return db.transaction(async (tx) => {
        const sessao = await Caixa.findSessaoAberta(tx);
        if (!sessao) {
            throw criarErro(409, "Abra uma sessao de Caixa antes de registar despesas");
        }

        const despesa_id = await Despesa.insert(tx, {
            descricao: dados.descricao,
            categoria_id: dados.categoria_id,
            valor_total,
            data_compra: dados.data_compra,
            metodo_pagamento: dados.metodo_pagamento,
            caixa_sessao_id: sessao.id,
            comprovativo: dados.comprovativo,
            registado_por
        });

        if (temItens) {
            for (const item of itens) {
                await Despesa.insertItem(tx, {
                    despesa_id,
                    produto_id: item.produto_id,
                    funcionario_id: item.funcionario_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    valor_total: Number(item.quantidade) * Number(item.preco_unitario)
                });

                // Registar automaticamente entrada de stock para cada produto da despesa
                await MovimentoEstoqueService.registrarEntrada({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    motivo: `Compra de stock para ${dados.descricao}`,
                    registado_por,
                    despesa_id
                });
            }
        }

        await Caixa.inserirMovimento(tx, {
            id_sessao: sessao.id,
            tipo_movimento: "Saida",
            metodo_pagamento: dados.metodo_pagamento,
            valor: valor_total,
            descricao: dados.descricao,
            origem: "Despesa",
            referencia_id: despesa_id,
            registado_por
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "despesa",
            id_registo: despesa_id,
            operacao: "criar",
            depois: { descricao: dados.descricao, categoria_id: dados.categoria_id, valor_total, itens: temItens ? itens.length : 0 }
        }, tx);

        return despesa_id;
    });
};

const verificarSessaoEditavel = async (despesa, executor = db) => {
    if (!despesa.caixa_sessao_id) return;

    const sessao = await Caixa.findById(despesa.caixa_sessao_id, executor);
    if (sessao?.estado === "Fechada") {
        throw criarErro(409, "Despesas de uma sessao fechada nao podem ser alteradas");
    }
};

const atualizar = async (id, dados, registado_por) => {
    const antes = await Despesa.findById(id);
    if (!antes) return null;

    const metodo_pagamento = dados.metodo_pagamento ?? antes.metodo_pagamento ?? "Dinheiro";
    if (!METODOS_PAGAMENTO.includes(metodo_pagamento)) {
        throw criarErro(400, "Metodo de pagamento invalido");
    }

    await db.transaction(async (tx) => {
        await verificarSessaoEditavel(antes, tx);
        await Despesa.update(id, { ...dados, metodo_pagamento }, tx);

        if (antes.caixa_sessao_id) {
            await Caixa.atualizarMovimentosPorReferencia(tx, "Despesa", id, {
                metodo_pagamento,
                valor: dados.valor_total ?? antes.valor_total,
                descricao: dados.descricao ?? antes.descricao
            });
        }

        const depois = await Despesa.findById(id, tx);
        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "despesa",
            id_registo: antes.id,
            operacao: "atualizar",
            antes,
            depois
        }, tx);
    });

    return Despesa.findById(id);
};

const remover = async (id, registado_por) => {
    const antes = await Despesa.findById(id);
    if (!antes) return null;

    await db.transaction(async (tx) => {
        await verificarSessaoEditavel(antes, tx);
        await Caixa.anularMovimentosPorReferencia(tx, "Despesa", id);
        await Despesa.delete(id, tx);
        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "despesa",
            id_registo: antes.id,
            operacao: "remover",
            antes
        }, tx);
    });

    return antes;
};

const DespesaService = {
    criar,
    atualizar,
    remover
};

export default DespesaService;
