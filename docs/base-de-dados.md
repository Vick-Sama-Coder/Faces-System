# Base de Dados

[← Voltar ao índice](./README.md)

Base de dados: **PostgreSQL**, esquema `public`, base `SalaoFaces`.

## Scripts de migração

Os scripts estão em `Backend/Database/schema/` e devem ser aplicados **por ordem numérica**.

| Ficheiro | Tabela criada | Observações |
| --- | --- | --- |
| `000_create_database_SalaoFaces.sql` | (base de dados) | Cria a base; executar isoladamente (ver nota) |
| `001_create_categoria_salao.sql` | `categoria_salao` | Categorias de serviços |
| `002_create_servico.sql` | `servico` | FK → `categoria_salao`; `descricao`, `duracao_min`, `tipo_preco`, `estado`, `data_criacao`; índice único de nome entre ativos |
| `003_create_aplicacao.sql` | `aplicacao` | Sem uso actual |
| `004_create_cliente.sql` | `cliente` | CRUD na API implementado (nome, apelido, telefone único, endereço, nascimento, estado) |
| `005_create_pagamento.sql` | `pagamento` | Sem CRUD na API ainda |
| `006_create_atendimento.sql` | `atendimento` | FK → `pagamento` |
| `007_create_funcionario.sql` | `funcionario` | CRUD implementado; `telefone`, `documento` (único), `cargo`, `data_admissao`, `comissao_percentual`, `estado`, `id_usuario` |
| `008_create_despesa.sql` | `despesa` | Sem CRUD na API ainda |
| `009_create_categoria_produto.sql` | `categoria_produto` | Categoria de produtos |
| `010_create_produto.sql` | `produto` | FK → `categoria_produto` |
| `011_create_item_produto.sql` | `item_produto` | FKs → produto, despesa, funcionario |
| `012_create_execucao_servico.sql` | `execucao_servico` | Liga atendimento/cliente/servico/funcionario |
| `013_create_perfil.sql` | `perfil` | Perfis de acesso (`nome`, `descricao`, `estado`) |
| `014_create_usuario.sql` | `usuario` | FK → `perfil`; `telefone` único, `estado`, `alteracao_obrigatoria_senha`, `ultimo_acesso`, `data_criacao` |
| `015_atualiza_perfis.sql` | — | Semeia/actualiza os perfis 1–4 |
| `016_create_permissao.sql` | `permissao`, `perfil_permissao`, `usuario_permissao` | Autorização por permissões (RBAC) |
| `017_seed_permissoes.sql` | — | Catálogo de permissões + atribuição aos perfis |
| `018_create_historico_preco_servico.sql` | `historico_preco_servico` | Histórico de alterações de preço (FK → `servico`, `usuario`) |
| `019_funcionario_conta.sql` | — | FK `funcionario.id_usuario` → `usuario` (adicionada após `014`) |
| `020_create_comissao_config.sql` | `comissao_config` | Comissão por funcionário/serviço (FKs → `funcionario`, `servico`) |

> ⚠️ **Script 000:** o PostgreSQL não aceita `create database if not exists` nem permite
> executar `CREATE DATABASE` dentro de uma transacção. Execute este script **isoladamente**
> com `psql` (fora de transacção), ou crie a base manualmente com `createdb SalaoFaces`.

## Modelo de dados

### Tabelas com API implementada

```
categoria_salao 1───n servico 1───n historico_preco_servico
perfil 1───n usuario
funcionario 1───n comissao_config
funcionario n───1 usuario   (opcional, via id_usuario)
```

### Tabelas do domínio (ainda sem API)

```
cliente ──┐
servico ──┼──▶ execucao_servico ──▶ atendimento ──▶ pagamento
funcionario ──┘

categoria_produto ──▶ produto ──▶ item_produto ◀── despesa
                                        ▲
                                        └── funcionario
```

#### Definições resumidas

- **`categoria_salao`** — `id` (identity), `nome varchar(100) not null`.
- **`servico`** — `id`, `nome`, `descricao text`, `valor int not null` (`check > 0`),
  `duracao_min int`, `tipo_preco` (`fixo`/`variavel`), `categoria_id` (FK), `estado`,
  `data_criacao`. Índice único de `lower(nome)` entre serviços **ativos**.
- **`historico_preco_servico`** — `id`, `servico_id` (FK), `valor_anterior`,
  `valor_novo`, `alterado_por` (FK → `usuario`), `criado_em`.
