create table if not exists servico(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    valor int not null,
    categoria_id int not null,
    foreign key (categoria_id) references categoria_salao(id)

);