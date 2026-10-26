import { asc, eq, ilike, or, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { cliente } from '../db/schema/index.js';

//data_nascimento devolvida como texto AAAA-MM-DD (evita deslocamento de fuso do tipo date)
const campos = {
    id: cliente.id,
    nome: cliente.nome,
    apelido: cliente.apelido,
    telefone: cliente.telefone,
    endereco: cliente.endereco,
    data_nascimento: sql`to_char(${cliente.data_nascimento}, 'YYYY-MM-DD')`,
    idade: cliente.idade,
    sexo: cliente.sexo,
    data_registo: cliente.data_registo,
    saldo_pendente: cliente.saldo_pendente,
    estado: cliente.estado
};

//listagem com pesquisa opcional por nome/apelido ou telefone (correspondencia parcial)
const findAll = async ({ search } = {}) => {
    const termo = search ? `%${search}%` : null;

    const query = db.select(campos).from(cliente);

    if (!termo) {
        return query.orderBy(asc(cliente.nome));
    }

    return query.where(or(
        ilike(cliente.nome, termo),
        ilike(sql`coalesce(${cliente.apelido}, '')`, termo),
        ilike(sql`cast(${cliente.telefone} as text)`, termo)
    )).orderBy(asc(cliente.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(cliente)
        .where(eq(cliente.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome, apelido, telefone, endereco, data_nascimento, idade, sexo }) => {
    const [linha] = await db.insert(cliente)
        .values({
            nome,
            apelido: apelido ?? null,
            telefone,
            endereco: endereco ?? null,
            data_nascimento: data_nascimento ?? null,
            idade: idade ?? null,
            sexo: sexo ?? null
        })
        .returning(campos);

    return linha;
};

//atualizacao parcial: campos nao enviados mantem o valor atual
const update = async (id, { nome, apelido, telefone, endereco, data_nascimento, idade, sexo, estado }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (apelido !== undefined && apelido !== null) valores.apelido = apelido;
    if (telefone !== undefined && telefone !== null) valores.telefone = telefone;
    if (endereco !== undefined && endereco !== null) valores.endereco = endereco;
    if (data_nascimento !== undefined && data_nascimento !== null) valores.data_nascimento = data_nascimento;
    if (idade !== undefined && idade !== null) valores.idade = idade;
    if (sexo !== undefined && sexo !== null) valores.sexo = sexo;
    if (estado !== undefined && estado !== null) valores.estado = estado;

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(cliente)
        .set(valores)
        .where(eq(cliente.id, id))
        .returning(campos);

    return linha || null;
};

const updateEstado = async (id, estado) => {
    const [linha] = await db.update(cliente)
        .set({ estado })
        .where(eq(cliente.id, id))
        .returning(campos);

    return linha || null;
};

//remocao fisica; o Postgres bloqueia (23503) se existirem atendimentos associados
const deleteCliente = async (id) => {
    const [linha] = await db.delete(cliente)
        .where(eq(cliente.id, id))
        .returning({ id: cliente.id });

    return linha || null;
};

const Cliente = {
    findAll,
    findById,
    create,
    update,
    updateEstado,
    delete: deleteCliente
};

export default Cliente;
