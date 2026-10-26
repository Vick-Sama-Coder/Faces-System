import { sql } from 'drizzle-orm';
import {
    pgTable,
    integer,
    varchar,
    boolean,
    timestamp,
    uniqueIndex,
    primaryKey,
    check,
    index
} from 'drizzle-orm/pg-core';

// Perfis de acesso (Administrador, Usuario, Auditor).
export const perfil = pgTable('perfil', {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: varchar('descricao', { length: 255 }),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo')
});

// Contas de acesso. O login e feito pelo nome (unico, case-insensitive).
export const usuario = pgTable('usuario', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar('nome', { length: 100 }).notNull(),
    senha: varchar('senha', { length: 100 }).notNull(),
    telefone: integer('telefone').notNull().unique(),
    id_perfil: integer('id_perfil').notNull().references(() => perfil.id),
    estado: varchar('estado', { length: 20 }).notNull().default('Ativo'),
    alteracao_obrigatoria_senha: boolean('alteracao_obrigatoria_senha').notNull().default(false),
    ultimo_acesso: timestamp('ultimo_acesso'),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    uniqueIndex('usuario_nome_unico_idx').on(sql`lower(${table.nome})`)
]);

// Catalogo de acoes autorizaveis (codigo "modulo:acao").
export const permissao = pgTable('permissao', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    codigo: varchar('codigo', { length: 60 }).notNull().unique(),
    descricao: varchar('descricao', { length: 255 }).notNull(),
    modulo: varchar('modulo', { length: 50 }).notNull()
});

// Permissoes padrao de cada perfil.
export const perfilPermissao = pgTable('perfil_permissao', {
    id_perfil: integer('id_perfil').notNull().references(() => perfil.id, { onDelete: 'cascade' }),
    id_permissao: integer('id_permissao').notNull().references(() => permissao.id, { onDelete: 'cascade' })
}, (table) => [
    primaryKey({ columns: [table.id_perfil, table.id_permissao] })
]);

// Excecoes individuais (conceder/revogar) sobre as permissoes do perfil.
export const usuarioPermissao = pgTable('usuario_permissao', {
    id_usuario: integer('id_usuario').notNull().references(() => usuario.id, { onDelete: 'cascade' }),
    id_permissao: integer('id_permissao').notNull().references(() => permissao.id, { onDelete: 'cascade' }),
    efeito: varchar('efeito', { length: 10 }).notNull()
}, (table) => [
    primaryKey({ columns: [table.id_usuario, table.id_permissao] }),
    check('usuario_permissao_efeito_check', sql`${table.efeito} in ('conceder', 'revogar')`)
]);

// Tabela legada: o fluxo de recuperacao de senha por telefone foi removido.
// Mantida apenas para compatibilidade com bases de dados existentes.
export const recuperacaoSenha = pgTable('recuperacao_senha', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    id_usuario: integer('id_usuario').notNull().references(() => usuario.id, { onDelete: 'cascade' }),
    codigo_hash: varchar('codigo_hash', { length: 100 }).notNull(),
    expira_em: timestamp('expira_em').notNull(),
    usado: boolean('usado').notNull().default(false),
    tentativas: integer('tentativas').notNull().default(0),
    data_criacao: timestamp('data_criacao').notNull().defaultNow()
}, (table) => [
    index('recuperacao_senha_usuario_idx').on(table.id_usuario, table.usado, table.expira_em)
]);
