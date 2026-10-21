-- Despesa operacional (com ou sem produtos associados).
-- As FKs categoria_id, caixa_sessao_id e registado_por sao adicionadas em
-- 030_ligacoes_despesa.sql (tabelas criadas depois deste script).
create table if not exists despesa(
    id int primary key generated always as identity,
    descricao varchar(255) not null,
    categoria_id int,
    valor_total int not null check (valor_total > 0),
    data_compra date not null default current_date,
    metodo_pagamento varchar(50),
    caixa_sessao_id int,
    comprovativo varchar(255),
    registado_por int,
    estado varchar(20) not null default 'Ativo',
    criado_em timestamp not null default now()
);
