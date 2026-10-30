import db from '../db/client.js';
import LogRepository from '../repository/logs.js';

// ===== LOG TÉCNICO =====

export const registrarLogTecnico = async ({ modulo, mensagem, nivel = 'info', detalhes, duracao_ms, request_id }) => {
  await LogRepository.insertTecnico(db, {
    modulo,
    mensagem,
    nivel,
    detalhes,
    duracao_ms,
    request_id
  });
};

export const registrarLogTecnicoComExecutor = async ({ modulo, mensagem, nivel = 'info', detalhes, duracao_ms, request_id }, executor) => {
  await LogRepository.insertTecnico(executor, {
    modulo,
    mensagem,
    nivel,
    detalhes,
    duracao_ms,
    request_id
  });
};

// Buscar logs técnicos com filtros
export const obterLogsTecnico = async ({ modulo, nivel, de, ate, busca = 'tudo' }) => {
  return await LogRepository.findTecnico({ modulo, nivel, de, ate, busca });
};

// ===== LOG SEGURANÇA =====

export const registrarLogSeguranca = async ({ tipo_evento, ip_address, user_agent, motivo, sucesso }) => {
  await LogRepository.insertSeguranca(db, {
    tipo_evento,
    ip_address,
    user_agent,
    motivo,
    sucesso
  });
};

export const registrarLogSegurancaComExecutor = async ({ tipo_evento, ip_address, user_agent, motivo, sucesso }, executor) => {
  await LogRepository.insertSeguranca(executor, {
    tipo_evento,
    ip_address,
    user_agent,
    motivo,
    sucesso
  });
};

// Buscar logs de segurança com filtros
// busca pode ser: 'tudo', 'perfil', 'operacoes', 'utilizadores', ou termo de pesquisa
export const obterLogsSeguranca = async ({ tipo_evento, de, ate, busca = 'tudo' }) => {
  return await LogRepository.findSeguranca({ tipo_evento, de, ate, busca });
};

// ===== LOG OPERAÇÕES =====

export const registrarLogOperacoes = async ({ tipo_operacao, modulo, descricao, duracao_ms, status_codigo, sucesso, request_id, referencia_generica }) => {
  await LogRepository.insertOperacoes(db, {
    tipo_operacao,
    modulo,
    descricao,
    duracao_ms,
    status_codigo,
    sucesso,
    request_id,
    referencia_generica
  });
};

export const registrarLogOperacoesComExecutor = async ({ tipo_operacao, modulo, descricao, duracao_ms, status_codigo, sucesso, request_id, referencia_generica }, executor) => {
  await LogRepository.insertOperacoes(executor, {
    tipo_operacao,
    modulo,
    descricao,
    duracao_ms,
    status_codigo,
    sucesso,
    request_id,
    referencia_generica
  });
};

// Buscar logs de operações com filtros abrangentes
// Filtros disponíveis:
// - tudo: todos os logs
// - perfil: filtrar por referência/perfil (via referencia_generica)
// - operacoes: filtrar por tipo de operação
// - utilizadores: filtrar por referência de utilizador
// - detalhe da operacao: buscar por descrição
export const obterLogsOperacoes = async ({ tipo_operacao, modulo, de, ate, busca = 'tudo' }) => {
  return await LogRepository.findOperacoes({ tipo_operacao, modulo, de, ate, busca });
};