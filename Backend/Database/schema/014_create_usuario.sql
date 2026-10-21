create table if not exists usuario(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    senha varchar(100) not null,
    telefone int not null unique,
    id_perfil int not null,
    estado varchar(20) not null default 'Ativo',
    alteracao_obrigatoria_senha boolean not null default false,
    ultimo_acesso timestamp,
    data_criacao timestamp not null default now(),
    foreign key (id_perfil) references perfil(id)
);
