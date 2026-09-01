create table if not exists despesa(
    id int primary key generated always as identity,
    data date not null
);