- **`categoria_produto`** — `id`, `nome` (script com erro de sintaxe).
- **`produto`** — `id`, `nome`, `valor int`, `categoria_produto_id` (FK).
- **`cliente`** — `id`, `nome`, `apelido` (opcional), `telefone int` (único),
  `endereco`, `data_nascimento`, `data_registo`, `saldo_pendente`, `estado`.
- **`pagamento`** — `id`, `valor int`, `metodo varchar(100)`.
- **`atendimento`** — `id`, `data date`, `pagamento_id` (FK).
- **`funcionario`** — `id`, `nome`, `telefone varchar(20)`, `documento varchar(50)` (único),
  `cargo`, `data_admissao date`, `salario int not null`,
  `comissao_percentual numeric(5,2)` (`check 0–100`, default `30.00`), `estado`,
  `id_usuario` (FK opcional → `usuario`), `data_criacao`.
- **`comissao_config`** — `id`, `funcionario_id` (FK), `servico_id` (FK, nulo = taxa geral),
  `taxa_percentual` (`check 0–100`), `vigencia_inicio`, `vigencia_fim`, `estado`.
- **`despesa`** — `id`, `data date`.
- **`item_produto`** — `id`, `produto_id`, `despesa_id`, `funcionario_id`, `quantidade` (FKs).
- **`execucao_servico`** — `id`, `atendimento_id`, `cliente_id`, `servico_id`, `funcionario_id` (FKs).
- **`perfil`** — `id` (identity `by default`), `nome`, `descricao`, `estado`.
- **`usuario`** — `id` (identity), `nome`, `senha varchar(100)`, `telefone int` (único),
  `id_perfil` (FK), `estado`, `alteracao_obrigatoria_senha`, `ultimo_acesso`, `data_criacao`.
- **`permissao`** — `id` (identity), `codigo` (único), `descricao`, `modulo`.
- **`perfil_permissao`** — `id_perfil` + `id_permissao` (PK composta; FKs com `on delete cascade`).
- **`usuario_permissao`** — `id_usuario` + `id_permissao` (PK composta), `efeito`
  (`conceder`/`revogar`).

## Perfis e permissões

O script `015_atualiza_perfis.sql` **semeia automaticamente** os perfis base, garantindo
os nomes/descrições corretos (idempotente via `on conflict do update`):

| `id_perfil` | Nome | Descrição |
| --- | --- | --- |
| `1` | `Administrador` | Acesso total |
| `2` | `Usuario` | Recepção/atendimento (perfil atribuído no registo) |
| `3` | `Financeiro` | Caixa, despesas e salários |
| `4` | `Auditor` | Consulta de relatórios e auditoria |

O `017_seed_permissoes.sql` popula o catálogo `permissao` (códigos `modulo:acao`) e
atribui as permissões a cada perfil em `perfil_permissao`:

- `permissao` — catálogo de ações autorizáveis.
- `perfil_permissao` — permissões padrão de cada perfil.
- `usuario_permissao` — exceções individuais (`conceder`/`revogar`) sobre o perfil.

A permissão efetiva é: **permissões do perfil − revogadas + concedidas individualmente**.

> Basta aplicar os scripts por ordem (incluindo o `015`) para os perfis ficarem
> disponíveis. Sem eles, o registo de utilizador falha (`id_perfil` referencia um perfil
> inexistente) e o login não resolve o nome do perfil.

## Regras automáticas do PostgreSQL

O backend conta com a integridade referencial para proteger integridade de dados:

- Apagar uma **categoria** com serviços associados → erro `23503` → resposta `409`.
- Apagar um **serviço** com execuções associadas → erro `23503` → resposta `409`.
- Criar/atualizar um **serviço** com categoria inexistente → erro `23503` → resposta `400`.
- Dois **serviços ativos** com o mesmo nome → erro `23505` → resposta `409`.
- `servico.valor`/`comissao_percentual`/`taxa_percentual` fora do intervalo → erro `23514`
  → resposta `400`.
- Apagar um **funcionário** com histórico → erro `23503` → resposta `409`.
- `funcionario.documento` duplicado → erro `23505` → resposta `409`.

## Notas de modelação

- `telefone` é `int` em `usuario` e `cliente`. Os números moçambicanos (9 dígitos,
  começando por `8`) cabem num `int`, mas note que a coluna não suporta zeros à esquerda
  nem prefixos internacionais — o telefone é limpo/normalizado na aplicação.
- `valor` e `salario` usam `int` (unidades inteiras de MT).
- `senha varchar(100)` armazena o **hash** do bcrypt (60 caracteres), nunca a senha original.
