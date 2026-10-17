-- Chaves estrangeiras que nao podem ser declaradas inline por causa da ordem dos
-- scripts: atendimento (006) e pagamento (005) referenciam usuario (014), e
-- pagamento (005) referencia atendimento (006).
alter table atendimento
    add constraint atendimento_registado_por_fk
    foreign key (registado_por) references usuario(id);

alter table atendimento_servico
    add constraint atendimento_servico_registado_por_fk
    foreign key (registado_por) references usuario(id);

alter table pagamento
    add constraint pagamento_atendimento_fk
    foreign key (atendimento_id) references atendimento(id);

alter table pagamento
    add constraint pagamento_registado_por_fk
    foreign key (registado_por) references usuario(id);
