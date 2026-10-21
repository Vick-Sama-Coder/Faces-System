import pool from '../config/database.js';

//data_nascimento devolvida como texto AAAA-MM-DD (evita deslocamento de fuso do tipo date)
const campos = `id, nome, apelido, telefone, endereco,
    to_char(data_nascimento, 'YYYY-MM-DD') as data_nascimento,
    data_registo, saldo_pendente, estado`;

//listagem com pesquisa opcional por nome/apelido ou telefone (correspondencia parcial)
const findAll = async ({ search } = {}) => {
    const termo = search ? `%${search}%` : null;

    const result = await pool.query(
        `select ${campos}
           from cliente
          where $1::text is null
             or nome ilike $1
             or coalesce(apelido, '') ilike $1
             or cast(telefone as text) ilike $1
          order by nome`,
        [termo]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos} from cliente where id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

//verifica duplicacao de telefone (ignora um id quando em atualizacao)
const existeTelefone = async (telefone, exceptoId = null) => {
    const result = await pool.query(
        `select 1 from cliente
          where telefone = $1 and ($2::int is null or id <> $2)
          limit 1`,
        [telefone, exceptoId]
    );

    return result.rows.length > 0;
};

const create = async ({ nome, apelido, telefone, endereco, data_nascimento }) => {
    const result = await pool.query(
        `insert into cliente (nome, apelido, telefone, endereco, data_nascimento)
         values ($1, $2, $3, $4, $5)
         returning ${campos}`,
        [nome, apelido, telefone, endereco, data_nascimento]
    );

    return result.rows[0];
};

//atualizacao parcial: campos nao enviados mantem o valor atual
const update = async (id, { nome, apelido, telefone, endereco, data_nascimento, estado }) => {
    const result = await pool.query(
        `update cliente
            set nome = coalesce($2, nome),
                apelido = coalesce($3, apelido),
                telefone = coalesce($4, telefone),
                endereco = coalesce($5, endereco),
                data_nascimento = coalesce($6, data_nascimento),
                estado = coalesce($7, estado)
          where id = $1
          returning ${campos}`,
        [id, nome, apelido, telefone, endereco, data_nascimento, estado]
    );

    return result.rows[0] || null;
};

const updateEstado = async (id, estado) => {
    const result = await pool.query(
        `update cliente set estado = $2
          where id = $1
          returning ${campos}`,
        [id, estado]
    );

    return result.rows[0] || null;
};

//remocao fisica; o Postgres bloqueia (23503) se existirem atendimentos associados
const deleteCliente = async (id) => {
    const result = await pool.query(
        "delete from cliente where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

const Cliente = {
    findAll,
    findById,
    existeTelefone,
    create,
    update,
    updateEstado,
    delete: deleteCliente
};

export default Cliente;
