create table if not exists pagamento(
    id int primary key auto_increment,
    valor int not null,
    metodo varchar(100) not null
);