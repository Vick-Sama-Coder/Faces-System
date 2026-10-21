import pool from '../config/database.js';

//listagem de todas as categorias de salao (ordenada por nome para a grid do frontend)
const findAll = async () => {
    const result = await pool.query(
        "select id, nome from categoria_salao order by nome"
    );

    return result.rows;
};

//busca de uma unica categoria pelo id (devolve null se nao existir)
const findById = async (id) => {
    const result = await pool.query(
        "select id, nome from categoria_salao where id = $1",
        [id]
    );

    return result.rows[0] || null;
};

//criacao: o campo nome chega sempre do controller
const create = async ({ nome }) => {
    const result = await pool.query(
        `insert into categoria_salao (nome)
         values ($1)
         returning id, nome`,
        [nome]
    );

    return result.rows[0];
};

//atualizacao parcial: campo a null e ignorado e mantem o valor atual
const update = async (id, { nome }) => {
    const result = await pool.query(
        `update categoria_salao
         set nome = coalesce($2, nome)
         where id = $1
         returning id, nome`,
        [id, nome]
    );

    return result.rows[0] || null;
};

//remocao: devolve o id apagado ou null se a categoria nao existir
//(o postgres bloqueia a operacao se houver servico a ligado a esta categoria)
const deleteCategoria = async (id) => {
    const result = await pool.query(
        "delete from categoria_salao where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

const Categoria = {
    findAll,
    findById,
    create,
    update,
    delete: deleteCategoria
};

export default Categoria;