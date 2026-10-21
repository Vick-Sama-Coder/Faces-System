-- Comissao de um servico realizado. Gerada apenas quando o pagamento do
-- atendimento fica integralmente liquidado (RN05/RN28/RN10).
-- O unique em atendimento_servico_id garante geracao idempotente (sem duplicados).
create table if not exists comissao(
    id int primary key generated always as identity,
    atendimento_servico_id int not null unique,
    funcionario_id int not null,
    taxa numeric(5,2) not null check (taxa between 0 and 100),
    base_calculo int not null,
    valor_comissao int not null,
    estado varchar(20) not null default 'Elegivel',
    criado_em timestamp not null default now(),
    foreign key (atendimento_servico_id) references atendimento_servico(id),
    foreign key (funcionario_id) references funcionario(id)
);
