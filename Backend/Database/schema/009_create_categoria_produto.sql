create table if not exists categoria_produto(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    
);