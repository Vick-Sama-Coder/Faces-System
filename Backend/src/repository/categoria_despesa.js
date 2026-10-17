import pool from '../config/database.js';

const campos = `cd.id, cd.nome, cd.tipo, cd.estado`;

const findAll = async () => {
    const result = await pool.query(
        `select ${campos} from categoria_despesa cd order by cd.nome`
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos} from categoria_despesa cd where cd.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const create = async ({ nome, tipo }) => {
    const result = await pool.query(
        `insert into categoria_despesa (nome, tipo)
         values ($1, coalesce($2, 'Variavel'))
         returning id, nome, tipo, estado`,
        [nome, tipo]
    );

    return result.rows[0];
};

const CategoriaDespesa = {
    findAll,
    findById,
    create
};

export default CategoriaDespesa;
