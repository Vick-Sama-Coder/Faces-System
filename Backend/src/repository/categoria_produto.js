import { asc, eq } from 'drizzle-orm';
import db from '../db/client.js';
import { categoriaProduto } from '../db/schema/index.js';

const campos = {
    id: categoriaProduto.id,
    nome: categoriaProduto.nome
};

const findAll = async () => {
    return db.select(campos)
        .from(categoriaProduto)
        .orderBy(asc(categoriaProduto.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(categoriaProduto)
        .where(eq(categoriaProduto.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome }) => {
    const [linha] = await db.insert(categoriaProduto)
        .values({ nome })
        .returning(campos);

    return linha;
};

const update = async (id, { nome }) => {
    const [linha] = await db.update(categoriaProduto)
        .set({ nome })
        .where(eq(categoriaProduto.id, id))
        .returning(campos);

    return linha || null;
};

const remove = async (id) => {
    const [linha] = await db.delete(categoriaProduto)
        .where(eq(categoriaProduto.id, id))
        .returning({ id: categoriaProduto.id });

    return linha || null;
};

const CategoriaProduto = {
    findAll,
    findById,
    create,
    update,
    delete: remove
};

export default CategoriaProduto;
