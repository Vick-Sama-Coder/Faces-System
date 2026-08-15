create table if not exists item_produto(
    id int primary key auto_increment,
    produto_id int not null,
    despesa_id  int not null,
    funcionario_id int not null,
    quantidade int not null,
    foreign key( produto_id) references produto(id),
    foreign key( despesa_id) references despesa(id),
    foreign key( funcionario_id) references funcionario(id)
);