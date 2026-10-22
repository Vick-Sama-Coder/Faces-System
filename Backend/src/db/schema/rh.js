import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    date,
    time,
    timestamp,
    numeric,
    uniqueIndex,
    check
} from 'drizzle-orm/pg-core';
import { usuario } from './acesso.js';

// Funcionarios do salao. A ligacao a uma conta de acesso e opcional.
export const funcionario = pgTable('funcionario', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    telefone: varchar('telefone', { length: 20 }),
    documento: varchar('documento', { length: 50 }).unique(),
    cargo: varchar('cargo', { length: 100 }),
    data_admissao: date('data_admissao'),
    salario: integer('salario').notNull(),
    comissao_percentual: numeric('comissao_percentual', { precision: 5, scale: 2 }).notNull().default('30.00'),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    id_usuario: integer('id_usuario').unique().references(() => usuario.id),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    check('funcionario_comissao_percentual_check', sql`${table.comissao_percentual} between 0 and 100`)
]);

// Programacao semanal de um funcionario.
export const horarioFuncionario = pgTable('horario_funcionario', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    dia_semana: integer('dia_semana').notNull(),
    hora_entrada: time('hora_entrada').notNull(),
    hora_saida: time('hora_saida').notNull(),
    data_inicio_vigencia: date('data_inicio_vigencia').notNull().default(sql`current_date`),
    data_fim_vigencia: date('data_fim_vigencia'),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('horario_funcionario_dia_semana_check', sql`${table.dia_semana} between 0 and 6`)
]);

// Registo diario de assiduidade.
export const assiduidade = pgTable('assiduidade', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    data: date('data').notNull().default(sql`current_date`),
    hora_entrada_real: time('hora_entrada_real'),
    hora_saida_real: time('hora_saida_real'),
    tipo_ocorrencia: varchar('tipo_ocorrencia', { length: 30 }),
    justificacao: varchar('justificacao', { length: 255 }),
    estado: varchar('estado', { length: 20 }).notNull().default('Registado'),
    registado_por: integer('registado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    uniqueIndex('assiduidade_funcionario_dia_unico').on(table.funcionario_id, table.data)
]);

// Processamento salarial mensal (base + comissoes - deducoes).
export const processamentoSalarial = pgTable('processamento_salarial', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    periodo_inicio: date('periodo_inicio').notNull(),
    periodo_fim: date('periodo_fim').notNull(),
    salario_base: integer('salario_base').notNull().default(0),
    total_comissoes: integer('total_comissoes').notNull().default(0),
    total_deducoes: integer('total_deducoes').notNull().default(0),
    total_a_pagar: integer('total_a_pagar').notNull().default(0),
    estado: varchar('estado', { length: 20 }).notNull().default('Preparado'),
    aprovado_por: integer('aprovado_por').references(() => usuario.id),
    data_aprovacao: timestamp('data_aprovacao'),
    data_pagamento: timestamp('data_pagamento'),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    uniqueIndex('processamento_salarial_periodo_unico')
        .on(table.funcionario_id, table.periodo_inicio, table.periodo_fim)
]);

// Deducoes aplicadas a um processamento.
export const deducaoSalarial = pgTable('deducao_salarial', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    processamento_id: integer('processamento_id').notNull().references(() => processamentoSalarial.id, { onDelete: 'cascade' }),
    tipo: varchar('tipo', { length: 50 }).notNull(),
    descricao: varchar('descricao', { length: 255 }),
    valor: integer('valor').notNull(),
    motivo: varchar('motivo', { length: 255 }),
    aprovado_por: integer('aprovado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('deducao_salarial_valor_check', sql`${table.valor} > 0`)
]);
