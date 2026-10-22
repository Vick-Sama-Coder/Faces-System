import { asc, eq } from 'drizzle-orm';
import db from '../db/client.js';
import { categoriaSalao } from '../db/schema/index.js';

//listagem de todas as categorias de salao (ordenada por nome para a grid do frontend)
const findAll = async () => {
    return db.select({
        id: categoriaSalao.id,
        nome: categoriaSalao.nome
    })
        .from(categoriaSalao)
        .orderBy(asc(categoriaSalao.nome));
};

//busca de uma unica categoria pelo id (devolve null se nao existir)
const findById = async (id) => {
    const [categoria] = await db.select({
        id: categoriaSalao.id,
        nome: categoriaSalao.nome
    })
        .from(categoriaSalao)
        .where(eq(categoriaSalao.id, id))
        .limit(1);

    return categoria || null;
};

//criacao: o campo nome chega sempre do controller
const create = async ({ nome }) => {
    const [categoria] = await db.insert(categoriaSalao)
        .values({ nome })
        .returning({
            id: categoriaSalao.id,
            nome: categoriaSalao.nome
        });

    return categoria;
};

//atualizacao parcial: campo a null e ignorado e mantem o valor atual
const update = async (id, { nome }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) {
        valores.nome = nome;
    }

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [categoria] = await db.update(categoriaSalao)
        .set(valores)
        .where(eq(categoriaSalao.id, id))
        .returning({
            id: categoriaSalao.id,
            nome: categoriaSalao.nome
        });

    return categoria || null;
};

//remocao: devolve o id apagado ou null se a categoria nao existir
//(o postgres bloqueia a operacao se houver servico ligado a esta categoria)
const deleteCategoria = async (id) => {
    const [categoria] = await db.delete(categoriaSalao)
        .where(eq(categoriaSalao.id, id))
        .returning({ id: categoriaSalao.id });

    return categoria || null;
};

const Categoria = {
    findAll,
    findById,
    create,
    update,
    delete: deleteCategoria
};

export default Categoria;
