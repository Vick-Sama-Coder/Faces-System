import pool from '../config/database.js';

const campos = `a.id, a.cliente_id, c.nome as cliente_nome, a.data_hora, a.estado,
    a.valor_bruto, a.valor_desconto, a.valor_total, a.registado_por, a.motivo_anulacao`;

//listagem com filtros opcionais (periodo, cliente, funcionario, estado)
const findAll = async ({ de, ate, cliente, funcionario, estado } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from atendimento a
           join cliente c on c.id = a.cliente_id
          where ($1::date is null or a.data_hora::date >= $1)
            and ($2::date is null or a.data_hora::date <= $2)
            and ($3::int is null or a.cliente_id = $3)
            and ($4::int is null or exists (
                    select 1 from atendimento_servico s
                     where s.atendimento_id = a.id and s.funcionario_id = $4))
            and ($5::text is null or a.estado = $5)
          order by a.data_hora desc`,
        [de || null, ate || null, cliente || null, funcionario || null, estado || null]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos}
           from atendimento a
           join cliente c on c.id = a.cliente_id
          where a.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const findServicos = async (atendimento_id) => {
    const result = await pool.query(
        `select s.id, s.servico_id, sv.nome as servico_nome,
                s.funcionario_id, f.nome as funcionario_nome,
                s.preco_original, s.tipo_preco, s.valor_desconto, s.valor_final, s.estado
           from atendimento_servico s
           join servico sv on sv.id = s.servico_id
           join funcionario f on f.id = s.funcionario_id
          where s.atendimento_id = $1
          order by s.id`,
        [atendimento_id]
    );

    return result.rows;
};

//---- operacoes usadas dentro de transacoes (recebem o client) ----

const insertHeader = async (client, { cliente_id, valor_bruto, valor_desconto, valor_total, registado_por }) => {
    const result = await client.query(
        `insert into atendimento (cliente_id, valor_bruto, valor_desconto, valor_total, registado_por)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [cliente_id, valor_bruto, valor_desconto, valor_total, registado_por]
    );

    return result.rows[0].id;
};

const insertServico = async (client, { atendimento_id, servico_id, funcionario_id, preco_original, tipo_preco, valor_desconto, valor_final, registado_por }) => {
    const result = await client.query(
        `insert into atendimento_servico
            (atendimento_id, servico_id, funcionario_id, preco_original, tipo_preco, valor_desconto, valor_final, registado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [atendimento_id, servico_id, funcionario_id, preco_original, tipo_preco, valor_desconto, valor_final, registado_por]
    );

    return result.rows[0].id;
};

//recalcula os totais do cabecalho a partir das linhas ativas
const recalcular = async (client, atendimento_id) => {
    await client.query(
        `update atendimento
            set valor_bruto = coalesce(t.bruto, 0),
                valor_desconto = coalesce(t.desconto, 0),
                valor_total = coalesce(t.total, 0)
           from (select $1::int as id) x
           left join (
                select atendimento_id,
                       sum(preco_original)::int as bruto,
                       sum(valor_desconto)::int as desconto,
                       sum(valor_final)::int as total
                  from atendimento_servico
                 where atendimento_id = $1 and estado = 'Ativo'
                 group by atendimento_id
           ) t on t.atendimento_id = x.id
          where atendimento.id = x.id`,
        [atendimento_id]
    );
};

const findServicoItem = async (client, item_id) => {
    const result = await client.query(
        `select id, atendimento_id from atendimento_servico where id = $1`,
        [item_id]
    );

    return result.rows[0] || null;
};

const deleteServicoItem = async (client, item_id) => {
    await client.query("delete from atendimento_servico where id = $1", [item_id]);
};

//---- atualizacoes simples (pool) ----

const updateHeader = async (id, { cliente_id }) => {
    const result = await pool.query(
        `update atendimento set cliente_id = coalesce($2, cliente_id)
          where id = $1
          returning id`,
        [id, cliente_id]
    );

    return result.rows[0] || null;
};

const updateEstado = async (id, { estado, motivo_anulacao }) => {
    const result = await pool.query(
        `update atendimento
            set estado = $2,
                motivo_anulacao = coalesce($3, motivo_anulacao)
          where id = $1
          returning id, estado`,
        [id, estado, motivo_anulacao]
    );

    return result.rows[0] || null;
};

const Atendimento = {
    findAll,
    findById,
    findServicos,
    insertHeader,
    insertServico,
    recalcular,
    findServicoItem,
    deleteServicoItem,
    updateHeader,
    updateEstado
};

export default Atendimento;
