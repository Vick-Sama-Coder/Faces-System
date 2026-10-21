-- Registo de auditoria (append-only). Guarda as operacoes relevantes com
-- utilizador, data/hora e valores antes/depois (RF23/RN21/RNF03).
-- A aplicacao nunca faz UPDATE/DELETE: um trigger bloqueia-o ao nivel da BD.
create table if not exists log_auditoria(
    id int primary key generated always as identity,
    id_utilizador int,
    data_hora timestamp not null default now(),
    entidade varchar(50) not null,
    id_registo_afetado int,
    tipo_operacao varchar(30) not null,       -- criar | atualizar | anular | aprovar | pagar | corrigir | ...
    valores_anteriores jsonb,
    valores_posteriores jsonb,
    motivo varchar(255),
    identificador_operacao varchar(100),
    foreign key (id_utilizador) references usuario(id)
);

create index if not exists log_auditoria_entidade_idx
    on log_auditoria (entidade, id_registo_afetado);

create index if not exists log_auditoria_data_idx
    on log_auditoria (data_hora desc);

-- Append-only: impede alteracoes/remocoes dos registos de auditoria.
create or replace function bloquear_alteracao_auditoria() returns trigger as $$
begin
    raise exception 'log_auditoria e append-only (sem update/delete)';
end;
$$ language plpgsql;

drop trigger if exists log_auditoria_append_only on log_auditoria;
create trigger log_auditoria_append_only
    before update or delete on log_auditoria
    for each row execute function bloquear_alteracao_auditoria();
