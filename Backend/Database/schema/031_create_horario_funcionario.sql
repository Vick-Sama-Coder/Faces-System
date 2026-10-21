-- Horario individual de um funcionario (programacao semanal).
create table if not exists horario_funcionario(
    id int primary key generated always as identity,
    funcionario_id int not null,
    dia_semana int not null check (dia_semana between 0 and 6),  -- 0=Domingo .. 6=Sabado
    hora_entrada time not null,
    hora_saida time not null,
    data_inicio_vigencia date not null default current_date,
    data_fim_vigencia date,
    estado varchar(20) not null default 'Ativo',
    foreign key (funcionario_id) references funcionario(id)
);
