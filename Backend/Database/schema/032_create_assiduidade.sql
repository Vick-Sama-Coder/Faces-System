-- Registo de assiduidade diario de um funcionario (presenca e ocorrencias).
-- A ocorrencia (RN15) e o registo; o efeito salarial e tratado no processamento.
create table if not exists assiduidade(
    id int primary key generated always as identity,
    funcionario_id int not null,
    data date not null default current_date,
    hora_entrada_real time,
    hora_saida_real time,
    tipo_ocorrencia varchar(30),   -- atraso | falta_justificada | falta_injustificada | saida_antecipada | ausencia | sem_registo
    justificacao varchar(255),
    estado varchar(20) not null default 'Registado',
    registado_por int,
    criado_em timestamp not null default now(),
    foreign key (funcionario_id) references funcionario(id),
    foreign key (registado_por) references usuario(id)
);

-- Um registo por funcionario e por dia.
create unique index if not exists assiduidade_funcionario_dia_unico
    on assiduidade (funcionario_id, data);
