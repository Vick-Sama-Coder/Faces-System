-- Dados iniciais e objetos que o schema Drizzle nao representa.

-- Perfis base do sistema.
insert into perfil (id, nome, descricao, estado) values
    (1, 'Administrador', 'Acesso total ao sistema', 'Ativo'),
    (2, 'Usuario', 'Recepcao e atendimento', 'Ativo'),
    (3, 'Financeiro', 'Caixa, despesas e salarios', 'Ativo'),
    (4, 'Auditor', 'Consulta de relatorios e auditoria', 'Ativo')
on conflict (id) do update
    set nome = excluded.nome,
        descricao = excluded.descricao,
        estado = excluded.estado;

-- Como os ids acima sao explicitos, avanca a sequence da identity.
select setval(
    pg_get_serial_sequence('perfil', 'id'),
    (select max(id) from perfil)
);

-- Catalogo de permissoes (codigo no formato "modulo:acao").
insert into permissao (codigo, descricao, modulo) values
    ('clientes:ler',        'Consultar clientes',                 'clientes'),
    ('clientes:escrever',   'Criar e editar clientes',            'clientes'),
    ('servicos:ler',        'Consultar servicos',                 'servicos'),
    ('servicos:escrever',   'Criar e editar servicos',            'servicos'),
    ('funcionarios:ler',    'Consultar funcionarios',             'funcionarios'),
    ('funcionarios:escrever','Criar e editar funcionarios',       'funcionarios'),
    ('atendimentos:escrever','Registar atendimentos',             'atendimentos'),
    ('atendimentos:anular', 'Anular atendimentos',                'atendimentos'),
    ('pagamentos:registar', 'Registar pagamentos',                'pagamentos'),
    ('pagamentos:anular',   'Anular pagamentos',                  'pagamentos'),
    ('caixa:operar',        'Operar o caixa',                     'caixa'),
    ('caixa:levantar',      'Registar levantamentos de caixa',    'caixa'),
    ('caixa:fechar',        'Fechar o caixa',                     'caixa'),
    ('despesas:escrever',   'Registar e editar despesas',         'despesas'),
    ('fidelizacao:corrigir','Corrigir fidelizacao',               'fidelizacao'),
    ('horarios:gerir',      'Gerir horarios de funcionarios',     'horarios'),
    ('assiduidade:gerir',   'Gerir assiduidade',                  'assiduidade'),
    ('salarios:gerir',      'Gerir processamento salarial',       'salarios'),
    ('salarios:aprovar',    'Aprovar processamento salarial',     'salarios'),
    ('relatorios:ler',      'Consultar relatorios',               'relatorios'),
    ('contas:gerir',        'Gerir contas, perfis e permissoes',  'contas'),
    ('auditoria:ler',       'Consultar registos de auditoria',    'auditoria')
on conflict (codigo) do update
    set descricao = excluded.descricao,
        modulo = excluded.modulo;

-- Administrador (1): todas as permissoes.
insert into perfil_permissao (id_perfil, id_permissao)
select 1, id from permissao
on conflict do nothing;

-- Usuario (2): operacao do dia-a-dia.
insert into perfil_permissao (id_perfil, id_permissao)
select 2, id from permissao
where codigo in (
    'clientes:ler', 'clientes:escrever',
    'servicos:ler',
    'atendimentos:escrever',
    'pagamentos:registar',
    'caixa:operar'
)
on conflict do nothing;

-- Financeiro (3): caixa, despesas, salarios e relatorios.
insert into perfil_permissao (id_perfil, id_permissao)
select 3, id from permissao
where codigo in (
    'clientes:ler', 'servicos:ler', 'funcionarios:ler',
    'pagamentos:anular',
    'caixa:operar', 'caixa:levantar', 'caixa:fechar',
    'despesas:escrever',
    'horarios:gerir', 'assiduidade:gerir', 'salarios:gerir',
    'relatorios:ler'
)
on conflict do nothing;

-- Auditor (4): consulta de relatorios e auditoria.
insert into perfil_permissao (id_perfil, id_permissao)
select 4, id from permissao
where codigo in (
    'clientes:ler', 'servicos:ler', 'funcionarios:ler',
    'relatorios:ler', 'auditoria:ler'
)
on conflict do nothing;

-- Caixa operacional unico.
insert into caixa (designacao) values ('Caixa Principal')
on conflict (designacao) do nothing;

-- Categorias de despesa base.
insert into categoria_despesa (nome, tipo) values
    ('Despesas fixas', 'Fixa'),
    ('Despesas variaveis', 'Variavel'),
    ('Produtos', 'Produtos'),
    ('Salarios', 'Salarios')
on conflict (nome) do nothing;

-- Log de auditoria append-only: bloqueia UPDATE/DELETE ao nivel da BD.
create or replace function bloquear_alteracao_auditoria() returns trigger as $$
begin
    raise exception 'log_auditoria e append-only (sem update/delete)';
end;
$$ language plpgsql;

drop trigger if exists log_auditoria_append_only on log_auditoria;
create trigger log_auditoria_append_only
    before update or delete on log_auditoria
    for each row execute function bloquear_alteracao_auditoria();
