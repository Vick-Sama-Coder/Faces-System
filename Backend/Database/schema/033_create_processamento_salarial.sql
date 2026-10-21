-- Processamento salarial mensal de um funcionario: base + comissoes - deducoes.
-- Fluxo: Preparado -> Aprovado -> Pago (RF19).
create table if not exists processamento_salarial(
    id int primary key generated always as identity,
    funcionario_id int not null,
    periodo_inicio date not null,
    periodo_fim date not null,
    salario_base int not null default 0,
    total_comissoes int not null default 0,
    total_deducoes int not null default 0,
    total_a_pagar int not null default 0,
    estado varchar(20) not null default 'Preparado',   -- Preparado | Aprovado | Pago
    aprovado_por int,
    data_aprovacao timestamp,
    data_pagamento timestamp,
    criado_em timestamp not null default now(),
    foreign key (funcionario_id) references funcionario(id),
    foreign key (aprovado_por) references usuario(id)
);

-- Um processamento por funcionario e por periodo.
create unique index if not exists processamento_salarial_periodo_unico
    on processamento_salarial (funcionario_id, periodo_inicio, periodo_fim);
