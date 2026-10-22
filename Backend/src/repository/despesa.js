import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    categoriaDespesa,
    despesa,
    itemProduto,
    produto
} from '../db/schema/index.js';

const campos = {
    id: despesa.id,
    descricao: despesa.descricao,
    categoria_id: despesa.categoria_id,
    categoria_nome: categoriaDespesa.nome,
    valor_total: despesa.valor_total,
    data_compra: despesa.data_compra,
    metodo_pagamento: despesa.metodo_pagamento,
    caixa_sessao_id: despesa.caixa_sessao_id,
    comprovativo: despesa.comprovativo,
    registado_por: despesa.registado_por,
    estado: despesa.estado,
    criado_em: despesa.criado_em
};

//listagem com filtros opcionais (periodo, categoria, estado)
const findAll = async ({ de, ate, categoria, estado } = {}) => {
    const condicoes = [];

    if (de) condicoes.push(sql`${despesa.data_compra} >= ${de}`);
    if (ate) condicoes.push(sql`${despesa.data_compra} <= ${ate}`);
    if (categoria !== undefined && categoria !== null && categoria !== '') {
        condicoes.push(eq(despesa.categoria_id, categoria));
    }
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(despesa.estado, estado));
    }

    return db.select(campos)
        .from(despesa)
        .leftJoin(categoriaDespesa, eq(categoriaDespesa.id, despesa.categoria_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${despesa.data_compra} desc`, sql`${despesa.id} desc`);
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(despesa)
        .leftJoin(categoriaDespesa, eq(categoriaDespesa.id, despesa.categoria_id))
        .where(eq(despesa.id, id))
        .limit(1);

    return linha || null;
};

const findItens = async (despesa_id) => {
    return db.select({
        id: itemProduto.id,
        produto_id: itemProduto.produto_id,
        produto_nome: produto.nome,
        funcionario_id: itemProduto.funcionario_id,
        quantidade: itemProduto.quantidade,
        preco_unitario: itemProduto.preco_unitario,
        valor_total: itemProduto.valor_total
    })
        .from(itemProduto)
        .innerJoin(produto, eq(produto.id, itemProduto.produto_id))
        .where(eq(itemProduto.despesa_id, despesa_id))
        .orderBy(asc(itemProduto.id));
};

//---- operacoes usadas dentro de transacoes (recebem o tx) ----

const insert = async (tx, {
    descricao,
    categoria_id,
    valor_total,
    data_compra,
    metodo_pagamento,
    caixa_sessao_id,
    comprovativo,
    registado_por
}) => {
    const [linha] = await tx.insert(despesa)
        .values({
            descricao,
            categoria_id: categoria_id ?? null,
            valor_total,
            data_compra: data_compra ?? sql`current_date`,
            metodo_pagamento: metodo_pagamento ?? null,
            caixa_sessao_id: caixa_sessao_id ?? null,
            comprovativo: comprovativo ?? null,
            registado_por
        })
        .returning({ id: despesa.id });

    return linha.id;
};

const insertItem = async (tx, {
    despesa_id,
    produto_id,
    funcionario_id,
    quantidade,
    preco_unitario,
    valor_total
}) => {
    await tx.insert(itemProduto).values({
        despesa_id,
        produto_id,
        funcionario_id: funcionario_id ?? null,
        quantidade,
        preco_unitario,
        valor_total
    });
};

//---- atualizacoes simples (db) ----

const update = async (id, {
    descricao,
    categoria_id,
    valor_total,
    data_compra,
    metodo_pagamento,
    comprovativo
}) => {
    const valores = {};

    if (descricao !== undefined && descricao !== null) valores.descricao = descricao;
    if (categoria_id !== undefined && categoria_id !== null) valores.categoria_id = categoria_id;
    if (valor_total !== undefined && valor_total !== null) valores.valor_total = valor_total;
    if (data_compra !== undefined && data_compra !== null) valores.data_compra = data_compra;
    if (metodo_pagamento !== undefined && metodo_pagamento !== null) valores.metodo_pagamento = metodo_pagamento;
    if (comprovativo !== undefined && comprovativo !== null) valores.comprovativo = comprovativo;

    if (Object.keys(valores).length === 0) {
        const [linha] = await db.select({ id: despesa.id })
            .from(despesa)
            .where(eq(despesa.id, id))
            .limit(1);

        return linha || null;
    }

    const [linha] = await db.update(despesa)
        .set(valores)
        .where(eq(despesa.id, id))
        .returning({ id: despesa.id });

    return linha || null;
};

const deleteDespesa = async (id) => {
    const [linha] = await db.delete(despesa)
        .where(eq(despesa.id, id))
        .returning({ id: despesa.id });

    return linha || null;
};

const Despesa = {
    findAll,
    findById,
    findItens,
    insert,
    insertItem,
    update,
    delete: deleteDespesa
};

export default Despesa;
