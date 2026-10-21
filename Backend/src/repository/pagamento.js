import pool from '../config/database.js';

const campos = `p.id, p.atendimento_id, p.valor_total, p.estado, p.data_hora,
    p.registado_por, p.motivo_anulacao`;

//listagem com filtros opcionais (periodo, estado, metodo de pagamento)
const findAll = async ({ de, ate, estado, metodo } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from pagamento p
          where ($1::date is null or p.data_hora::date >= $1)
            and ($2::date is null or p.data_hora::date <= $2)
            and ($3::text is null or p.estado = $3)
            and ($4::text is null or exists (
                    select 1 from pagamento_parcela pp
                     where pp.pagamento_id = p.id and pp.metodo_pagamento = $4))
          order by p.data_hora desc`,
        [de || null, ate || null, estado || null, metodo || null]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos} from pagamento p where p.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const findParcelas = async (pagamento_id) => {
    const result = await pool.query(
        `select id, metodo_pagamento, valor, referencia, criado_em
           from pagamento_parcela
          where pagamento_id = $1
          order by id`,
        [pagamento_id]
    );

    return result.rows;
};

const findByAtendimento = async (atendimento_id) => {
    const result = await pool.query(
        `select ${campos} from pagamento p where p.atendimento_id = $1 order by p.data_hora desc`,
        [atendimento_id]
    );

    return result.rows;
};

//soma das parcelas ja registadas (ignora pagamentos anulados)
const somaParcelas = async (db, atendimento_id) => {
    const result = await db.query(
        `select coalesce(sum(pp.valor), 0)::int as total
           from pagamento_parcela pp
           join pagamento p on p.id = pp.pagamento_id
          where p.atendimento_id = $1 and p.estado <> 'Anulado'`,
        [atendimento_id]
    );

    return result.rows[0].total;
};

//---- operacoes usadas dentro de transacoes (recebem o client) ----

const insert = async (client, { atendimento_id, valor_total, estado, registado_por }) => {
    const result = await client.query(
        `insert into pagamento (atendimento_id, valor_total, estado, registado_por)
         values ($1, $2, $3, $4)
         returning id`,
        [atendimento_id, valor_total, estado, registado_por]
    );

    return result.rows[0].id;
};

const insertParcela = async (client, { pagamento_id, metodo_pagamento, valor, referencia }) => {
    await client.query(
        `insert into pagamento_parcela (pagamento_id, metodo_pagamento, valor, referencia)
         values ($1, $2, $3, $4)`,
        [pagamento_id, metodo_pagamento, valor, referencia]
    );
};

const updateEstado = async (db, id, { estado, motivo_anulacao }) => {
    const result = await db.query(
        `update pagamento
            set estado = $2,
                motivo_anulacao = coalesce($3, motivo_anulacao)
          where id = $1
          returning id, estado`,
        [id, estado, motivo_anulacao]
    );

    return result.rows[0] || null;
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
