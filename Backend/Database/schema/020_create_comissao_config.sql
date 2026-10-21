-- Configuracao de comissao por funcionario.
-- servico_id nulo = taxa geral do funcionario; preenchido = taxa especifica
-- desse servico (a especifica sobrepoe-se a geral, RN27).
create table if not exists comissao_config(
    id int primary key generated always as identity,
    funcionario_id int not null,
    servico_id int,
    taxa_percentual numeric(5,2) not null
        check (taxa_percentual between 0 and 100),
    vigencia_inicio date not null default current_date,
    vigencia_fim date,
    estado varchar(20) not null default 'Ativo',
    foreign key (funcionario_id) references funcionario(id),
    foreign key (servico_id) references servico(id)
);
