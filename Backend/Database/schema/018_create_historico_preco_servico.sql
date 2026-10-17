-- Historico de alteracoes de preco de um servico.
-- Cada alteracao de valor grava aqui o valor anterior e o novo, para auditoria
-- e para garantir que atendimentos passados nao sao afetados (RN15/RN19/RN20).
create table if not exists historico_preco_servico(
    id int primary key generated always as identity,
    servico_id int not null,
    valor_anterior int,
    valor_novo int not null,
    alterado_por int,
    criado_em timestamp not null default now(),
    foreign key (servico_id) references servico(id),
    foreign key (alterado_por) references usuario(id)
);
