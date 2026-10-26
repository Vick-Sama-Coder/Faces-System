import { and, asc, eq, ne, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { perfil, usuario } from '../db/schema/index.js';

//campos devolvidos em respostas (nunca inclui a senha)
const camposPublicos = {
    id: usuario.id,
    nome: usuario.nome,
    telefone: usuario.telefone,
    id_perfil: usuario.id_perfil,
    estado: usuario.estado,
    alteracao_obrigatoria_senha: usuario.alteracao_obrigatoria_senha,
    ultimo_acesso: usuario.ultimo_acesso,
    data_criacao: usuario.data_criacao,
    perfil: perfil.nome
};

//listagem de todos os utilizadores (ordenada por nome)
const findAll = async () => {
    return db.select(camposPublicos)
        .from(usuario)
        .innerJoin(perfil, eq(perfil.id, usuario.id_perfil))
        .orderBy(asc(usuario.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(camposPublicos)
        .from(usuario)
        .innerJoin(perfil, eq(perfil.id, usuario.id_perfil))
        .where(eq(usuario.id, id))
        .limit(1);

    return linha || null;
};

//uso interno (login): inclui o hash da senha; pesquisa case-insensitive pelo nome
const findByNomeComSenha = async (nome) => {
    const [linha] = await db.select({
        id: usuario.id,
        nome: usuario.nome,
        telefone: usuario.telefone,
        senha: usuario.senha,
        id_perfil: usuario.id_perfil,
        estado: usuario.estado,
        alteracao_obrigatoria_senha: usuario.alteracao_obrigatoria_senha,
        perfil: perfil.nome
    })
        .from(usuario)
        .innerJoin(perfil, eq(perfil.id, usuario.id_perfil))
        .where(sql`lower(${usuario.nome}) = lower(${nome})`)
        .limit(1);

    return linha || null;
};

//uso interno (troca de senha): inclui o hash atual
const findByIdComSenha = async (id) => {
    const [linha] = await db.select({
        id: usuario.id,
        senha: usuario.senha
    })
        .from(usuario)
        .where(eq(usuario.id, id))
        .limit(1);

    return linha || null;
};

//verifica duplicacao de telefone (ignora um id quando em atualizacao)
const existeTelefone = async (telefone, exceptoId = null) => {
    const condicoes = [eq(usuario.telefone, telefone)];

    if (exceptoId !== null && exceptoId !== undefined) {
        condicoes.push(ne(usuario.id, exceptoId));
    }

    const linhas = await db.select({ id: usuario.id })
        .from(usuario)
        .where(and(...condicoes))
        .limit(1);

    return linhas.length > 0;
};

//verifica duplicacao do nome de utilizador (case-insensitive)
const existeNome = async (nome, exceptoId = null) => {
    const condicoes = [sql`lower(${usuario.nome}) = lower(${nome})`];

    if (exceptoId !== null && exceptoId !== undefined) {
        condicoes.push(ne(usuario.id, exceptoId));
    }

    const linhas = await db.select({ id: usuario.id })
        .from(usuario)
        .where(and(...condicoes))
        .limit(1);

    return linhas.length > 0;
};

const create = async ({ nome, telefone, senhaHash, id_perfil, alteracaoObrigatoria = false }) => {
    const [linha] = await db.insert(usuario)
        .values({
            nome,
            senha: senhaHash,
            telefone,
            id_perfil,
            alteracao_obrigatoria_senha: alteracaoObrigatoria
        })
        .returning({
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            id_perfil: usuario.id_perfil,
            estado: usuario.estado,
            alteracao_obrigatoria_senha: usuario.alteracao_obrigatoria_senha
        });

    return linha;
};

//atualizacao parcial
const update = async (id, { nome, telefone, id_perfil }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (telefone !== undefined && telefone !== null) valores.telefone = telefone;
    if (id_perfil !== undefined && id_perfil !== null) valores.id_perfil = id_perfil;

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(usuario)
        .set(valores)
        .where(eq(usuario.id, id))
        .returning({
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            id_perfil: usuario.id_perfil,
            estado: usuario.estado
        });

    return linha || null;
};

const updateEstado = async (id, estado) => {
    const [linha] = await db.update(usuario)
        .set({ estado })
        .where(eq(usuario.id, id))
        .returning({
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            id_perfil: usuario.id_perfil,
            estado: usuario.estado
        });

    return linha || null;
};

const updateSenha = async (id, senhaHash, alteracaoObrigatoria) => {
    const [linha] = await db.update(usuario)
        .set({
            senha: senhaHash,
            alteracao_obrigatoria_senha: alteracaoObrigatoria
        })
        .where(eq(usuario.id, id))
        .returning({
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            id_perfil: usuario.id_perfil,
            estado: usuario.estado
        });

    return linha || null;
};

const registarAcesso = async (id) => {
    await db.update(usuario)
        .set({ ultimo_acesso: sql`now()` })
        .where(eq(usuario.id, id));
};

const Usuario = {
    findAll,
    findById,
    findByNomeComSenha,
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
