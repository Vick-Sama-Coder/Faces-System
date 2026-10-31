import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    timestamp,
    date,
    numeric,
    boolean,
    uniqueIndex,
    index,
    check
} from 'drizzle-orm/pg-core';
import { cliente } from './clientes.js';
import { servico, servicoModalidade } from './catalogo.js';
import { funcionario } from './rh.js';
import { usuario } from './acesso.js';

// Cabecalho do atendimento; os totais sao derivados dos servicos.
export const atendimento = pgTable('atendimento', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    cliente_id: integer('cliente_id').notNull().references(() => cliente.id),
    data_hora: timestamp('data_hora').notNull().defaultNow(),
    estado: varchar('estado', { length: 20 }).notNull().default('Em andamento'),
    valor_bruto: integer('valor_bruto').notNull().default(0),
    valor_desconto: integer('valor_desconto').notNull().default(0),
    valor_total: integer('valor_total').notNull().default(0),
    registado_por: integer('registado_por').references(() => usuario.id),
    motivo_anulacao: varchar('motivo_anulacao', { length: 255 })
});

// Servicos e aplicacoes realizados num atendimento. O preco fica gravado na
// transacao, para que alteracoes futuras ao catalogo nao reescrevam o historico.
// servico_principal_id liga uma aplicacao ao servico principal correspondente.
export const atendimentoServico = pgTable('atendimento_servico', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    atendimento_id: integer('atendimento_id').notNull().references(() => atendimento.id),
    // Cliente a quem pertence esta linha. O cabecalho mantem cliente_id como
    // cliente principal (compatibilidade), mas cada servico pode pertencer a
    // um cliente diferente do mesmo atendimento.
    cliente_id: integer('cliente_id').notNull().references(() => cliente.id),
    servico_id: integer('servico_id').notNull().references(() => servico.id),
    servico_principal_id: integer('servico_principal_id').references(() => atendimentoServico.id),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    modalidade_id: integer('modalidade_id').references(() => servicoModalidade.id),
    modalidade_nome: varchar('modalidade_nome', { length: 100 }),
    tipo_servico: varchar('tipo_servico', { length: 20 }).notNull().default('Servico'),
    preco_original: integer('preco_original').notNull(),
    tipo_preco: varchar('tipo_preco', { length: 20 }),
    valor_desconto: integer('valor_desconto').notNull().default(0),
    valor_final: integer('valor_final').notNull(),
    // Servico escolhido explicitamente pelo utilizador para contar para a
    // fidelizacao do cliente. No maximo uma linha por cliente/atendimento.
    fidelizacao_selecionada: boolean('fidelizacao_selecionada').notNull().default(false),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    registado_por: integer('registado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('atendimento_servico_preco_original_check', sql`${table.preco_original} >= 0`),
    check('atendimento_servico_valor_desconto_check', sql`${table.valor_desconto} >= 0`),
    check('atendimento_servico_tipo_check', sql`${table.tipo_servico} in ('Servico', 'Aplicacao')`),
    index('atendimento_servico_atendimento_idx').on(table.atendimento_id),
    index('atendimento_servico_cliente_idx').on(table.cliente_id),
    // Um cliente so pode ter um servico selecionado para fidelizacao no
    // mesmo atendimento.
    uniqueIndex('atendimento_servico_fidelizacao_unica')
        .on(table.atendimento_id, table.cliente_id)
        .where(sql`${table.fidelizacao_selecionada} = true`)
]);

// Registo das operacoes de desconto aplicadas a um atendimento.
// O estado financeiro continua nas linhas de atendimento_servico; esta tabela
// preserva o historico de cada operacao (tipo, base, valor efetivo e autor).
export const descontoAtendimento = pgTable('desconto_atendimento', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    atendimento_id: integer('atendimento_id').notNull().references(() => atendimento.id),
    atendimento_servico_id: integer('atendimento_servico_id').notNull().references(() => atendimentoServico.id),
    escopo: varchar('escopo', { length: 20 }).notNull().default('Servico'),
    tipo: varchar('tipo', { length: 20 }).notNull(),
    percentagem: numeric('percentagem', { precision: 5, scale: 2 }),
    valor_bruto: integer('valor_bruto').notNull(),
    valor_desconto: integer('valor_desconto').notNull(),
    valor_final: integer('valor_final').notNull(),
    aplicado_por: integer('aplicado_por').references(() => usuario.id),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('desconto_atendimento_tipo_check', sql`${table.tipo} in ('Percentagem', 'Valor')`),
    check('desconto_atendimento_escopo_check', sql`${table.escopo} in ('Servico', 'Atendimento')`),
    check('desconto_atendimento_valor_check', sql`${table.valor_desconto} >= 0`),
    check('desconto_atendimento_bruto_check', sql`${table.valor_bruto} >= 0`),
    check('desconto_atendimento_final_check', sql`${table.valor_final} >= 0`),
    check('desconto_atendimento_percentagem_check', sql`${table.percentagem} is null or ${table.percentagem} between 0 and 100`),
    index('desconto_atendimento_atendimento_idx').on(table.atendimento_id)
]);

// Pagamento de um atendimento (1 atendimento -> n pagamentos).
export const pagamento = pgTable('pagamento', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    atendimento_id: integer('atendimento_id').notNull().references(() => atendimento.id),
    valor_total: integer('valor_total').notNull(),
    estado: varchar('estado', { length: 20 }).notNull().default('Pendente'),
    data_hora: timestamp('data_hora').notNull().defaultNow(),
    registado_por: integer('registado_por').references(() => usuario.id),
    motivo_anulacao: varchar('motivo_anulacao', { length: 255 })
}, (table) => [
    check('pagamento_valor_total_check', sql`${table.valor_total} >= 0`)
]);

// Parcelas de um pagamento (permite dividir por varios metodos).
export const pagamentoParcela = pgTable('pagamento_parcela', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    pagamento_id: integer('pagamento_id').notNull().references(() => pagamento.id),
    metodo_pagamento: varchar('metodo_pagamento', { length: 50 }).notNull(),
    valor: integer('valor').notNull(),
    referencia: varchar('referencia', { length: 100 }),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('pagamento_parcela_valor_check', sql`${table.valor} > 0`)
]);

// Configuracao de comissao por funcionario/servico.
// servico_id nulo = taxa geral do funcionario.
export const comissaoConfig = pgTable('comissao_config', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    servico_id: integer('servico_id').references(() => servico.id),
    taxa_percentual: numeric('taxa_percentual', { precision: 5, scale: 2 }).notNull(),
    vigencia_inicio: date('vigencia_inicio').notNull().default(sql`current_date`),
    vigencia_fim: date('vigencia_fim'),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
}, (table) => [
    check('comissao_config_taxa_check', sql`${table.taxa_percentual} between 0 and 100`)
]);

// Comissao gerada por um servico liquidado. O unique garante idempotencia.
export const comissao = pgTable('comissao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    atendimento_servico_id: integer('atendimento_servico_id').notNull().unique().references(() => atendimentoServico.id),
    funcionario_id: integer('funcionario_id').notNull().references(() => funcionario.id),
    taxa: numeric('taxa', { precision: 5, scale: 2 }).notNull(),
    base_calculo: integer('base_calculo').notNull(),
    valor_comissao: integer('valor_comissao').notNull(),
    estado: varchar('estado', { length: 20 }).notNull().default('Elegivel'),
    criado_em: timestamp('criado_em').notNull().defaultNow()
}, (table) => [
    check('comissao_taxa_check', sql`${table.taxa} between 0 and 100`)
]);
