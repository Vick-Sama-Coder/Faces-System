import { asc, eq } from 'drizzle-orm';
import db from '../db/client.js';
import { categoriaDespesa } from '../db/schema/index.js';

const campos = {
    id: categoriaDespesa.id,
    nome: categoriaDespesa.nome,
    tipo: categoriaDespesa.tipo,
    estado: categoriaDespesa.estado
};

const findAll = async () => {
    return db.select(campos).from(categoriaDespesa).orderBy(asc(categoriaDespesa.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(categoriaDespesa)
        .where(eq(categoriaDespesa.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome, tipo }) => {
    const [linha] = await db.insert(categoriaDespesa)
        .values({ nome, tipo: tipo ?? 'Variavel' })
        .returning(campos);

    return linha;
};

const CategoriaDespesa = {
    findAll,
    findById,
    create
};

export default CategoriaDespesa;
