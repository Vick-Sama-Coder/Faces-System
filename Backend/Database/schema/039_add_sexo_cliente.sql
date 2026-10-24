-- Adiciona campo sexo ao cliente: 'M' = Masculino, 'F' = Feminino
-- Apenas clientes do sexo masculino podem ter cartão de fidelização
alter table cliente
    add column if not exists sexo varchar(1);

-- Restrição para garantir apenas valores válidos
alter table cliente
    add constraint cliente_sexo_check
    check (sexo is null or sexo in ('M', 'F'));