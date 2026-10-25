import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    categoriaSalao,
    historicoPrecoServico,
    servico,
    servicoAplicacao,
    servicoModalidade,
    usuario
} from '../db/schema/index.js';

//resolver a categoria na propria consulta evita uma segunda chamada por cada servico
const campos = {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    valor: servico.valor,
    duracao_min: servico.duracao_min,
    tipo_preco: servico.tipo_preco,
    tipo_servico: servico.tipo_servico,
    permite_aplicacoes: servico.permite_aplicacoes,
    elegivel_fidelizacao: servico.elegivel_fidelizacao,
    categoria_id: servico.categoria_id,
    categoria_nome: categoriaSalao.nome,
    estado: servico.estado,
    data_criacao: servico.data_criacao
};

const camposCriacao = {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    valor: servico.valor,
    duracao_min: servico.duracao_min,
    tipo_preco: servico.tipo_preco,
    tipo_servico: servico.tipo_servico,
    permite_aplicacoes: servico.permite_aplicacoes,
    elegivel_fidelizacao: servico.elegivel_fidelizacao,
    categoria_id: servico.categoria_id,
    estado: servico.estado
};

//por omissao so os ativos; a administracao precisa de ver tambem os inativos ('todos')
const findAll = async ({ estado } = {}) => {
    const query = db.select(campos)
        .from(servico)
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id));

    if (estado !== 'todos') {
        return query.where(eq(servico.estado, 'Ativo')).orderBy(asc(servico.nome));
    }

    return query.orderBy(asc(servico.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(servico)
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .where(eq(servico.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({ nome, descricao, valor, duracao_min, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id }) => {
    const [linha] = await db.insert(servico)
        .values({
            nome,
            descricao: descricao ?? null,
            valor,
            duracao_min: duracao_min ?? null,
            tipo_preco: tipo_preco ?? 'fixo',
            tipo_servico: tipo_servico ?? 'Servico',
            permite_aplicacoes: permite_aplicacoes ?? false,
            elegivel_fidelizacao: elegivel_fidelizacao ?? false,
            categoria_id
        })
        .returning(camposCriacao);

    return linha;
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, { nome, descricao, valor, duracao_min, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (descricao !== undefined && descricao !== null) valores.descricao = descricao;
    if (valor !== undefined && valor !== null) valores.valor = valor;
    if (duracao_min !== undefined && duracao_min !== null) valores.duracao_min = duracao_min;
    if (tipo_preco !== undefined && tipo_preco !== null) valores.tipo_preco = tipo_preco;
    if (tipo_servico !== undefined && tipo_servico !== null) valores.tipo_servico = tipo_servico;
    if (permite_aplicacoes !== undefined && permite_aplicacoes !== null) valores.permite_aplicacoes = permite_aplicacoes;
    if (elegivel_fidelizacao !== undefined && elegivel_fidelizacao !== null) valores.elegivel_fidelizacao = elegivel_fidelizacao;
    if (categoria_id !== undefined && categoria_id !== null) valores.categoria_id = categoria_id;

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(servico)
        .set(valores)
        .where(eq(servico.id, id))
        .returning(camposCriacao);

    return linha || null;
};

const updateEstado = async (id, estado) => {
    const [linha] = await db.update(servico)
        .set({ estado })
        .where(eq(servico.id, id))
        .returning({
            id: servico.id,
            nome: servico.nome,
            valor: servico.valor,
            estado: servico.estado
        });

    return linha || null;
};

//devolve null se nao existir; a integridade referencial do postgres bloqueia se houver atendimentos
const deleteServico = async (id) => {
    const [linha] = await db.delete(servico)
        .where(eq(servico.id, id))
        .returning({ id: servico.id });

    return linha || null;
};

//guardar o preco anterior preserva o valor ja cobrado nos atendimentos passados (RN03)
const registrarHistoricoPreco = async ({ servico_id, valor_anterior, valor_novo, alterado_por }) => {
    await db.insert(historicoPrecoServico).values({
        servico_id,
        valor_anterior: valor_anterior ?? null,
        valor_novo,
        alterado_por: alterado_por ?? null
    });
};

//---- o publico so ve ativos e sem dados internos, para nao expor a operacao (RN22/RNF11) ----

const camposPublicos = {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    valor: servico.valor,
    duracao_min: servico.duracao_min,
    tipo_preco: servico.tipo_preco,
    tipo_servico: servico.tipo_servico,
    categoria_nome: categoriaSalao.nome
};

const findPublicos = async () => {
    return db.select(camposPublicos)
        .from(servico)
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .where(eq(servico.estado, 'Ativo'))
        .orderBy(asc(categoriaSalao.nome), asc(servico.nome));
};

const findPublicoById = async (id) => {
    const [linha] = await db.select(camposPublicos)
        .from(servico)
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .where(and(eq(servico.id, id), eq(servico.estado, 'Ativo')))
        .limit(1);

    return linha || null;
};

const findHistoricoPrecos = async (servico_id) => {
    return db.select({
        id: historicoPrecoServico.id,
        valor_anterior: historicoPrecoServico.valor_anterior,
        valor_novo: historicoPrecoServico.valor_novo,
        alterado_por: historicoPrecoServico.alterado_por,
        alterado_por_nome: usuario.nome,
        criado_em: historicoPrecoServico.criado_em
    })
        .from(historicoPrecoServico)
        .leftJoin(usuario, eq(usuario.id, historicoPrecoServico.alterado_por))
        .where(eq(historicoPrecoServico.servico_id, servico_id))
        .orderBy(desc(historicoPrecoServico.criado_em));
};

// Modalidades de um servico
const findModalidades = async (servico_id) => {
    return db.select({
        id: servicoModalidade.id,
        servico_id: servicoModalidade.servico_id,
        nome: servicoModalidade.nome,
        faixa_etaria: servicoModalidade.faixa_etaria,
        valor: servicoModalidade.valor,
        ordem: servicoModalidade.ordem,
        estado: servicoModalidade.estado,
        data_criacao: servicoModalidade.data_criacao
    })
        .from(servicoModalidade)
        .where(and(eq(servicoModalidade.servico_id, servico_id), eq(servicoModalidade.estado, 'Ativo')))
        .orderBy(asc(servicoModalidade.ordem), asc(servicoModalidade.nome));
};

const createModalidade = async ({ servico_id, nome, faixa_etaria, valor, ordem }) => {
    const [linha] = await db.insert(servicoModalidade)
        .values({
            servico_id,
            nome,
            faixa_etaria: faixa_etaria ?? 'Geral',
            valor,
            ordem: ordem ?? 0
        })
        .returning({
            id: servicoModalidade.id,
            servico_id: servicoModalidade.servico_id,
            nome: servicoModalidade.nome,
            faixa_etaria: servicoModalidade.faixa_etaria,
            valor: servicoModalidade.valor,
            ordem: servicoModalidade.ordem,
            estado: servicoModalidade.estado,
            data_criacao: servicoModalidade.data_criacao
        });

    return linha;
};

const updateModalidade = async (id, { nome, faixa_etaria, valor, ordem, estado }) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (faixa_etaria !== undefined && faixa_etaria !== null) valores.faixa_etaria = faixa_etaria;
    if (valor !== undefined && valor !== null) valores.valor = valor;
    if (ordem !== undefined && ordem !== null) valores.ordem = ordem;
    if (estado !== undefined && estado !== null) valores.estado = estado;

    if (Object.keys(valores).length === 0) {
        const [linha] = await db.select({
            id: servicoModalidade.id,
            servico_id: servicoModalidade.servico_id,
            nome: servicoModalidade.nome,
            faixa_etaria: servicoModalidade.faixa_etaria,
            valor: servicoModalidade.valor,
            ordem: servicoModalidade.ordem,
            estado: servicoModalidade.estado,
            data_criacao: servicoModalidade.data_criacao
        })
            .from(servicoModalidade)
            .where(eq(servicoModalidade.id, id))
            .limit(1);
        return linha || null;
    }

    const [linha] = await db.update(servicoModalidade)
        .set(valores)
        .where(eq(servicoModalidade.id, id))
        .returning({
            id: servicoModalidade.id,
            servico_id: servicoModalidade.servico_id,
            nome: servicoModalidade.nome,
            faixa_etaria: servicoModalidade.faixa_etaria,
            valor: servicoModalidade.valor,
            ordem: servicoModalidade.ordem,
            estado: servicoModalidade.estado,
            data_criacao: servicoModalidade.data_criacao
        });

    return linha || null;
};

const deleteModalidade = async (id) => {
    const [linha] = await db.delete(servicoModalidade)
        .where(eq(servicoModalidade.id, id))
        .returning({ id: servicoModalidade.id });

    return linha || null;
};

// Aplicacoes associadas a um servico
const findAplicacoes = async (servico_id) => {
    return db.select({
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        valor: servico.valor,
        duracao_min: servico.duracao_min,
        categoria_nome: categoriaSalao.nome
    })
        .from(servicoAplicacao)
        .innerJoin(servico, eq(servico.id, servicoAplicacao.aplicacao_id))
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .where(and(eq(servicoAplicacao.servico_id, servico_id), eq(servico.estado, 'Ativo')))
        .orderBy(asc(servico.nome));
};

const associarAplicacao = async (servico_id, aplicacao_id) => {
    await db.insert(servicoAplicacao)
        .values({ servico_id, aplicacao_id })
        .onConflictDoNothing();
};

const desassociarAplicacao = async (servico_id, aplicacao_id) => {
    await db.delete(servicoAplicacao)
        .where(and(eq(servicoAplicacao.servico_id, servico_id), eq(servicoAplicacao.aplicacao_id, aplicacao_id)));
};

const Servico = {
    findAll,
    findById,
    create,
    update,
    updateEstado,
    delete: deleteServico,
    registrarHistoricoPreco,
    findHistoricoPrecos,
    findPublicos,
    findPublicoById,
    findModalidades,
    createModalidade,
    updateModalidade,
    deleteModalidade,
    findAplicacoes,
    associarAplicacao,
    desassociarAplicacao
};

export default Servico;