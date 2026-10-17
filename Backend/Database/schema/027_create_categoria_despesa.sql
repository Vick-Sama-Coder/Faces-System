-- Categoria de despesa (fixa, variavel, produtos, salarios).
create table if not exists categoria_despesa(
    id int primary key generated always as identity,
    nome varchar(100) not null unique,
    tipo varchar(20) not null default 'Variavel',   -- Fixa | Variavel | Produtos | Salarios
    estado varchar(20) not null default 'Ativo'
);

insert into categoria_despesa (nome, tipo) values
    ('Despesas fixas', 'Fixa'),
    ('Despesas variaveis', 'Variavel'),
    ('Produtos', 'Produtos'),
    ('Salarios', 'Salarios')
on conflict (nome) do nothing;
