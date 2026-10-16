import pool from '../config/database.js';

//catalogo completo de permissoes
const findAll = async () => {
    const result = await pool.query(
        "select id, codigo, descricao, modulo from permissao order by modulo, codigo"
    );

    return result.rows;
};

//codigos de permissao efetivos de um utilizador:
//permissoes do perfil MENOS as revogadas individualmente MAIS as concedidas individualmente
const codigosEfetivos = async (usuarioId, idPerfil) => {
    const result = await pool.query(
        `select p.codigo
           from permissao p
          where p.id in (
                select pp.id_permissao from perfil_permissao pp where pp.id_perfil = $2
                union
                select up.id_permissao from usuario_permissao up
                 where up.id_usuario = $1 and up.efeito = 'conceder'
          )
            and p.id not in (
                select up2.id_permissao from usuario_permissao up2
                 where up2.id_usuario = $1 and up2.efeito = 'revogar'
          )
          order by p.codigo`,
        [usuarioId, idPerfil]
    );

    return result.rows.map((linha) => linha.codigo);
};

//permissoes atribuidas a um perfil
const findByPerfil = async (idPerfil) => {
    const result = await pool.query(
        `select p.id, p.codigo, p.descricao, p.modulo
           from perfil_permissao pp
           join permissao p on p.id = pp.id_permissao
          where pp.id_perfil = $1
          order by p.modulo, p.codigo`,
        [idPerfil]
    );

    return result.rows;
};

//excecoes individuais de um utilizador
const overridesUsuario = async (usuarioId) => {
    const result = await pool.query(
        `select p.codigo, up.efeito
           from usuario_permissao up
           join permissao p on p.id = up.id_permissao
          where up.id_usuario = $1
          order by p.codigo`,
        [usuarioId]
    );

    return result.rows;
};

//substitui todas as permissoes de um perfil (transacional)
const substituirPerfil = async (idPerfil, codigos) => {
    const client = await pool.connect();
    try {
        await client.query("begin");
        await client.query("delete from perfil_permissao where id_perfil = $1", [idPerfil]);

        if (codigos.length > 0) {
            await client.query(
                `insert into perfil_permissao (id_perfil, id_permissao)
                 select $1, id from permissao where codigo = any($2::text[])`,
                [idPerfil, codigos]
            );
        }

        await client.query("commit");
    } catch (error) {
        await client.query("rollback");
        throw error;
    } finally {
        client.release();
    }
};

//substitui as excecoes individuais de um utilizador (transacional)
const substituirUsuario = async (usuarioId, conceder, revogar) => {
    const client = await pool.connect();
    try {
        await client.query("begin");
        await client.query("delete from usuario_permissao where id_usuario = $1", [usuarioId]);

        if (conceder.length > 0) {
            await client.query(
                `insert into usuario_permissao (id_usuario, id_permissao, efeito)
                 select $1, id, 'conceder' from permissao where codigo = any($2::text[])`,
                [usuarioId, conceder]
            );
        }

        if (revogar.length > 0) {
            await client.query(
                `insert into usuario_permissao (id_usuario, id_permissao, efeito)
                 select $1, id, 'revogar' from permissao where codigo = any($2::text[])`,
                [usuarioId, revogar]
            );
        }

        await client.query("commit");
    } catch (error) {
        await client.query("rollback");
        throw error;
    } finally {
        client.release();
    }
};

const Permissao = {
    findAll,
    codigosEfetivos,
    findByPerfil,
    overridesUsuario,
    substituirPerfil,
    substituirUsuario
};

export default Permissao;
