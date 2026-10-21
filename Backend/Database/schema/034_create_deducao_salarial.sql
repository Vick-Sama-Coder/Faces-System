-- Deducoes aplicadas a um processamento salarial (com motivo e aprovacao).
create table if not exists deducao_salarial(
    id int primary key generated always as identity,
    processamento_id int not null,
    tipo varchar(50) not null,
    descricao varchar(255),
    valor int not null check (valor > 0),
    motivo varchar(255),
    aprovado_por int,
    criado_em timestamp not null default now(),
    foreign key (processamento_id) references processamento_salarial(id) on delete cascade,
    foreign key (aprovado_por) references usuario(id)
);
