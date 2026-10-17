-- Produtos comprados numa despesa (quantidade x preco unitario = valor total).
create table if not exists item_produto(
    id int primary key generated always as identity,
    produto_id int not null,
    despesa_id int not null,
    funcionario_id int,
    quantidade int not null check (quantidade > 0),
    preco_unitario int not null check (preco_unitario >= 0),
    valor_total int not null check (valor_total >= 0),
    foreign key (produto_id) references produto(id),
    foreign key (despesa_id) references despesa(id),
    foreign key (funcionario_id) references funcionario(id)
);
