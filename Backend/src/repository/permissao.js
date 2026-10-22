import { and, asc, eq, inArray, notInArray, or } from 'drizzle-orm';
import db from '../db/client.js';
import {
    perfilPermissao,
    permissao,
    usuarioPermissao
} from '../db/schema/index.js';

const campos = {
    id: permissao.id,
    codigo: permissao.codigo,
    descricao: permissao.descricao,
    modulo: permissao.modulo
};

//catalogo completo de permissoes
const findAll = async () => {
    return db.select(campos)
        .from(permissao)
        .orderBy(asc(permissao.modulo), asc(permissao.codigo));
};

//codigos de permissao efetivos de um utilizador:
//permissoes do perfil MENOS as revogadas individualmente MAIS as concedidas individualmente
const codigosEfetivos = async (usuarioId, idPerfil) => {
    const permissoesDoPerfil = db
        .select({ id: perfilPermissao.id_permissao })
        .from(perfilPermissao)
        .where(eq(perfilPermissao.id_perfil, idPerfil));

    const concedidas = db
        .select({ id: usuarioPermissao.id_permissao })
        .from(usuarioPermissao)
        .where(and(
            eq(usuarioPermissao.id_usuario, usuarioId),
            eq(usuarioPermissao.efeito, 'conceder')
        ));

    const revogadas = db
        .select({ id: usuarioPermissao.id_permissao })
        .from(usuarioPermissao)
        .where(and(
            eq(usuarioPermissao.id_usuario, usuarioId),
            eq(usuarioPermissao.efeito, 'revogar')
        ));

    const linhas = await db.select({ codigo: permissao.codigo })
        .from(permissao)
        .where(and(
            or(
                inArray(permissao.id, permissoesDoPerfil),
                inArray(permissao.id, concedidas)
            ),
            notInArray(permissao.id, revogadas)
        ))
        .orderBy(asc(permissao.codigo));

    return linhas.map((linha) => linha.codigo);
};

//permissoes atribuidas a um perfil
const findByPerfil = async (idPerfil) => {
    return db.select(campos)
        .from(perfilPermissao)
        .innerJoin(permissao, eq(permissao.id, perfilPermissao.id_permissao))
        .where(eq(perfilPermissao.id_perfil, idPerfil))
        .orderBy(asc(permissao.modulo), asc(permissao.codigo));
};

//excecoes individuais de um utilizador
const overridesUsuario = async (usuarioId) => {
    return db.select({
        codigo: permissao.codigo,
        efeito: usuarioPermissao.efeito
    })
        .from(usuarioPermissao)
        .innerJoin(permissao, eq(permissao.id, usuarioPermissao.id_permissao))
        .where(eq(usuarioPermissao.id_usuario, usuarioId))
        .orderBy(asc(permissao.codigo));
};

//substitui todas as permissoes de um perfil (transacional)
const substituirPerfil = async (idPerfil, codigos) => {
    await db.transaction(async (tx) => {
        await tx.delete(perfilPermissao)
            .where(eq(perfilPermissao.id_perfil, idPerfil));

        if (codigos.length > 0) {
            const permissoes = await tx.select({ id: permissao.id })
                .from(permissao)
                .where(inArray(permissao.codigo, codigos));

            if (permissoes.length > 0) {
                await tx.insert(perfilPermissao).values(
                    permissoes.map((linha) => ({
                        id_perfil: idPerfil,
                        id_permissao: linha.id
                    }))
                );
            }
        }
    });
};

//substitui as excecoes individuais de um utilizador (transacional)
const substituirUsuario = async (usuarioId, conceder, revogar) => {
    await db.transaction(async (tx) => {
        await tx.delete(usuarioPermissao)
            .where(eq(usuarioPermissao.id_usuario, usuarioId));

        const inserirEfeito = async (codigos, efeito) => {
            if (codigos.length === 0) return;

            const permissoes = await tx.select({ id: permissao.id })
                .from(permissao)
                .where(inArray(permissao.codigo, codigos));

            if (permissoes.length > 0) {
                await tx.insert(usuarioPermissao).values(
                    permissoes.map((linha) => ({
                        id_usuario: usuarioId,
                        id_permissao: linha.id,
                        efeito
                    }))
                );
            }
        };

        await inserirEfeito(conceder, 'conceder');
        await inserirEfeito(revogar, 'revogar');
    });
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
