import pool from '../config/database.js';

//invalida todos os codigos pendentes do utilizador (ao pedir um novo codigo)
const invalidarPendentes = async (idUsuario) => {
    await pool.query(
        `update recuperacao_senha
            set usado = true
          where id_usuario = $1 and usado = false`,
        [idUsuario]
    );
};

//guarda um novo codigo (hash) com a respectiva validade
const create = async ({ idUsuario, codigoHash, expiraEm }) => {
    const result = await pool.query(
        `insert into recuperacao_senha (id_usuario, codigo_hash, expira_em)
         values ($1, $2, $3)
         returning id, id_usuario, expira_em, tentativas`,
        [idUsuario, codigoHash, expiraEm]
    );

    return result.rows[0];
};

//codigo mais recente ainda valido (nao usado e nao expirado)
const findAtivo = async (idUsuario) => {
    const result = await pool.query(
        `select id, id_usuario, codigo_hash, expira_em, usado, tentativas
           from recuperacao_senha
          where id_usuario = $1
            and usado = false
            and expira_em > now()
          order by data_criacao desc
          limit 1`,
        [idUsuario]
    );

    return result.rows[0] || null;
};

const incrementarTentativas = async (id) => {
    await pool.query(
        `update recuperacao_senha
            set tentativas = tentativas + 1
          where id = $1`,
        [id]
    );
};

const marcarUsado = async (id) => {
    await pool.query(
        `update recuperacao_senha
            set usado = true
          where id = $1`,
        [id]
    );
};

const RecuperacaoSenha = {
    invalidarPendentes,
    create,
    findAtivo,
    incrementarTentativas,
    marcarUsado
};

export default RecuperacaoSenha;
