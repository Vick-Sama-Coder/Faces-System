import {
    pgTable,
    integer,
    varchar
} from 'drizzle-orm/pg-core';

// Tabela legada sem uso actual; mantida para nao perder o historico do modelo.
export const aplicacao = pgTable('aplicacao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull()
});
