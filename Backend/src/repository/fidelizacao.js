import { and, eq, inArray, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { cartaoFidelizacao, movimentoFidelizacao } from '../db/schema/index.js';

const findCartao = async (executor, cliente_id) => {
    const [linha] = await executor.select({
        id: cartaoFidelizacao.id,
        cliente_id: cartaoFidelizacao.cliente_id,
        data_ativacao: cartaoFidelizacao.data_ativacao,
        estado: cartaoFidelizacao.estado
    })
        .from(cartaoFidelizacao)
        .where(eq(cartaoFidelizacao.cliente_id, cliente_id))
        .limit(1);

    return linha || null;
};

const criarCartao = async (executor, cliente_id) => {
    const [linha] = await executor.insert(cartaoFidelizacao)
        .values({ cliente_id })
        .onConflictDoUpdate({
            target: cartaoFidelizacao.cliente_id,
            set: { cliente_id: sql`excluded.cliente_id` }
        })
        .returning({
            id: cartaoFidelizacao.id,
            cliente_id: cartaoFidelizacao.cliente_id,
            data_ativacao: cartaoFidelizacao.data_ativacao,
            estado: cartaoFidelizacao.estado
        });

    return linha;
};

const getOrCreateCartao = async (executor, cliente_id) => {
    return (await findCartao(executor, cliente_id)) || criarCartao(executor, cliente_id);
};

//idempotente por (atendimento_servico_id, tipo_movimento)
const insertMovimento = async (executor, {
    cartao_id,
    atendimento_servico_id,
    tipo_movimento,
    origem = 'atendimento',
    ciclo,
    registado_por,
    observacao
}) => {
    await executor.insert(movimentoFidelizacao)
        .values({
            cartao_id,
            atendimento_servico_id: atendimento_servico_id ?? null,
            tipo_movimento,
            origem,
            ciclo: ciclo ?? 1,
            registado_por: registado_por ?? null,
            observacao: observacao ?? null
        })
        .onConflictDoNothing();
};

const countPorTipo = async (executor, cartao_id, tipo_movimento) => {
    const [linha] = await executor.select({
        total: sql`count(*)::int`
    })
        .from(movimentoFidelizacao)
        .where(and(
            eq(movimentoFidelizacao.cartao_id, cartao_id),
            eq(movimentoFidelizacao.tipo_movimento, tipo_movimento)
        ));

    return linha.total;
};

//marcas visiveis de um ciclo:
//- atendimentos contam uma vez por dia (RN17);
//- marcas manuais contam individualmente (preenchimento de cartoes fisicos).
const marcasNoCiclo = async (executor, cartao_id, ciclo) => {
    const [linha] = await executor.select({
        total: sql`(
            count(distinct case
                when ${movimentoFidelizacao.origem} = 'atendimento'
                then ${movimentoFidelizacao.data_hora}::date
            end)
            + count(*) filter (where ${movimentoFidelizacao.origem} = 'manual')
        )::int`
    })
        .from(movimentoFidelizacao)
        .where(and(
            eq(movimentoFidelizacao.cartao_id, cartao_id),
            eq(movimentoFidelizacao.tipo_movimento, 'marca'),
            eq(movimentoFidelizacao.ciclo, ciclo)
        ));

    return linha.total;
};

//ja existe marca de atendimento hoje para este cartao? (RN17)
//Marcas manuais nao bloqueiam o atendimento do dia.
const existeMarcaHoje = async (executor, cartao_id) => {
    const linhas = await executor.select({ id: movimentoFidelizacao.id })
        .from(movimentoFidelizacao)
        .where(and(
            eq(movimentoFidelizacao.cartao_id, cartao_id),
            eq(movimentoFidelizacao.tipo_movimento, 'marca'),
            eq(movimentoFidelizacao.origem, 'atendimento'),
            sql`${movimentoFidelizacao.data_hora}::date = current_date`
        ))
        .limit(1);

    return linhas.length > 0;
};

const findMovimentos = async (executor, cartao_id) => {
    return executor.select({
        id: movimentoFidelizacao.id,
        atendimento_servico_id: movimentoFidelizacao.atendimento_servico_id,
        tipo_movimento: movimentoFidelizacao.tipo_movimento,
        origem: movimentoFidelizacao.origem,
        data_hora: movimentoFidelizacao.data_hora,
        ciclo: movimentoFidelizacao.ciclo,
        registado_por: movimentoFidelizacao.registado_por,
        observacao: movimentoFidelizacao.observacao
    })
        .from(movimentoFidelizacao)
        .where(eq(movimentoFidelizacao.cartao_id, cartao_id))
        .orderBy(movimentoFidelizacao.data_hora, movimentoFidelizacao.id);
};

//remocao em lote usada no recalculo das marcas manuais
const deleteMovimentos = async (executor, ids) => {
    if (!ids.length) return;

    await executor.delete(movimentoFidelizacao)
        .where(inArray(movimentoFidelizacao.id, ids));
};

const Fidelizacao = {
    findCartao,
    criarCartao,
    getOrCreateCartao,
    insertMovimento,
    countPorTipo,
    marcasNoCiclo,
    existeMarcaHoje,
    findMovimentos,
    deleteMovimentos
};

export default Fidelizacao;
