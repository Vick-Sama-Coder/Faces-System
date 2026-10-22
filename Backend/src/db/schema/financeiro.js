import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    text,
    date,
    timestamp,
    uniqueIndex,
    check
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';
import { funcionario } from './rh.js';
import { produto } from './catalogo.js';

// Categorias de despesa (fixa, variavel, produtos, salarios).
export const categoriaDespesa = pgTable('categoria_despesa', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull().unique(),
    tipo: varchar('tipo', { length: 20 }).notNull().default('Variavel'),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
});

// Caixa operacional unico.
export const caixa = pgTable('caixa', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    designacao: varchar('designacao', { length: 100 }).notNull().unique(),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
});

// Sessao de caixa (abertura -> movimentos -> fecho).
export const caixaSessao = pgTable('caixa_sessao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    caixa_id: integer('caixa_id').notNull().references(() => caixa.id),
    data_abertura: timestamp('data_abertura').notNull().defaultNow(),
    saldo_inicial: integer('saldo_inicial').notNull().default(0),
    aberto_por: integer('aberto_por').references(() => usuario.id),
    data_fecho: timestamp('data_fecho'),
    valor_esperado: integer('valor_esperado'),
    valor_contado: integer('valor_contado'),
    diferenca: integer('diferenca'),
    observacoes: text('observacoes'),
    fechado_por: integer('fechado_por').references(() => usuario.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Aberta')
}, (table) => [
    // No maximo uma sessao aberta por caixa.
    uniqueIndex('caixa_sessao_aberta_unica')
        .on(table.caixa_id)
        .where(sql`${table.estado} = 'Aberta'`)
]);

// Movimentos de uma sessao de caixa.
export const movimentoCaixa = pgTable('movimento_caixa', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    id_sessao: integer('id_sessao').notNull().references(() => caixaSessao.id),
    tipo_movimento: varchar('tipo_movimento', { length: 20 }).notNull(),
    valor: integer('valor').notNull(),
    descricao: varchar('descricao', { length: 255 }),
    data_hora: timestamp('data_hora').notNull().defaultNow(),
    origem: varchar('origem', { length: 20 }).notNull(),
    referencia_id: integer('referencia_id'),
    registado_por: integer('registado_por').references(() => usuario.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('movimento_caixa_valor_check', sql`${table.valor} > 0`),
    // Idempotencia por referencia: o mesmo pagamento/despesa gera um so movimento.
    uniqueIndex('movimento_caixa_referencia_unica')
        .on(table.origem, table.referencia_id)
        .where(sql`${table.referencia_id} is not null`)
]);

// Despesa operacional (com ou sem produtos associados).
export const despesa = pgTable('despesa', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    descricao: varchar('descricao', { length: 255 }).notNull(),
    categoria_id: integer('categoria_id').references(() => categoriaDespesa.id),
    valor_total: integer('valor_total').notNull(),
    data_compra: date('data_compra').notNull().default(sql`current_date`),
    metodo_pagamento: varchar('metodo_pagamento', { length: 50 }),
    caixa_sessao_id: integer('caixa_sessao_id').references(() => caixaSessao.id),
    comprovativo: varchar('comprovativo', { length: 255 }),
    registado_por: integer('registado_por').references(() => usuario.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('despesa_valor_total_check', sql`${table.valor_total} > 0`)
]);

// Produtos comprados numa despesa.
export const itemProduto = pgTable('item_produto', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    produto_id: integer('produto_id').notNull().references(() => produto.id),
    despesa_id: integer('despesa_id').notNull().references(() => despesa.id),
    funcionario_id: integer('funcionario_id').references(() => funcionario.id),
    quantidade: integer('quantidade').notNull(),
    preco_unitario: integer('preco_unitario').notNull(),
    valor_total: integer('valor_total').notNull()
}, (table) => [
    check('item_produto_quantidade_check', sql`${table.quantidade} > 0`),
    check('item_produto_preco_unitario_check', sql`${table.preco_unitario} >= 0`),
    check('item_produto_valor_total_check', sql`${table.valor_total} >= 0`)
]);
