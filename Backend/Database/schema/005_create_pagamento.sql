create table if not exists pagamento(
    id int primary key generated always as identity,
    valor int not null,
    metodo varchar(100) not null
);