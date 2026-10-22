import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    timestamp,
    jsonb,
    index
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';

// Registo de auditoria (append-only). O trigger que bloqueia UPDATE/DELETE
// e criado na migracao de seed, porque o schema Drizzle nao o representa.
export const logAuditoria = pgTable('log_auditoria', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    id_utilizador: integer('id_utilizador').references(() => usuario.id),
    data_hora: timestamp('data_hora').notNull().defaultNow(),
    entidade: varchar('entidade', { length: 50 }).notNull(),
    id_registo_afetado: integer('id_registo_afetado'),
    tipo_operacao: varchar('tipo_operacao', { length: 30 }).notNull(),
    valores_anteriores: jsonb('valores_anteriores'),
    valores_posteriores: jsonb('valores_posteriores'),
    motivo: varchar('motivo', { length: 255 }),
    identificador_operacao: varchar('identificador_operacao', { length: 100 })
}, (table) => [
    index('log_auditoria_entidade_idx').on(table.entidade, table.id_registo_afetado),
    index('log_auditoria_data_idx').on(sql`${table.data_hora} desc`)
]);
