create table if not exists funcionario(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    telefone varchar(20),
    documento varchar(50) unique,
    cargo varchar(100),
    data_admissao date,
    salario int not null,
    comissao_percentual numeric(5,2) not null default 30.00
        check (comissao_percentual between 0 and 100),
    estado varchar(20) not null default 'Ativo',
    id_usuario int unique,                 -- ligacao opcional a uma conta de acesso (FK em 019)
    data_criacao timestamp not null default now()
);
