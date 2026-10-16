import pool from '../config/database.js';

//listagem de todos os servicos com o nome da categoria ja resuelto (join),
//para o frontend nao precisar de um segundo pedido so para mapear os nomes
const findAll = async () => {
    const result = await pool.query(
        `select s.id, s.nome, s.valor, s.categoria_id, c.nome as categoria_nome
         from servico s
         join categoria_salao c on c.id = s.categoria_id
         order by s.nome`
    );

    return result.rows;
};

//busca de um unico servico pelo id (com o nome da categoria)
const findById = async (id) => {
    const result = await pool.query(
        `select s.id, s.nome, s.valor, s.categoria_id, c.nome as categoria_nome
         from servico s
         join categoria_salao c on c.id = s.categoria_id
         where s.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

//criacao: os campos chegam sempre do controller
const create = async ({ nome, valor, categoria_id }) => {
    const result = await pool.query(
        `insert into servico (nome, valor, categoria_id)
         values ($1, $2, $3)
         returning id, nome, valor, categoria_id`,
        [nome, valor, categoria_id]
    );

    return result.rows[0];
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, { nome, valor, categoria_id }) => {
    const result = await pool.query(
        `update servico
         set nome = coalesce($2, nome),
             valor = coalesce($3, valor),
             categoria_id = coalesce($4, categoria_id)
         where id = $1
         returning id, nome, valor, categoria_id`,
        [id, nome, valor, categoria_id]
    );

    return result.rows[0] || null;
};

//remocao: devolve o id apagado ou null se o servico nao existir
//(o postgres bloqueia a operacao se houver execucao_servico a ligado)
const deleteServico = async (id) => {
    const result = await pool.query(
        "delete from servico where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

const Servico = {
    findAll,
    findById,
    create,
    update,
    delete: deleteServico
};

export default Servico;