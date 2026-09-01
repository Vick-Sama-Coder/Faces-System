create table if not exists funcionario(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    salario int not null,
    comissao int not null
);