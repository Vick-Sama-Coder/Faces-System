-- Logs técnicos (Application Logs)
-- Registam o comportamento interno da aplicação, sobretudo erros e problemas técnicos.
-- Exemplos: falha ao conectar à base de dados, erro ao enviar SMS, exceção numa rota do Express.
-- Respondem: o que aconteceu tecnicamente e porquê?

create table if not exists log_tecnico(
    id int primary key generated always as identity,
    data_hora timestamp not null default now(),
    nivel varchar(20) not null,          -- error, warn, info, debug
    modulo varchar(50) not null,         -- qual parte da aplicação gerou o log
    mensagem text not null,              -- descrição do evento
    detalhes jsonb,                      -- detalhes adicionais (stack, parâmetros, etc)
    duracao_ms integer,                  -- duração da operação em ms (se aplicável)
    request_id varchar(100)              -- ID da requisição HTTP para rastreio
);

create index if not exists log_tecnico_data_idx
    on log_tecnico (data_hora desc);

create index if not exists log_tecnico_modulo_idx
    on log_tecnico (modulo);

create index if not exists log_tecnico_nivel_idx
    on log_tecnico (nivel);