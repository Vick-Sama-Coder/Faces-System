-- Atendimento: cabecalho com o cliente e os totais (derivados dos servicos).
-- A FK registado_por e adicionada em 023 (usuario em 014).
create table if not exists atendimento(
    id int primary key generated always as identity,
    cliente_id int not null,
    data_hora timestamp not null default now(),
    estado varchar(20) not null default 'Em andamento', -- Em andamento | Concluido | Anulado | Pago
    valor_bruto int not null default 0,
    valor_desconto int not null default 0,
    valor_total int not null default 0,
    registado_por int,
    motivo_anulacao varchar(255),
    foreign key (cliente_id) references cliente(id)
);
