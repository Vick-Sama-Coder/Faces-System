create table if not exists usuario(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    senha varchar(100) not null,
    telefone int not null,
    id_perfil int not null,
    foreign key (id_perfil) references perfil(id)
);