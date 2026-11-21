import { and, asc, eq, ilike } from 'drizzle-orm';
import db from '../db/client.js';
import { categoriaProduto, produto } from '../db/schema/index.js';

const campos = {
    id: produto.id,
    nome: produto.nome,
    valor: produto.valor,
    categoria_produto_id: produto.categoria_produto_id,
    categoria_nome: categoriaProduto.nome,
    unidade: produto.unidade,
    stock_minimo: produto.stock_minimo,
    estado: produto.estado
};

const findAll = async ({ search, categoria, estado } = {}) => {
    const condicoes = [];

    if (search) {
        condicoes.push(ilike(produto.nome, `%${String(search).trim()}%`));
    }
    if (categoria !== undefined && categoria !== null && categoria !== '') {
        condicoes.push(eq(produto.categoria_produto_id, categoria));
    }
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(produto.estado, estado));
    }

    return db.select(campos)
        .from(produto)
        .leftJoin(categoriaProduto, eq(categoriaProduto.id, produto.categoria_produto_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(asc(produto.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(produto)
        .leftJoin(categoriaProduto, eq(categoriaProduto.id, produto.categoria_produto_id))
        .where(eq(produto.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome, valor, categoria_produto_id, unidade, stock_minimo }) => {
    const [linha] = await db.insert(produto)
        .values({
            nome,
            valor,
            categoria_produto_id,
            unidade: unidade ?? 'un',
            stock_minimo: stock_minimo ?? 0
        })
        .returning({ id: produto.id });

    return findById(linha.id);
};

const update = async (id, dados) => {
    const valores = {};

    for (const campo of ['nome', 'valor', 'categoria_produto_id', 'unidade', 'stock_minimo', 'estado']) {
        if (dados[campo] !== undefined && dados[campo] !== null) {
            valores[campo] = dados[campo];
        }
    }

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(produto)
        .set(valores)
        .where(eq(produto.id, id))
        .returning({ id: produto.id });

    return linha ? findById(linha.id) : null;
};

const remove = async (id) => {
    const [linha] = await db.delete(produto)
        .where(eq(produto.id, id))
        .returning({ id: produto.id });

    return linha || null;
};

const Produto = {
    findAll,
    findById,
    create,
    update,
    delete: remove
};

export default Produto;
