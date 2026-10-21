-- Movimentos de uma sessao de caixa: entradas (pagamentos), saidas (despesas),
-- levantamentos e ajustes manuais. Anular nao apaga: muda o estado.
create table if not exists movimento_caixa(
    id int primary key generated always as identity,
    id_sessao int not null,
    tipo_movimento varchar(20) not null,   -- Entrada | Saida | Levantamento
    valor int not null check (valor > 0),
    descricao varchar(255),
    data_hora timestamp not null default now(),
    origem varchar(20) not null,           -- Pagamento | Despesa | Levantamento | Manual
    referencia_id int,
    registado_por int,
    estado varchar(20) not null default 'Ativo',   -- Ativo | Anulado
    foreign key (id_sessao) references caixa_sessao(id),
    foreign key (registado_por) references usuario(id)
);

-- Idempotencia por referencia (RNF05): o mesmo pagamento/despesa gera um so movimento.
create unique index if not exists movimento_caixa_referencia_unica
    on movimento_caixa (origem, referencia_id)
    where referencia_id is not null;
