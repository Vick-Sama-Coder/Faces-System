import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    timestamp,
    index,
    check
} from 'drizzle-orm/pg-core';
import { cliente } from './clientes.js';
import { servico, servicoModalidade } from './catalogo.js';
import { usuario } from './acesso.js';

// Agendamento pre-pago: o cliente compra um conjunto de servicos e usa o saldo
// quando quiser. O pagamento e registado no cabecalho e a receita e reconhecida
// nesse momento; a comissao e a fidelizacao so sao geradas na execucao.
export const agendamento = pgTable('agendamento', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    cliente_id: integer('cliente_id').notNull().references(() => cliente.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Aberto'),
    valor_total: integer('valor_total').notNull().default(0),
    observacoes: varchar('observacoes', { length: 255 }),
    registado_por: integer('registado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow(),
    motivo_anulacao: varchar('motivo_anulacao', { length: 255 })
}, (table) => [
    check('agendamento_estado_check', sql`${table.estado} in ('Aberto', 'Concluido', 'Anulado')`),
    check('agendamento_valor_total_check', sql`${table.valor_total} >= 0`),
    index('agendamento_cliente_idx').on(table.cliente_id),
    index('agendamento_estado_idx').on(table.estado)
]);

// Servicos comprados no agendamento. Cada linha guarda a quantidade adquirida,
// a quantidade ja consumida e a quantidade cancelada (reembolsada).
export const agendamentoServico = pgTable('agendamento_servico', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    agendamento_id: integer('agendamento_id').notNull().references(() => agendamento.id),
    cliente_id: integer('cliente_id').notNull().references(() => cliente.id),
    servico_id: integer('servico_id').notNull().references(() => servico.id),
    modalidade_id: integer('modalidade_id').references(() => servicoModalidade.id),
    modalidade_nome: varchar('modalidade_nome', { length: 100 }),
    tipo_servico: varchar('tipo_servico', { length: 20 }).notNull().default('Servico'),
    preco_unitario: integer('preco_unitario').notNull(),
    quantidade: integer('quantidade').notNull().default(1),
    quantidade_consumida: integer('quantidade_consumida').notNull().default(0),
    quantidade_cancelada: integer('quantidade_cancelada').notNull().default(0),
    registado_por: integer('registado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('agendamento_servico_preco_check', sql`${table.preco_unitario} > 0`),
    check('agendamento_servico_quantidade_check', sql`${table.quantidade} > 0`),
    check('agendamento_servico_consumida_check', sql`${table.quantidade_consumida} >= 0`),
    check('agendamento_servico_cancelada_check', sql`${table.quantidade_cancelada} >= 0`),
    check(
        'agendamento_servico_saldo_check',
        sql`${table.quantidade_consumida} + ${table.quantidade_cancelada} <= ${table.quantidade}`
    ),
    check('agendamento_servico_tipo_check', sql`${table.tipo_servico} in ('Servico', 'Aplicacao')`),
    index('agendamento_servico_agendamento_idx').on(table.agendamento_id),
    index('agendamento_servico_servico_idx').on(table.servico_id)
]);

// Reembolso de valores pagos por servicos cancelados antes do consumo.
// Cada reembolso gera uma saida de caixa com referencia a este registo.
export const agendamentoReembolso = pgTable('agendamento_reembolso', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    agendamento_id: integer('agendamento_id').notNull().references(() => agendamento.id),
    valor: integer('valor').notNull(),
    metodo_pagamento: varchar('metodo_pagamento', { length: 50 }).notNull(),
    motivo: varchar('motivo', { length: 255 }).notNull(),
    registado_por: integer('registado_por').references(() => usuario.id),
    data_hora: timestamp('data_hora').notNull().defaultNow()
}, (table) => [
    check('agendamento_reembolso_valor_check', sql`${table.valor} > 0`),
    index('agendamento_reembolso_agendamento_idx').on(table.agendamento_id)
]);
