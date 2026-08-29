create table if not exists cliente(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    apelido varchar(100) not null,
    telefone int not null
);