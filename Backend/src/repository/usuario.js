import pool from '../config/database.js';

//campos devolvidos em respostas (nunca inclui a senha)
const camposPublicos = `u.id, u.nome, u.telefone, u.id_perfil, u.estado,
    u.alteracao_obrigatoria_senha, u.ultimo_acesso, u.data_criacao, p.nome as perfil`;

//listagem de todos os utilizadores (ordenada por nome)
const findAll = async () => {
    const result = await pool.query(
        `select ${camposPublicos}
           from usuario u
           join perfil p on p.id = u.id_perfil
          order by u.nome`
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${camposPublicos}
           from usuario u
           join perfil p on p.id = u.id_perfil
          where u.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

//uso interno (login): inclui o hash da senha; pesquisa case-insensitive pelo nome
const findByNomeComSenha = async (nome) => {
    const result = await pool.query(
        `select u.id, u.nome, u.telefone, u.senha, u.id_perfil, u.estado,
                u.alteracao_obrigatoria_senha, p.nome as perfil
           from usuario u
           join perfil p on p.id = u.id_perfil
          where lower(u.nome) = lower($1)`,
        [nome]
    );

    return result.rows[0] || null;
};

//uso interno (recuperacao de senha): utilizador pelo telefone (sem a senha)
const findByTelefone = async (telefone) => {
    const result = await pool.query(
        `select u.id, u.nome, u.telefone, u.id_perfil, u.estado
           from usuario u
          where u.telefone = $1`,
        [telefone]
    );

    return result.rows[0] || null;
};

//uso interno (troca de senha): inclui o hash atual
const findByIdComSenha = async (id) => {
    const result = await pool.query(
        "select id, senha from usuario where id = $1",
        [id]
    );

    return result.rows[0] || null;
};

//verifica duplicacao de telefone (ignora um id quando em atualizacao)
const existeTelefone = async (telefone, exceptoId = null) => {
    const result = await pool.query(
        `select 1 from usuario
          where telefone = $1 and ($2::int is null or id <> $2)
          limit 1`,
        [telefone, exceptoId]
    );

    return result.rows.length > 0;
};

//verifica duplicacao do nome de utilizador (case-insensitive)
const existeNome = async (nome, exceptoId = null) => {
    const result = await pool.query(
        `select 1 from usuario
          where lower(nome) = lower($1) and ($2::int is null or id <> $2)
          limit 1`,
        [nome, exceptoId]
    );

    return result.rows.length > 0;
};

const create = async ({ nome, telefone, senhaHash, id_perfil, alteracaoObrigatoria = false }) => {
    const result = await pool.query(
        `insert into usuario (nome, senha, telefone, id_perfil, alteracao_obrigatoria_senha)
         values ($1, $2, $3, $4, $5)
         returning id, nome, telefone, id_perfil, estado, alteracao_obrigatoria_senha`,
        [nome, senhaHash, telefone, id_perfil, alteracaoObrigatoria]
    );

    return result.rows[0];
};

//atualizacao parcial
const update = async (id, { nome, telefone, id_perfil }) => {
    const result = await pool.query(
        `update usuario
            set nome = coalesce($2, nome),
                telefone = coalesce($3, telefone),
                id_perfil = coalesce($4, id_perfil)
          where id = $1
          returning id, nome, telefone, id_perfil, estado`,
        [id, nome, telefone, id_perfil]
    );

    return result.rows[0] || null;
};

const updateEstado = async (id, estado) => {
    const result = await pool.query(
        `update usuario set estado = $2
          where id = $1
          returning id, nome, telefone, id_perfil, estado`,
        [id, estado]
    );

    return result.rows[0] || null;
};

const updateSenha = async (id, senhaHash, alteracaoObrigatoria) => {
    const result = await pool.query(
        `update usuario
            set senha = $2, alteracao_obrigatoria_senha = $3
          where id = $1
          returning id, nome, telefone, id_perfil, estado`,
        [id, senhaHash, alteracaoObrigatoria]
    );

    return result.rows[0] || null;
};

const registarAcesso = async (id) => {
    await pool.query("update usuario set ultimo_acesso = now() where id = $1", [id]);
};

const Usuario = {
    findAll,
    findById,
    findByNomeComSenha,
    findByTelefone,
    findByIdComSenha,
    existeTelefone,
    existeNome,
    create,
    update,
    updateEstado,
    updateSenha,
    registarAcesso
};

export default Usuario;
