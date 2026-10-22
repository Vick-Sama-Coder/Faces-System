import {
    pgTable,
    integer,
    varchar,
    timestamp,
    uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { cliente } from './clientes.js';
import { atendimentoServico } from './atendimentos.js';
import { usuario } from './acesso.js';

// Cartao de fidelizacao: um por cliente.
export const cartaoFidelizacao = pgTable('cartao_fidelizacao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    cliente_id: integer('cliente_id').notNull().unique().references(() => cliente.id),
    data_ativacao: timestamp('data_ativacao').notNull().defaultNow(),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
});

// Movimentos do cartao: marca, beneficio_ganho, beneficio_utilizado, correcao.
export const movimentoFidelizacao = pgTable('movimento_fidelizacao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    cartao_id: integer('cartao_id').notNull().references(() => cartaoFidelizacao.id),
    atendimento_servico_id: integer('atendimento_servico_id').references(() => atendimentoServico.id),
    tipo_movimento: varchar('tipo_movimento', { length: 30 }).notNull(),
    data_hora: timestamp('data_hora').notNull().defaultNow(),
    ciclo: integer('ciclo').notNull().default(1),
    registado_por: integer('registado_por').references(() => usuario.id),
    observacao: varchar('observacao', { length: 255 })
}, (table) => [
    // Idempotencia: cada servico gera no maximo um movimento de cada tipo.
    uniqueIndex('movimento_fidelizacao_servico_tipo_unico')
        .on(table.atendimento_servico_id, table.tipo_movimento)
        .where(sql`${table.atendimento_servico_id} is not null`)
]);
