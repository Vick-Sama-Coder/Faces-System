-- Movimentos do cartao de fidelizacao. Os tipos sao:
--   marca               - corte elegivel pago (conta para o ciclo)
--   beneficio_ganho     - 5.ª marca do ciclo atingida (RN18)
--   beneficio_utilizado - corte gratuito (RN19/RN20)
--   correcao            - ajuste manual autorizado
create table if not exists movimento_fidelizacao(
    id int primary key generated always as identity,
    cartao_id int not null,
    atendimento_servico_id int,
    tipo_movimento varchar(30) not null,
    data_hora timestamp not null default now(),
    ciclo int not null default 1,
    registado_por int,
    observacao varchar(255),
    foreign key (cartao_id) references cartao_fidelizacao(id),
    foreign key (atendimento_servico_id) references atendimento_servico(id),
    foreign key (registado_por) references usuario(id)
);

-- Idempotencia: cada servico gera no maximo um movimento de cada tipo (RNF02/RNF05).
create unique index if not exists movimento_fidelizacao_servico_tipo_unico
    on movimento_fidelizacao (atendimento_servico_id, tipo_movimento)
    where atendimento_servico_id is not null;
