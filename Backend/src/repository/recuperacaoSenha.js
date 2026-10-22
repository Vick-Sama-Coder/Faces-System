import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { recuperacaoSenha } from '../db/schema/index.js';

//invalida todos os codigos pendentes do utilizador (ao pedir um novo codigo)
const invalidarPendentes = async (idUsuario) => {
    await db.update(recuperacaoSenha)
        .set({ usado: true })
        .where(and(
            eq(recuperacaoSenha.id_usuario, idUsuario),
            eq(recuperacaoSenha.usado, false)
        ));
};

//guarda um novo codigo (hash) com a respectiva validade
const create = async ({ idUsuario, codigoHash, expiraEm }) => {
    const [linha] = await db.insert(recuperacaoSenha)
        .values({
            id_usuario: idUsuario,
            codigo_hash: codigoHash,
            expira_em: expiraEm
        })
        .returning({
            id: recuperacaoSenha.id,
            id_usuario: recuperacaoSenha.id_usuario,
            expira_em: recuperacaoSenha.expira_em,
            tentativas: recuperacaoSenha.tentativas
        });

    return linha;
};

//codigo mais recente ainda valido (nao usado e nao expirado)
const findAtivo = async (idUsuario) => {
    const [linha] = await db.select({
        id: recuperacaoSenha.id,
        id_usuario: recuperacaoSenha.id_usuario,
        codigo_hash: recuperacaoSenha.codigo_hash,
        expira_em: recuperacaoSenha.expira_em,
        usado: recuperacaoSenha.usado,
        tentativas: recuperacaoSenha.tentativas
    })
        .from(recuperacaoSenha)
        .where(and(
            eq(recuperacaoSenha.id_usuario, idUsuario),
            eq(recuperacaoSenha.usado, false),
            gt(recuperacaoSenha.expira_em, new Date())
        ))
        .orderBy(desc(recuperacaoSenha.data_criacao))
        .limit(1);

    return linha || null;
};

const incrementarTentativas = async (id) => {
    await db.update(recuperacaoSenha)
        .set({ tentativas: sql`${recuperacaoSenha.tentativas} + 1` })
        .where(eq(recuperacaoSenha.id, id));
};

const marcarUsado = async (id) => {
    await db.update(recuperacaoSenha)
        .set({ usado: true })
        .where(eq(recuperacaoSenha.id, id));
};

const RecuperacaoSenha = {
    invalidarPendentes,
    create,
    findAtivo,
    incrementarTentativas,
    marcarUsado
};

export default RecuperacaoSenha;
