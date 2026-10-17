-- Caixa operacional unico (RN09). Semeia a "Caixa Principal".
create table if not exists caixa(
    id int primary key generated always as identity,
    designacao varchar(100) not null unique,
    estado varchar(20) not null default 'Ativo'
);

insert into caixa (designacao) values ('Caixa Principal')
on conflict (designacao) do nothing;
