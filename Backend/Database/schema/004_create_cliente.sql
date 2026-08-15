create table if not exists cliente(
    id int primary key auto_increment,
    nome varchar(100) not null,
    apelido varchar(100) not null,
    telefone int not null
);