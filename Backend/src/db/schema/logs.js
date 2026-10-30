export const logTecnico = {
  tableName: 'log_tecnico',
  columns: {
    id: { type: 'serial', primaryKey: true },
    data_hora: { type: 'timestamp', notNull: true, default: 'now()' },
    nivel: { type: 'varchar(20)', notNull: true },
    modulo: { type: 'varchar(50)', notNull: true },
    mensagem: { type: 'text', notNull: true },
    detalhes: { type: 'jsonb' },
    duracao_ms: { type: 'integer' },
    request_id: { type: 'varchar(100)' }
  }
};

export const logSeguranca = {
  tableName: 'log_seguranca',
  columns: {
    id: { type: 'serial', primaryKey: true },
    data_hora: { type: 'timestamp', notNull: true, default: 'now()' },
    tipo_evento: { type: 'varchar(50)', notNull: true },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    motivo: { type: 'varchar(255)' },
    sucesso: { type: 'boolean', notNull: true, default: true },
    referencia_generica: { type: 'varchar(100)' }
  }
};

export const logOperacoes = {
  tableName: 'log_operacoes',
  columns: {
    id: { type: 'serial', primaryKey: true },
    data_hora: { type: 'timestamp', notNull: true, default: 'now()' },
    tipo_operacao: { type: 'varchar(50)', notNull: true },
    modulo: { type: 'varchar(50)', notNull: true },
    descricao: { type: 'text' },
    duracao_ms: { type: 'integer', notNull: true },
    status_codigo: { type: 'smallint' },
    sucesso: { type: 'boolean', notNull: true, default: true },
    request_id: { type: 'varchar(100)' },
    referencia_generica: { type: 'varchar(100)' }
  }
};