import { asc, eq } from 'drizzle-orm';
import db from '../db/client.js';
import { perfil } from '../db/schema/index.js';

const campos = {
    id: perfil.id,
    nome: perfil.nome,
    descricao: perfil.descricao,
    estado: perfil.estado
};

const findAll = async () => {
    return db.select(campos).from(perfil).orderBy(asc(perfil.id));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(perfil)
        .where(eq(perfil.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome, descricao }) => {
    const [linha] = await db.insert(perfil)
        .values({ nome, descricao })
        .returning(campos);

    return linha;
};

//atualizacao parcial: campos nao enviados mantem o valor atual
const update = async (id, { nome, descricao, estado }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (descricao !== undefined && descricao !== null) valores.descricao = descricao;
    if (estado !== undefined && estado !== null) valores.estado = estado;

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(perfil)
        .set(valores)
        .where(eq(perfil.id, id))
        .returning(campos);

    return linha || null;
};

const Perfil = {
    findAll,
    findById,
    create,
    update
};

export default Perfil;
