import pool from '../config/database.js';

//resolver a categoria na propria consulta evita uma segunda chamada por cada servico
const campos = `s.id, s.nome, s.descricao, s.valor, s.duracao_min, s.tipo_preco,
    s.elegivel_fidelizacao, s.categoria_id, c.nome as categoria_nome, s.estado, s.data_criacao`;

//por omissao so os ativos; a administracao precisa de ver tambem os inativos ('todos')
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

const create = async ({ nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id }) => {
    const result = await pool.query(
        `insert into servico (nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id)
         values ($1, $2, $3, $4, coalesce($5, 'fixo'), coalesce($6, false), $7)
         returning id, nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id, estado`,
        [nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id]
    );

    return result.rows[0];
};

//coalesce mantem o valor atual, para a atualizacao poder enviar so o campo alterado
const update = async (id, { nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id }) => {
    const result = await pool.query(
        `update servico
            set nome = coalesce($2, nome),
                descricao = coalesce($3, descricao),
                valor = coalesce($4, valor),
                duracao_min = coalesce($5, duracao_min),
                tipo_preco = coalesce($6, tipo_preco),
                elegivel_fidelizacao = coalesce($7, elegivel_fidelizacao),
                categoria_id = coalesce($8, categoria_id)
          where id = $1
          returning id, nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id, estado`,
        [id, nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id]
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

//devolve null se nao existir; a integridade referencial do postgres bloqueia se houver atendimentos
const deleteServico = async (id) => {
    const result = await pool.query(
        "delete from servico where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

//guardar o preco anterior preserva o valor ja cobrado nos atendimentos passados (RN03)
const registrarHistoricoPreco = async ({ servico_id, valor_anterior, valor_novo, alterado_por }) => {
    await pool.query(
        `insert into historico_preco_servico (servico_id, valor_anterior, valor_novo, alterado_por)
         values ($1, $2, $3, $4)`,
        [servico_id, valor_anterior, valor_novo, alterado_por]
    );
};

//---- o publico so ve ativos e sem dados internos, para nao expor a operacao (RN22/RNF11) ----

const camposPublicos = `s.id, s.nome, s.descricao, s.valor, s.duracao_min, s.tipo_preco,
    c.nome as categoria_nome`;

const findPublicos = async () => {
    const result = await pool.query(
        `select ${camposPublicos}
           from servico s
           join categoria_salao c on c.id = s.categoria_id
          where s.estado = 'Ativo'
          order by c.nome, s.nome`
    );

    return result.rows;
};

const findPublicoById = async (id) => {
    const result = await pool.query(
        `select ${camposPublicos}
           from servico s
           join categoria_salao c on c.id = s.categoria_id
          where s.id = $1 and s.estado = 'Ativo'`,
        [id]
    );

    return result.rows[0] || null;
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
    findHistoricoPrecos,
    findPublicos,
    findPublicoById
};

export default Servico;
