-- A permissao de escrita de stock estava em falta no seed original. A migracao
-- garante que bases ja existentes recebem a permissao e que o Administrador
-- passa a poder usa-la sem intervencao manual.
insert into permissao (codigo, descricao, modulo) values
    ('estoque:escrever', 'Registar movimentos de stock', 'estoque')
on conflict (codigo) do update
    set descricao = excluded.descricao,
        modulo = excluded.modulo;

insert into perfil_permissao (id_perfil, id_permissao)
select 1, id from permissao where codigo = 'estoque:escrever'
on conflict do nothing;
