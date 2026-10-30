-- Logs de segurança
-- Registam acontecimentos relacionados com autenticação, permissões e possíveis tentativas de ataque.
-- Exemplos: várias senhas incorretas, conta bloqueada, acesso negado ou alteração de permissões.
-- Respondem: houve alguma atividade suspeita ou tentativa de acesso indevido?

create table if not exists log_seguranca(
    id int primary key generated always as identity,
    data_hora timestamp not null default now(),
    tipo_evento varchar(50) not null,       -- login_falho, login_sucesso, acesso_negado, conta_bloqueada, tentativa_brute_force
    ip_address inet,                         -- endereço IP da tentativa
    user_agent text,                         -- user agent do cliente
    motivo varchar(255),                     -- motivo do evento
    sucesso boolean not null default true, -- se a operação foi bem-sucedida
    referencia_generica varchar(100)       -- referencia geral para associar evento (id registro, descricao, etc)
);

create index if not exists log_seguranca_data_idx
    on log_seguranca (data_hora desc);

create index if not exists log_seguranca_tipo_idx
    on log_seguranca (tipo_evento);

create index if not exists log_seguranca_referencia_idx
    on log_seguranca (referencia_generica);