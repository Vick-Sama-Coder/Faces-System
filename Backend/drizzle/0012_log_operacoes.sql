-- Logs de operações e desempenho
-- Registam informações sobre pedidos, duração das operações e disponibilidade dos serviços.
-- Exemplos: uma requisição demorou 4 segundos, uma rota devolveu erro 500 ou uma consulta demorou demasiado.
-- Respondem: a aplicação está a funcionar bem e com que rapidez?

create table if not exists log_operacoes(
    id int primary key generated always as identity,
    data_hora timestamp not null default now(),
    tipo_operacao varchar(50) not null,      -- requisicao_http, consulta_bd, processo_fundo
    modulo varchar(50) not null,             -- qual módulo da aplicação
    descricao text,                          -- descrição do evento
    duracao_ms integer not null,             -- duração em milissegundos
    status_codigo smallint,                  -- código de status HTTP ou resultado
    sucesso boolean not null default true,
    request_id varchar(100),                 -- ID da requisição HTTP para rastreio
    referencia_generica varchar(100)       -- referencia geral para associar operacao (id registro, descricao, etc)
);

create index if not exists log_operacoes_data_idx
    on log_operacoes (data_hora desc);

create index if not exists log_operacoes_tipo_idx
    on log_operacoes (tipo_operacao);

create index if not exists log_operacoes_modulo_idx
    on log_operacoes (modulo);

create index if not exists log_operacoes_duracao_idx
    on log_operacoes (duracao_ms desc);

create index if not exists log_operacoes_referencia_idx
    on log_operacoes (referencia_generica);