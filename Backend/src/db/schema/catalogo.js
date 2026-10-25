import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    text,
    boolean,
    timestamp,
    uniqueIndex,
    check
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';

// Categorias de servicos do salao.
export const categoriaSalao = pgTable('categoria_salao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull()
});

// Catalogo de servicos. O preco e sempre gravado em inteiros (meticais).
export const servico = pgTable('servico', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    valor: integer('valor').notNull(),
    duracao_min: integer('duracao_min'),
    tipo_preco: varchar('tipo_preco', { length: 20 }).notNull().default('fixo'),
    // marcado manualmente; a aplicacao so permite valores ate 200 MT
    elegivel_fidelizacao: boolean('elegivel_fidelizacao').notNull().default(false),
    categoria_id: integer('categoria_id').notNull().references(() => categoriaSalao.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    check('servico_valor_check', sql`${table.valor} > 0`),
    // Dois servicos ativos nao podem partilhar o nome (um inativo pode).
    uniqueIndex('servico_nome_ativo_unico')
        .on(sql`lower(${table.nome})`)
        .where(sql`${table.estado} = 'Ativo'`)
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

// Produtos usados nas despesas.
export const produto = pgTable('produto', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    valor: integer('valor').notNull(),
    categoria_produto_id: integer('categoria_produto_id').notNull().references(() => categoriaProduto.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('produto_valor_check', sql`${table.valor} >= 0`)
]);
