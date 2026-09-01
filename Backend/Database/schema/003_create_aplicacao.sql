create table if not exists aplicacao(
    id int primary key generated always as identity,
    nome varchar(100) not null
);