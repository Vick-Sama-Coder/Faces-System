-- Codigos de recuperacao de senha enviados por SMS ao telefone do utilizador.
-- Guarda apenas o hash do codigo (nunca o codigo em claro), com validade,
-- controlo de tentativas e marcacao de uso.
create table if not exists recuperacao_senha(
    id int primary key generated always as identity,
    id_usuario int not null,
    codigo_hash varchar(100) not null,
    expira_em timestamp not null,
    usado boolean not null default false,
    tentativas int not null default 0,
    data_criacao timestamp not null default now(),
    foreign key (id_usuario) references usuario(id) on delete cascade
);

create index if not exists recuperacao_senha_usuario_idx
    on recuperacao_senha (id_usuario, usado, expira_em);
