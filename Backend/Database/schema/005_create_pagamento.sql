-- Pagamento de um atendimento (1 atendimento -> n pagamentos).
-- As FKs atendimento_id e registado_por sao adicionadas em 023 (atendimento em 006,
-- usuario em 014), por isso nao sao declaradas aqui.
create table if not exists pagamento(
    id int primary key generated always as identity,
    atendimento_id int not null,
    valor_total int not null check (valor_total >= 0),
    estado varchar(20) not null default 'Pendente',   -- Pendente | Parcial | Liquidado | Anulado
    data_hora timestamp not null default now(),
    registado_por int,
    motivo_anulacao varchar(255)
);
