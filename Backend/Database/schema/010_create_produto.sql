create table if not exists produto(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    valor int not null check (valor >= 0),
    categoria_produto_id int not null,
    estado varchar(20) not null default 'Ativo',
    foreign key (categoria_produto_id) references categoria_produto(id)
);
