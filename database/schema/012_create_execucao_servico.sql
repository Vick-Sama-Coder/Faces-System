create table if not exists execucao_servico(
    id int primary key auto_increment,
    atendimento_id int not null,
    cliente_id int not null,
    servico_id int not null,
    funcionario_id int not null,
    foreign key(atendimento_id) references atendimento(id),
    foreign key(cliente_id) references cliente(id),
    foreign key(servico_id) references servico(id),
    foreign key(funcionario_id) references funcionario(id)
);