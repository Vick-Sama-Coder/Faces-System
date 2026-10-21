-- Cartao de fidelizacao: um por cliente (RF20).
create table if not exists cartao_fidelizacao(
    id int primary key generated always as identity,
    cliente_id int not null unique,
    data_ativacao timestamp not null default now(),
    estado varchar(20) not null default 'Ativo',   -- Ativo | Inativo
    foreign key (cliente_id) references cliente(id)
);
