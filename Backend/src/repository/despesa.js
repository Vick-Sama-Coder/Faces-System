import pool from '../config/database.js';

const campos = `d.id, d.descricao, d.categoria_id, cd.nome as categoria_nome,
    d.valor_total, d.data_compra, d.metodo_pagamento, d.caixa_sessao_id,
    d.comprovativo, d.registado_por, d.estado, d.criado_em`;

//listagem com filtros opcionais (periodo, categoria, estado)
const findAll = async ({ de, ate, categoria, estado } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from despesa d
           left join categoria_despesa cd on cd.id = d.categoria_id
          where ($1::date is null or d.data_compra >= $1)
            and ($2::date is null or d.data_compra <= $2)
            and ($3::int is null or d.categoria_id = $3)
            and ($4::text is null or d.estado = $4)
          order by d.data_compra desc, d.id desc`,
        [de || null, ate || null, categoria || null, estado || null]
    );

    return result.rows;
};

const findById = async (id, db = pool) => {
    const result = await db.query(
        `select ${campos}
           from despesa d
           left join categoria_despesa cd on cd.id = d.categoria_id
          where d.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const findItens = async (despesa_id) => {
    const result = await pool.query(
        `select i.id, i.produto_id, p.nome as produto_nome, i.funcionario_id,
                i.quantidade, i.preco_unitario, i.valor_total
           from item_produto i
           join produto p on p.id = i.produto_id
          where i.despesa_id = $1
          order by i.id`,
        [despesa_id]
    );

    return result.rows;
};

//---- operacoes usadas dentro de transacoes (recebem o client) ----

const insert = async (client, { descricao, categoria_id, valor_total, data_compra, metodo_pagamento, caixa_sessao_id, comprovativo, registado_por }) => {
    const result = await client.query(
        `insert into despesa
            (descricao, categoria_id, valor_total, data_compra, metodo_pagamento, caixa_sessao_id, comprovativo, registado_por)
         values ($1, $2, $3, coalesce($4, current_date), $5, $6, $7, $8)
         returning id`,
        [descricao, categoria_id ?? null, valor_total, data_compra ?? null, metodo_pagamento ?? null, caixa_sessao_id ?? null, comprovativo ?? null, registado_por]
    );

    return result.rows[0].id;
};

const insertItem = async (client, { despesa_id, produto_id, funcionario_id, quantidade, preco_unitario, valor_total }) => {
    await client.query(
        `insert into item_produto
            (despesa_id, produto_id, funcionario_id, quantidade, preco_unitario, valor_total)
         values ($1, $2, $3, $4, $5, $6)`,
        [despesa_id, produto_id, funcionario_id ?? null, quantidade, preco_unitario, valor_total]
    );
};

//---- atualizacoes simples (pool) ----

const update = async (id, { descricao, categoria_id, valor_total, data_compra, metodo_pagamento, comprovativo }) => {
    const result = await pool.query(
        `update despesa
            set descricao = coalesce($2, descricao),
                categoria_id = coalesce($3, categoria_id),
                valor_total = coalesce($4, valor_total),
                data_compra = coalesce($5, data_compra),
                metodo_pagamento = coalesce($6, metodo_pagamento),
                comprovativo = coalesce($7, comprovativo)
          where id = $1
          returning id`,
        [id, descricao, categoria_id, valor_total, data_compra, metodo_pagamento, comprovativo]
    );

    return result.rows[0] || null;
};

const deleteDespesa = async (id) => {
    const result = await pool.query("delete from despesa where id = $1 returning id", [id]);
    return result.rows[0] || null;
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
