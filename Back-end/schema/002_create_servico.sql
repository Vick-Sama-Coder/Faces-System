create table if not exists servico(
    id int primary key auto_increment,
    nome varchar(100) not null,
    valor int not null,
    categoria_id int not null,
    foreign key (categoria_id) references categoria_salao(id)

);