-- Catalogo de permissoes e atribuicao aos perfis base.
-- Os codigos seguem o formato "modulo:acao".
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

-- Administrador (1): todas as permissoes
insert into perfil_permissao (id_perfil, id_permissao)
select 1, id from permissao
on conflict do nothing;

-- Usuario (2): operacao do dia-a-dia
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

-- O perfil Financeiro (3) foi descontinuado. As suas permissoes passam a ser
-- exclusivas do Administrador (1), que ja recebe todas as permissoes acima.

-- Auditor (4): consulta de relatorios e auditoria
insert into perfil_permissao (id_perfil, id_permissao)
select 4, id from permissao
where codigo in (
    'clientes:ler', 'servicos:ler', 'funcionarios:ler',
    'relatorios:ler', 'auditoria:ler'
)
on conflict do nothing;
