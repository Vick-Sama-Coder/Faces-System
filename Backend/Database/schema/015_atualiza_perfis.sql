-- Perfis do sistema.
-- Semeia os perfis base e garante os nomes/descricoes corretos (idempotente).
--   1 = Administrador  -> acesso total
--   2 = Usuario        -> recepcao/atendimento (perfil atribuido no registo)
--   3 = Financeiro     -> caixa, despesas e salarios
--   4 = Auditor        -> consulta de relatorios e auditoria
insert into perfil (id, nome, descricao, estado) values
    (1, 'Administrador', 'Acesso total ao sistema', 'Ativo'),
    (2, 'Usuario', 'Recepcao e atendimento', 'Ativo'),
    (3, 'Financeiro', 'Caixa, despesas e salarios', 'Ativo'),
    (4, 'Auditor', 'Consulta de relatorios e auditoria', 'Ativo')
on conflict (id) do update
    set nome = excluded.nome,
        descricao = excluded.descricao,
        estado = excluded.estado;

-- como os ids acima sao explicitos, avanca a sequence da identity para o maior id,
-- evitando que um novo perfil tente reutilizar o id 1
select setval(pg_get_serial_sequence('perfil', 'id'), (select max(id) from perfil));
