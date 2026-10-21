create table if not exists cliente(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    apelido varchar(100),
    telefone int not null unique,
    endereco varchar(255),
    data_nascimento date,
    data_registo timestamp not null default now(),
    saldo_pendente int not null default 0,
    estado varchar(20) not null default 'Ativo'
);
