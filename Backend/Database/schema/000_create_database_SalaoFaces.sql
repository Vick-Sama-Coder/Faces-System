-- Cria a base de dados SalaoFaces.
-- Nota: o PostgreSQL nao suporta "create database if not exists" e nao permite
-- executar CREATE DATABASE dentro de uma transacao. Execute este ficheiro
-- isoladamente com psql (fora de transacao), por exemplo:
--   psql -U postgres -f 000_create_database_SalaoFaces.sql
drop database if exists "SalaoFaces";
create database "SalaoFaces";
