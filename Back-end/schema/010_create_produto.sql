create table if not exists produto(
    id int primary key auto_increment,
    nome varchar(100) not null,
    valor int not null,
    categoria_produto_id int not null,
    foreign key (categoria_produto_id) references categoria_produto(id)
);