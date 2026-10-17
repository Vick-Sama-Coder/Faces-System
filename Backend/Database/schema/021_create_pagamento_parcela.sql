-- Parcelas de um pagamento (permite pagamento dividido por varios metodos).
create table if not exists pagamento_parcela(
    id int primary key generated always as identity,
    pagamento_id int not null,
    metodo_pagamento varchar(50) not null,   -- Dinheiro | M-Pesa | ...
    valor int not null check (valor > 0),
    referencia varchar(100),
    criado_em timestamp not null default now(),
    foreign key (pagamento_id) references pagamento(id)
);
