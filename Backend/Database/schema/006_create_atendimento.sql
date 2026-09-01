create table if not exists atendimento (
    id int primary key generated always as identity,
    data date not null,
    pagamento_id int not null,
    foreign key (pagamento_id) references pagamento(id)
);