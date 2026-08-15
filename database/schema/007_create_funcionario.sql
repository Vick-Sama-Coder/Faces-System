create table if not exists funcionario(
    id int primary key auto_increment,
    nome varchar(100) not null,
    salario int not null,
    comissao int not null
);