import db from '../db/client.js';
import { logTecnico, logSeguranca, logOperacoes } from '../db/schema/logs.js';
import { eq, sql, and, ilike } from 'drizzle-orm';

// ===== LOG TÉCNICO =====

const insertTecnico = async (executor, { modulo, mensagem, nivel = 'info', detalhes, duracao_ms, request_id }) => {
  const [linha] = await executor.insert(logTecnico).values({
    modulo,
    mensagem,
    nivel,
    detalhes,
    duracao_ms,
    request_id
  }).returning({ id: logTecnico.id });

  return linha.id;
};

const findTecnico = async ({ modulo, nivel, de,ate, busca }) => {
  const condicoes = [];

  if (modulo) condicoes.push(eq(logTecnico.modulo, modulo));
  if (nivel) condicoes.push(eq(logTecnico.nivel, nivel));
  if (de) condicoes.push(sql`${logTecnico.data_hora}::date >= ${de}`);
  if (ate) condicoes.push(sql`${logTecnico.data_hora}::date <= ${ate}`);
  if (busca) {
    condicoes.push(
      ilike(logTecnico.mensagem, `%${busca}%)`)
    );
  }

  return db.select({
    id: logTecnico.id,
    data_hora: logTecnico.data_hora,
    nivel: logTecnico.nivel,
    modulo: logTecnico.modulo,
    mensagem: logTecnico.mensagem,
    duracao_ms: logTecnico.duracao_ms,
    request_id: logTecnico.request_id
  })
    .from(logTecnico)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(logTecnico.data_hora), desc(logTecnico.id));
};

// ===== LOG SEGURANÇA =====

const insertSeguranca = async (executor, { tipo_evento, ip_address, user_agent, motivo, sucesso }) => {
  const [linha] = await executor.insert(logSeguranca).values({
    tipo_evento,
    ip_address: ip_address ?? null,
    user_agent: user_agent ?? null,
    motivo: motivo ?? null,
    sucesso
  }).returning({ id: logSeguranca.id });

  return linha.id;
};

const findSeguranca = async ({ tipo_evento, de, ate, busca }) => {
  const condicoes = [];

  if (tipo_evento) condicoes.push(eq(logSeguranca.tipo_evento, tipo_evento));
  if (de) condicoes.push(sql`${logSeguranca.data_hora}::date >= ${de}`);
  if (ate) condicoes.push(sql`${logSeguranca.data_hora}::date <= ${ate}`);
  if (busca) {
    condicoes.push(
      ilike(logSeguranca.motivo, `%${busca}%`))
    
  }

  return db.select({
    id: logSeguranca.id,
    data_hora: logSeguranca.data_hora,
    tipo_evento: logSeguranca.tipo_evento,
    ip_address: logSeguranca.ip_address,
    sucesso: logSeguranca.sucesso,
    motivo: logSeguranca.motivo,
    referencia_generica: logSeguranca.referencia_generica
  })
    .from(logSeguranca)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(logSeguranca.data_hora), desc(logSeguranca.id));
};

// ===== LOG OPERAÇÕES =====

const insertOperacoes = async (executor, { tipo_operacao, modulo, descricao, duracao_ms, status_codigo, sucesso, request_id, referencia_generica }) => {
  const [linha] = await executor.insert(logOperacoes).values({
    tipo_operacao,
    modulo,
    descricao,
    duracao_ms,
    status_codigo,
    sucesso,
    request_id,
    referencia_generica: referencia_generica ?? null
  }).returning({ id: logOperacoes.id });

  return linha.id;
};

const findOperacoes = async ({ tipo_operacao, modulo, de, ate, busca }) => {
  const condicoes = [];

  if (tipo_operacao) condicoes.push(eq(logOperacoes.tipo_operacao, tipo_operacao));
  if (modulo) condicoes.push(eq(logOperacoes.modulo, modulo));
  if (de) condicoes.push(sql`${logOperacoes.data_hora}::date >= ${de}`);
  if (ate) condicoes.push(sql`${logOperacoes.data_hora}::date <= ${ate}`);
  if (busca) {
    condicoes.push(
      ilike(logOperacoes.descricao, `%${busca}%`))
    
  }

  return db.select({
    id: logOperacoes.id,
    data_hora: logOperacoes.data_hora,
    tipo_operacao: logOperacoes.tipo_operacao,
    modulo: logOperacoes.modulo,
    descricao: logOperacoes.descricao,
    duracao_ms: logOperacoes.duracao_ms,
    status_codigo: logOperacoes.status_codigo,
    sucesso: logOperacoes.sucesso,
    referencia_generica: logOperacoes.referencia_generica
  })
    .from(logOperacoes)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(logOperacoes.data_hora), desc(logOperacoes.id));
};

const LogRepository = {
  // Técnico
  insertTecnico,
  findTecnico,

  // Seguranca
  insertSeguranca,
  findSeguranca,

  // Operacoes
  insertOperacoes,
  findOperacoes
};

export default LogRepository;