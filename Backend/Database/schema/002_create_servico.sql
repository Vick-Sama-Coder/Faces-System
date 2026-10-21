create table if not exists servico(
    id int primary key generated always as identity,
    nome varchar(100) not null,
    descricao text,
    valor int not null check (valor > 0),
    duracao_min int,
    tipo_preco varchar(20) not null default 'fixo',   -- fixo | variavel
    elegivel_fidelizacao boolean not null default false, -- conta para o cartao de fidelizacao (cortes)
    categoria_id int not null,
    estado varchar(20) not null default 'Ativo',
    data_criacao timestamp not null default now(),
    foreign key (categoria_id) references categoria_salao(id)
);

-- Dois servicos ativos nao podem partilhar o nome (um inativo pode).
create unique index if not exists servico_nome_ativo_unico
    on servico (lower(nome))
    where estado = 'Ativo';
