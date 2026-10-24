-- Distingue as marcas geradas por atendimentos das marcas introduzidas
-- manualmente pelo administrador (preenchimento de cartoes fisicos).
-- As linhas existentes ficam com 'atendimento', preservando o comportamento.
alter table movimento_fidelizacao
    add column if not exists origem varchar(20) not null default 'atendimento';
