import { and, asc, desc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { caixa, caixaSessao, movimentoCaixa } from '../db/schema/index.js';

const camposSessao = {
    id: caixaSessao.id,
    caixa_id: caixaSessao.caixa_id,
    data_abertura: caixaSessao.data_abertura,
    saldo_inicial: caixaSessao.saldo_inicial,
    aberto_por: caixaSessao.aberto_por,
    data_fecho: caixaSessao.data_fecho,
    valor_esperado: caixaSessao.valor_esperado,
    valor_contado: caixaSessao.valor_contado,
    diferenca: caixaSessao.diferenca,
    observacoes: caixaSessao.observacoes,
    fechado_por: caixaSessao.fechado_por,
    estado: caixaSessao.estado
};

const camposMovimento = {
    id: movimentoCaixa.id,
    id_sessao: movimentoCaixa.id_sessao,
    tipo_movimento: movimentoCaixa.tipo_movimento,
    valor: movimentoCaixa.valor,
    descricao: movimentoCaixa.descricao,
    data_hora: movimentoCaixa.data_hora,
    origem: movimentoCaixa.origem,
    referencia_id: movimentoCaixa.referencia_id,
    registado_por: movimentoCaixa.registado_por,
    estado: movimentoCaixa.estado
};

//caixa ativo (o sistema opera com um caixa unico, RN09)
const caixaPrincipal = async (executor = db) => {
    const [linha] = await executor.select({
        id: caixa.id,
        designacao: caixa.designacao
    })
        .from(caixa)
        .where(eq(caixa.estado, 'Ativo'))
        .orderBy(asc(caixa.id))
        .limit(1);

    return linha || null;
};

//sessao aberta (no maximo uma, garantido pelo indice unico parcial)
const findSessaoAberta = async (executor = db) => {
    const [linha] = await executor.select(camposSessao)
        .from(caixaSessao)
        .where(eq(caixaSessao.estado, 'Aberta'))
        .orderBy(desc(caixaSessao.data_abertura))
        .limit(1);

    return linha || null;
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(camposSessao)
        .from(caixaSessao)
        .where(eq(caixaSessao.id, id))
        .limit(1);

    return linha || null;
};

const abrir = async ({ caixa_id, saldo_inicial, aberto_por }, executor = db) => {
    const [linha] = await executor.insert(caixaSessao)
        .values({
            caixa_id,
            saldo_inicial,
            aberto_por
        })
        .returning(camposSessao);

    return linha;
};

//saldo esperado = saldo inicial + entradas - saidas/levantamentos (so movimentos ativos)
const saldoEsperado = async (executor, sessao_id) => {
    const resultado = await executor.execute(sql`
        select s.saldo_inicial + coalesce((
                    select sum(case when m.tipo_movimento = 'Entrada' then m.valor else -m.valor end)
                      from movimento_caixa m
                     where m.id_sessao = s.id and m.estado = 'Ativo'
                ), 0)::int as esperado
           from caixa_sessao s
          where s.id = ${sessao_id}
    `);

    return resultado.rows[0] ? resultado.rows[0].esperado : null;
};

const movimentos = async (sessao_id, executor = db) => {
    return executor.select(camposMovimento)
        .from(movimentoCaixa)
        .where(eq(movimentoCaixa.id_sessao, sessao_id))
        .orderBy(asc(movimentoCaixa.data_hora), asc(movimentoCaixa.id));
};

//idempotente por (origem, referencia_id): repeticoes nao duplicam o movimento (RNF05)
const inserirMovimento = async (executor, {
    id_sessao,
    tipo_movimento,
    valor,
    descricao,
    origem,
    referencia_id,
    registado_por
}) => {
    const [linha] = await executor.insert(movimentoCaixa)
        .values({
            id_sessao,
            tipo_movimento,
            valor,
            descricao: descricao ?? null,
            origem,
            referencia_id: referencia_id ?? null,
            registado_por
        })
        .onConflictDoNothing()
        .returning({ id: movimentoCaixa.id });

    return linha?.id || null;
};

const fechar = async (executor, sessao_id, {
    valor_esperado,
    valor_contado,
    diferenca,
    observacoes,
    fechado_por
}) => {
    await executor.update(caixaSessao)
        .set({
            estado: 'Fechada',
            data_fecho: sql`now()`,
            valor_esperado,
            valor_contado,
            diferenca,
            observacoes: observacoes ?? null,
            fechado_por
        })
        .where(eq(caixaSessao.id, sessao_id));
};

//historico de fechos (sessoes fechadas), com filtro opcional por periodo
const findFechos = async ({ de, ate } = {}) => {
    const condicoes = [eq(caixaSessao.estado, 'Fechada')];

    if (de) condicoes.push(sql`${caixaSessao.data_fecho}::date >= ${de}`);
    if (ate) condicoes.push(sql`${caixaSessao.data_fecho}::date <= ${ate}`);

    return db.select(camposSessao)
        .from(caixaSessao)
        .where(and(...condicoes))
        .orderBy(desc(caixaSessao.data_fecho));
};

const Caixa = {
    caixaPrincipal,
    findSessaoAberta,
    findById,
    abrir,
    saldoEsperado,
    movimentos,
    inserirMovimento,
    fechar,
    findFechos
};

export default Caixa;
