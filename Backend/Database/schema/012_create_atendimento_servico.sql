-- Servicos realizados num atendimento (substitui a antiga execucao_servico).
-- O preco e gravado na transacao (preco_original) e nao e lido dinamicamente
-- do catalogo, para os atendimentos passados ficarem imutaveis (RN03/RF06).
create table if not exists atendimento_servico(
    id int primary key generated always as identity,
    atendimento_id int not null,
    servico_id int not null,
    funcionario_id int not null,
    preco_original int not null check (preco_original >= 0),
    tipo_preco varchar(20),
    valor_desconto int not null default 0 check (valor_desconto >= 0),
    valor_final int not null,
    estado varchar(20) not null default 'Ativo',
    registado_por int,
    criado_em timestamp not null default now(),
    foreign key (atendimento_id) references atendimento(id),
    foreign key (servico_id) references servico(id),
    foreign key (funcionario_id) references funcionario(id)
);
