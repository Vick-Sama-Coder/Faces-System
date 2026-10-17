import pool from '../config/database.js';

const findCartao = async (db, cliente_id) => {
    const result = await db.query(
        `select c.id, c.cliente_id, c.data_ativacao, c.estado
           from cartao_fidelizacao c
          where c.cliente_id = $1`,
        [cliente_id]
    );

    return result.rows[0] || null;
};

const criarCartao = async (db, cliente_id) => {
    const result = await db.query(
        `insert into cartao_fidelizacao (cliente_id)
         values ($1)
         on conflict (cliente_id) do update set cliente_id = excluded.cliente_id
         returning id, cliente_id, data_ativacao, estado`,
        [cliente_id]
    );

    return result.rows[0];
};

const getOrCreateCartao = async (db, cliente_id) => {
    return (await findCartao(db, cliente_id)) || criarCartao(db, cliente_id);
};

//idempotente por (atendimento_servico_id, tipo_movimento)
const insertMovimento = async (db, { cartao_id, atendimento_servico_id, tipo_movimento, ciclo, registado_por, observacao }) => {
    await db.query(
        `insert into movimento_fidelizacao
            (cartao_id, atendimento_servico_id, tipo_movimento, ciclo, registado_por, observacao)
         values ($1, $2, $3, $4, $5, $6)
         on conflict do nothing`,
        [cartao_id, atendimento_servico_id ?? null, tipo_movimento, ciclo ?? 1, registado_por ?? null, observacao ?? null]
    );
};

const countPorTipo = async (db, cartao_id, tipo_movimento) => {
    const result = await db.query(
        `select count(*)::int as total
           from movimento_fidelizacao
          where cartao_id = $1 and tipo_movimento = $2`,
        [cartao_id, tipo_movimento]
    );

    return result.rows[0].total;
};

//marcas visiveis de um ciclo: um corte por dia conta uma vez (RN17)
const marcasNoCiclo = async (db, cartao_id, ciclo) => {
    const result = await db.query(
        `select count(distinct data_hora::date)::int as total
           from movimento_fidelizacao
          where cartao_id = $1 and tipo_movimento = 'marca' and ciclo = $2`,
        [cartao_id, ciclo]
    );

    return result.rows[0].total;
};

//ja existe marca hoje para este cartao? (RN17)
const existeMarcaHoje = async (db, cartao_id) => {
    const result = await db.query(
        `select 1 from movimento_fidelizacao
          where cartao_id = $1 and tipo_movimento = 'marca' and data_hora::date = current_date
          limit 1`,
        [cartao_id]
    );

    return result.rowCount > 0;
};

const findMovimentos = async (db, cartao_id) => {
    const result = await db.query(
        `select m.id, m.atendimento_servico_id, m.tipo_movimento, m.data_hora, m.ciclo,
                m.registado_por, m.observacao
           from movimento_fidelizacao m
          where m.cartao_id = $1
          order by m.data_hora, m.id`,
        [cartao_id]
    );

    return result.rows;
};

const Fidelizacao = {
    findCartao,
    criarCartao,
    getOrCreateCartao,
    insertMovimento,
    countPorTipo,
    marcasNoCiclo,
    existeMarcaHoje,
    findMovimentos
};

export default Fidelizacao;
