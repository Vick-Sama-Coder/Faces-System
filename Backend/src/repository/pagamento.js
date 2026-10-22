import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { pagamento, pagamentoParcela } from '../db/schema/index.js';

const campos = {
    id: pagamento.id,
    atendimento_id: pagamento.atendimento_id,
    valor_total: pagamento.valor_total,
    estado: pagamento.estado,
    data_hora: pagamento.data_hora,
    registado_por: pagamento.registado_por,
    motivo_anulacao: pagamento.motivo_anulacao
};

//listagem com filtros opcionais (periodo, estado, metodo de pagamento)
const findAll = async ({ de, ate, estado, metodo } = {}) => {
    const condicoes = [];

    if (de) condicoes.push(sql`${pagamento.data_hora}::date >= ${de}`);
    if (ate) condicoes.push(sql`${pagamento.data_hora}::date <= ${ate}`);
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(pagamento.estado, estado));
    }
    if (metodo !== undefined && metodo !== null && metodo !== '') {
        condicoes.push(inArray(
            pagamento.id,
            db.select({ id: pagamentoParcela.pagamento_id })
                .from(pagamentoParcela)
                .where(eq(pagamentoParcela.metodo_pagamento, metodo))
        ));
    }

    return db.select(campos)
        .from(pagamento)
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${pagamento.data_hora} desc`);
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(pagamento)
        .where(eq(pagamento.id, id))
        .limit(1);

    return linha || null;
};

const findParcelas = async (pagamento_id) => {
    return db.select({
        id: pagamentoParcela.id,
        metodo_pagamento: pagamentoParcela.metodo_pagamento,
        valor: pagamentoParcela.valor,
        referencia: pagamentoParcela.referencia,
        criado_em: pagamentoParcela.criado_em
    })
        .from(pagamentoParcela)
        .where(eq(pagamentoParcela.pagamento_id, pagamento_id))
        .orderBy(asc(pagamentoParcela.id));
};

const findByAtendimento = async (atendimento_id) => {
    return db.select(campos)
        .from(pagamento)
        .where(eq(pagamento.atendimento_id, atendimento_id))
        .orderBy(sql`${pagamento.data_hora} desc`);
};

//soma das parcelas ja registadas (ignora pagamentos anulados)
const somaParcelas = async (executor, atendimento_id) => {
    const [linha] = await executor.select({
        total: sql`coalesce(sum(${pagamentoParcela.valor}), 0)::int`
    })
        .from(pagamentoParcela)
        .innerJoin(pagamento, eq(pagamento.id, pagamentoParcela.pagamento_id))
        .where(and(
            eq(pagamento.atendimento_id, atendimento_id),
            ne(pagamento.estado, 'Anulado')
        ));

    return linha.total;
};

//---- operacoes usadas dentro de transacoes (recebem o tx) ----

const insert = async (tx, { atendimento_id, valor_total, estado, registado_por }) => {
    const [linha] = await tx.insert(pagamento)
        .values({
            atendimento_id,
            valor_total,
            estado,
            registado_por
        })
        .returning({ id: pagamento.id });

    return linha.id;
};

const insertParcela = async (tx, { pagamento_id, metodo_pagamento, valor, referencia }) => {
    await tx.insert(pagamentoParcela).values({
        pagamento_id,
        metodo_pagamento,
        valor,
        referencia: referencia ?? null
    });
};

const updateEstado = async (executor, id, { estado, motivo_anulacao }) => {
    const valores = { estado };

    if (motivo_anulacao !== undefined && motivo_anulacao !== null) {
        valores.motivo_anulacao = motivo_anulacao;
    }

    const [linha] = await executor.update(pagamento)
        .set(valores)
        .where(eq(pagamento.id, id))
        .returning({
            id: pagamento.id,
            estado: pagamento.estado
        });

    return linha || null;
};

const Pagamento = {
    findAll,
    findById,
    findParcelas,
    findByAtendimento,
    somaParcelas,
    insert,
    insertParcela,
    updateEstado
};

export default Pagamento;
