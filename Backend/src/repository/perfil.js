import pool from '../config/database.js';

const findAll = async () => {
    const result = await pool.query(
        "select id, nome, descricao, estado from perfil order by id"
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        "select id, nome, descricao, estado from perfil where id = $1",
        [id]
    );

    return result.rows[0] || null;
};

const create = async ({ nome, descricao }) => {
    const result = await pool.query(
        `insert into perfil (nome, descricao)
         values ($1, $2)
         returning id, nome, descricao, estado`,
        [nome, descricao]
    );

    return result.rows[0];
};

//atualizacao parcial: campos nao enviados mantem o valor atual
const update = async (id, { nome, descricao, estado }) => {
    const result = await pool.query(
        `update perfil
            set nome = coalesce($2, nome),
                descricao = coalesce($3, descricao),
                estado = coalesce($4, estado)
          where id = $1
          returning id, nome, descricao, estado`,
        [id, nome, descricao, estado]
    );

    return result.rows[0] || null;
};

const Perfil = {
    findAll,
    findById,
    create,
    update
};

export default Perfil;
