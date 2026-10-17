-- Sessao de caixa (abertura -> movimentos -> fecho). Uma so sessao aberta por caixa.
create table if not exists caixa_sessao(
    id int primary key generated always as identity,
    caixa_id int not null,
    data_abertura timestamp not null default now(),
    saldo_inicial int not null default 0,
    aberto_por int,
    data_fecho timestamp,
    valor_esperado int,
    valor_contado int,
    diferenca int,
    observacoes text,
    fechado_por int,
    estado varchar(20) not null default 'Aberta',   -- Aberta | Fechada
    foreign key (caixa_id) references caixa(id),
    foreign key (aberto_por) references usuario(id),
    foreign key (fechado_por) references usuario(id)
);

-- Garante caixa unico: no maximo uma sessao aberta por caixa (RN09).
create unique index if not exists caixa_sessao_aberta_unica
    on caixa_sessao (caixa_id)
    where estado = 'Aberta';
