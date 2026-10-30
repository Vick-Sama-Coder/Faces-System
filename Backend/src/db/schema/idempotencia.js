import {
    pgTable,
    integer,
    varchar,
    timestamp,
    jsonb,
    uniqueIndex,
    index
} from 'drizzle-orm/pg-core';

// Cache de respostas de escritas idempotentes.
// A fila offline do frontend reenvia a mesma Idempotency-Key quando a rede
// falha; esta tabela garante que o pedido e aplicado uma unica vez.
export const requisicaoIdempotencia = pgTable('requisicao_idempotencia', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    chave: varchar('chave', { length: 120 }).notNull(),
    metodo: varchar('metodo', { length: 10 }).notNull(),
    caminho: varchar('caminho', { length: 500 }).notNull(),
    id_utilizador: integer('id_utilizador'),
    estado: varchar('estado', { length: 20 }).notNull().default('em_processamento'),
    status_code: integer('status_code'),
    resposta: jsonb('resposta'),
    criado_em: timestamp('criado_em').notNull().defaultNow(),
    atualizado_em: timestamp('atualizado_em').notNull().defaultNow()
}, (table) => [
    uniqueIndex('requisicao_idempotencia_chave_uidx').on(table.chave),
    index('requisicao_idempotencia_criado_idx').on(table.criado_em)
]);
