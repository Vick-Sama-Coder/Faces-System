-- FKs de despesa que nao podem ser declaradas inline por causa da ordem dos
-- scripts: despesa (008) referencia categoria_despesa (027), caixa_sessao (025)
-- e usuario (014), todos criados depois.
alter table despesa
    add constraint despesa_categoria_fk
    foreign key (categoria_id) references categoria_despesa(id);

alter table despesa
    add constraint despesa_caixa_sessao_fk
    foreign key (caixa_sessao_id) references caixa_sessao(id);

alter table despesa
    add constraint despesa_registado_por_fk
    foreign key (registado_por) references usuario(id);
