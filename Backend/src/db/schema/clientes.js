import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    date,
    timestamp,
    check
} from 'drizzle-orm/pg-core';

// Clientes do salao.
export const cliente = pgTable('cliente', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    apelido: varchar('apelido', { length: 100 }),
    telefone: integer('telefone').notNull(),
    endereco: varchar('endereco', { length: 255 }),
    data_nascimento: date('data_nascimento'),
    // Idade declarada no cadastro. Permite escolher precos de adulto/crianca.
    // A classificacao e derivada: >= 18 anos = Adulto, < 18 = Crianca.
    idade: integer('idade'),
    // 'M' = Masculino, 'F' = Feminino — apenas clientes masculinos podem ter cartão de fidelização
    sexo: varchar('sexo', { length: 1 }),
    data_registo: timestamp('data_registo').notNull().defaultNow(),
    saldo_pendente: integer('saldo_pendente').notNull().default(0),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('cliente_idade_check', sql`${table.idade} is null or (${table.idade} >= 0 and ${table.idade} <= 120)`)
]);