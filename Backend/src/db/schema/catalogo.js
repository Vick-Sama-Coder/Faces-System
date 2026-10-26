import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    text,
    boolean,
    timestamp,
    uniqueIndex,
    index,
    check
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';

// Categorias de servicos do salao.
export const categoriaSalao = pgTable('categoria_salao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull()
});

// Catalogo de servicos. O preco base e sempre gravado em inteiros (meticais).
// tipo_servico distingue servicos principais de aplicacoes (ambos vivem na
// mesma tabela, porque as aplicacoes sao servicos do salao).
export const servico = pgTable('servico', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    valor: integer('valor').notNull(),
    duracao_min: integer('duracao_min'),
    // Publico-alvo do servico. Permite separar, por exemplo, o corte de cabelo
    // de adulto do corte de crianca (cada um com o seu preco base).
    faixa_etaria: varchar('faixa_etaria', { length: 20 }).notNull().default('Geral'),
    tipo_preco: varchar('tipo_preco', { length: 20 }).notNull().default('fixo'),
    tipo_servico: varchar('tipo_servico', { length: 20 }).notNull().default('Servico'),
    permite_aplicacoes: boolean('permite_aplicacoes').notNull().default(false),
    elegivel_fidelizacao: boolean('elegivel_fidelizacao').notNull().default(false),
    categoria_id: integer('categoria_id').notNull().references(() => categoriaSalao.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    // Uma aplicacao pode ser gratuita (0 MT), tal como um servico incluido.
    check('servico_valor_check', sql`${table.valor} >= 0`),
    check('servico_tipo_servico_check', sql`${table.tipo_servico} in ('Servico', 'Aplicacao')`),
    check('servico_faixa_etaria_check', sql`${table.faixa_etaria} in ('Geral', 'Adulto', 'Crianca')`),
    // Dois servicos ativos nao podem partilhar o nome (um inativo pode).
    uniqueIndex('servico_nome_ativo_unico')
        .on(sql`lower(${table.nome})`)
        .where(sql`${table.estado} = 'Ativo'`)
]);

// Modalidades de preco de um servico (ex.: adulto/crianca, pintura simples/completa).
// Sao opcionais: um servico simples usa apenas o valor base da tabela servico.
export const servicoModalidade = pgTable('servico_modalidade', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    servico_id: integer('servico_id').notNull().references(() => servico.id),
    nome: varchar('nome', { length: 100 }).notNull(),
    // Geral = aplicavel a qualquer cliente; Adulto/Crianca ajudam o atendimento
    // a filtrar a modalidade pela idade registada no cliente.
    faixa_etaria: varchar('faixa_etaria', { length: 20 }).notNull().default('Geral'),
    valor: integer('valor').notNull(),
    ordem: integer('ordem').notNull().default(0),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    check('servico_modalidade_valor_check', sql`${table.valor} >= 0`),
    check('servico_modalidade_faixa_check', sql`${table.faixa_etaria} in ('Geral', 'Adulto', 'Crianca')`),
    uniqueIndex('servico_modalidade_nome_ativo_unico')
        .on(table.servico_id, sql`lower(${table.nome})`)
        .where(sql`${table.estado} = 'Ativo'`),
    index('servico_modalidade_servico_idx').on(table.servico_id)
]);

// Aplicacoes permitidas por cada servico principal.
// Associar nao aplica automaticamente: apenas disponibiliza a aplicacao no atendimento.
export const servicoAplicacao = pgTable('servico_aplicacao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    servico_id: integer('servico_id').notNull().references(() => servico.id),
    aplicacao_id: integer('aplicacao_id').notNull().references(() => servico.id),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    uniqueIndex('servico_aplicacao_unica').on(table.servico_id, table.aplicacao_id),
    check('servico_aplicacao_distintos_check', sql`${table.servico_id} <> ${table.aplicacao_id}`),
    index('servico_aplicacao_servico_idx').on(table.servico_id),
    index('servico_aplicacao_aplicacao_idx').on(table.aplicacao_id)
]);

// Historico de alteracoes de preco (auditoria e imutabilidade dos atendimentos).
export const historicoPrecoServico = pgTable('historico_preco_servico', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    servico_id: integer('servico_id').notNull().references(() => servico.id),
    valor_anterior: integer('valor_anterior'),
    valor_novo: integer('valor_novo').notNull(),
    alterado_por: integer('alterado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
});

// Categorias de produtos.
export const categoriaProduto = pgTable('categoria_produto', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull()
});

// Produtos usados nas despesas e no controlo de stock.
export const produto = pgTable('produto', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    valor: integer('valor').notNull(),
    categoria_produto_id: integer('categoria_produto_id').notNull().references(() => categoriaProduto.id),
    unidade: varchar('unidade', { length: 20 }).notNull().default('un'),
    stock_minimo: integer('stock_minimo').notNull().default(0),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('produto_valor_check', sql`${table.valor} >= 0`),
    check('produto_stock_minimo_check', sql`${table.stock_minimo} >= 0`)
]);
