-- Autorizacao por permissoes (RBAC).
-- permissao         -> catalogo de acoes autorizaveis (codigo "modulo:acao")
-- perfil_permissao  -> permissoes padrao de cada perfil
-- usuario_permissao -> excecoes individuais (conceder/revogar) sobre o perfil

create table if not exists permissao(
    id int primary key generated always as identity,
    codigo varchar(60) not null unique,
    descricao varchar(255) not null,
    modulo varchar(50) not null
);

create table if not exists perfil_permissao(
    id_perfil int not null,
    id_permissao int not null,
    primary key (id_perfil, id_permissao),
    foreign key (id_perfil) references perfil(id) on delete cascade,
    foreign key (id_permissao) references permissao(id) on delete cascade
);

create table if not exists usuario_permissao(
    id_usuario int not null,
    id_permissao int not null,
    efeito varchar(10) not null check (efeito in ('conceder', 'revogar')),
    primary key (id_usuario, id_permissao),
    foreign key (id_usuario) references usuario(id) on delete cascade,
    foreign key (id_permissao) references permissao(id) on delete cascade
);
