// Movimentos de stock: entradas, saídas e ajustes manuais
import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    date,
    timestamp,
    uniqueIndex,
    index,
    check
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';
import * as catalogo from './catalogo.js';
import * as financeiro from './financeiro.js';

export const movimentoEstoque = pgTable('movimento_estoque', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    produto_id: integer('produto_id').notNull().references(() => catalogo.produto.id),
    tipo: varchar('tipo', { length: 20 }).notNull(),
    quantidade: integer('quantidade').notNull(),
    motivo: varchar('motivo', { length: 100 }),
    data_movimento: date('data_movimento').notNull().default(sql`current_date`),
    registado_por: integer('registado_por').references(() => usuario.id),
    despesa_id: integer('despesa_id').references(() => financeiro.despesa.id),
    created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => [
    index('movimento_estoque_produto_idx').on(table.produto_id),
    index('movimento_estoque_tipo_idx').on(table.tipo),
    index('movimento_estoque_data_idx').on(table.data_movimento),
    index('movimento_estoque_despesa_idx').on(table.despesa_id)
]);
