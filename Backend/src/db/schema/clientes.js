import {
    pgTable,
    integer,
    varchar,
    date,
    timestamp
} from 'drizzle-orm/pg-core';

// Clientes do salao.
export const cliente = pgTable('cliente', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    apelido: varchar('apelido', { length: 100 }),
    telefone: integer('telefone').notNull().unique(),
    endereco: varchar('endereco', { length: 255 }),
    data_nascimento: date('data_nascimento'),
    data_registo: timestamp('data_registo').notNull().defaultNow(),
    saldo_pendente: integer('saldo_pendente').notNull().default(0),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
});
