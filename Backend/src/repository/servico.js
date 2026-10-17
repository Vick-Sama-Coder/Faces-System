import pool from '../config/database.js';

//campos devolvidos pela API (com o nome da categoria ja resolvido por join)
const campos = `s.id, s.nome, s.descricao, s.valor, s.duracao_min, s.tipo_preco,
    s.categoria_id, c.nome as categoria_nome, s.estado, s.data_criacao`;

//listagem: por omissao apenas servicos ativos; estado = 'todos' mostra tudo (administracao)
const findAll = async ({ estado } = {}) => {
    const todos = estado === 'todos';

    const result = await pool.query(
        `select ${campos}
           from servico s
           join categoria_salao c on c.id = s.categoria_id
          where $1::boolean or s.estado = 'Ativo'
          order by s.nome`,
        [todos]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos}
           from servico s
           join categoria_salao c on c.id = s.categoria_id
          where s.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const create = async ({ nome, descricao, valor, duracao_min, tipo_preco, categoria_id }) => {
    const result = await pool.query(
        `insert into servico (nome, descricao, valor, duracao_min, tipo_preco, categoria_id)
         values ($1, $2, $3, $4, coalesce($5, 'fixo'), $6)
         returning id, nome, descricao, valor, duracao_min, tipo_preco, categoria_id, estado`,
        [nome, descricao, valor, duracao_min, tipo_preco, categoria_id]
    );

    return result.rows[0];
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, { nome, descricao, valor, duracao_min, tipo_preco, categoria_id }) => {
    const result = await pool.query(
        `update servico
            set nome = coalesce($2, nome),
                descricao = coalesce($3, descricao),
                valor = coalesce($4, valor),
                duracao_min = coalesce($5, duracao_min),
                tipo_preco = coalesce($6, tipo_preco),
                categoria_id = coalesce($7, categoria_id)
          where id = $1
          returning id, nome, descricao, valor, duracao_min, tipo_preco, categoria_id, estado`,
        [id, nome, descricao, valor, duracao_min, tipo_preco, categoria_id]
    );

    return result.rows[0] || null;
};

const updateEstado = async (id, estado) => {
    const result = await pool.query(
        `update servico
            set estado = $2
          where id = $1
          returning id, nome, valor, estado`,
        [id, estado]
    );

    return result.rows[0] || null;
};

//remocao: devolve o id apagado ou null se nao existir
//(o postgres bloqueia se houver atendimentos com este servico)
const deleteServico = async (id) => {
    const result = await pool.query(
        "delete from servico where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

//historico de precos
const registrarHistoricoPreco = async ({ servico_id, valor_anterior, valor_novo, alterado_por }) => {
    await pool.query(
        `insert into historico_preco_servico (servico_id, valor_anterior, valor_novo, alterado_por)
         values ($1, $2, $3, $4)`,
        [servico_id, valor_anterior, valor_novo, alterado_por]
    );
};

const findHistoricoPrecos = async (servico_id) => {
    const result = await pool.query(
        `select h.id, h.valor_anterior, h.valor_novo, h.alterado_por,
                u.nome as alterado_por_nome, h.criado_em
           from historico_preco_servico h
           left join usuario u on u.id = h.alterado_por
          where h.servico_id = $1
          order by h.criado_em desc`,
        [servico_id]
    );

    return result.rows;
};

const Servico = {
    findAll,
    findById,
    create,
    update,
    updateEstado,
    delete: deleteServico,
    registrarHistoricoPreco,
    findHistoricoPrecos
};

export default Servico;
