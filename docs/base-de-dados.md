# Base de Dados

[← Voltar ao índice](./README.md)

Base de dados: **PostgreSQL**, esquema `public`, base `SalaoFaces`.

## Scripts de migração

Os scripts estão em `Backend/Database/schema/` e devem ser aplicados **por ordem numérica**.

| Ficheiro | Tabela criada | Observações |
| --- | --- | --- |
| `000_create_database_SalaoFaces.sql` | (base de dados) | Cria a base; executar isoladamente (ver nota) |
| `001_create_categoria_salao.sql` | `categoria_salao` | Categorias de serviços |
| `002_create_servico.sql` | `servico` | FK → `categoria_salao`; `descricao`, `duracao_min`, `tipo_preco`, `elegivel_fidelizacao`, `estado`, `data_criacao`; índice único de nome entre ativos |
| `003_create_aplicacao.sql` | `aplicacao` | Sem uso actual |
| `004_create_cliente.sql` | `cliente` | CRUD na API implementado (nome, apelido, telefone único, endereço, nascimento, estado) |
| `005_create_pagamento.sql` | `pagamento` | Pagamento de um atendimento; `valor_total`, `estado`, `data_hora`, `registado_por`, `motivo_anulacao` |
| `006_create_atendimento.sql` | `atendimento` | Cabeçalho do atendimento; FK → `cliente`; totais derivados dos serviços |
| `007_create_funcionario.sql` | `funcionario` | CRUD implementado; `telefone`, `documento` (único), `cargo`, `data_admissao`, `comissao_percentual`, `estado`, `id_usuario` |
| `008_create_despesa.sql` | `despesa` | Despesa operacional; `categoria_id`, `valor_total`, `data_compra`, `metodo_pagamento`, `caixa_sessao_id`, `comprovativo`, `registado_por`, `estado` |
| `009_create_categoria_produto.sql` | `categoria_produto` | Categoria de produtos |
| `010_create_produto.sql` | `produto` | FK → `categoria_produto`; `valor`, `estado` |
| `011_create_item_produto.sql` | `item_produto` | Produtos de uma despesa (quantidade, preço unitário, total); FKs → produto, despesa, funcionario |
| `012_create_atendimento_servico.sql` | `atendimento_servico` | Serviços realizados no atendimento (substitui `execucao_servico`); FKs → atendimento, servico, funcionario |
| `013_create_perfil.sql` | `perfil` | Perfis de acesso (`nome`, `descricao`, `estado`) |
| `014_create_usuario.sql` | `usuario` | FK → `perfil`; `telefone` único, `estado`, `alteracao_obrigatoria_senha`, `ultimo_acesso`, `data_criacao` |
| `015_atualiza_perfis.sql` | — | Semeia/actualiza os perfis 1–4 |
| `016_create_permissao.sql` | `permissao`, `perfil_permissao`, `usuario_permissao` | Autorização por permissões (RBAC) |
| `017_seed_permissoes.sql` | — | Catálogo de permissões + atribuição aos perfis |
| `018_create_historico_preco_servico.sql` | `historico_preco_servico` | Histórico de alterações de preço (FK → `servico`, `usuario`) |
| `019_funcionario_conta.sql` | — | FK `funcionario.id_usuario` → `usuario` (adicionada após `014`) |
| `020_create_comissao_config.sql` | `comissao_config` | Comissão por funcionário/serviço (FKs → `funcionario`, `servico`) |
| `021_create_pagamento_parcela.sql` | `pagamento_parcela` | Parcelas do pagamento (método, valor, referência) |
| `022_create_comissao.sql` | `comissao` | Comissão gerada por serviço liquidado (`unique` em `atendimento_servico_id`) |
| `023_ligacoes.sql` | — | FKs diferidas: `atendimento`/`atendimento_servico`/`pagamento` → `usuario`; `pagamento` → `atendimento` |
| `024_create_caixa.sql` | `caixa` | Caixa operacional único (semeia "Caixa Principal") |
| `025_create_caixa_sessao.sql` | `caixa_sessao` | Sessão de caixa; índice único parcial garante uma só sessão aberta |
| `026_create_movimento_caixa.sql` | `movimento_caixa` | Entradas/saídas/levantamentos; índice único parcial por `(origem, referencia_id)` |
| `027_create_categoria_despesa.sql` | `categoria_despesa` | Categorias de despesa (semeia fixas/variáveis/produtos/salários) |
| `028_create_cartao_fidelizacao.sql` | `cartao_fidelizacao` | Um cartão por cliente (FK → `cliente`) |
| `029_create_movimento_fidelizacao.sql` | `movimento_fidelizacao` | Marcas/benefícios; índice único parcial por `(atendimento_servico_id, tipo_movimento)` |
| `030_ligacoes_despesa.sql` | — | FKs diferidas: `despesa` → `categoria_despesa`, `caixa_sessao`, `usuario` |

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

cliente 1───n atendimento 1───n atendimento_servico
                     │                 └── n──1 servico
                     │                 └── n──1 funcionario
                     └── 1───n pagamento 1───n pagamento_parcela
atendimento_servico 1───1 comissao

caixa 1───n caixa_sessao 1───n movimento_caixa
categoria_despesa 1───n despesa 1───n item_produto n──1 produto
                        └── n──1 caixa_sessao

cliente 1───1 cartao_fidelizacao 1───n movimento_fidelizacao
```

### Tabelas do domínio (ainda sem API)

```
aplicacao   (sem uso actual)
```

#### Definições resumidas

- **`categoria_salao`** — `id` (identity), `nome varchar(100) not null`.
- **`servico`** — `id`, `nome`, `descricao text`, `valor int not null` (`check > 0`),
  `duracao_min int`, `tipo_preco` (`fixo`/`variavel`), `elegivel_fidelizacao boolean`,
  `categoria_id` (FK), `estado`, `data_criacao`. Índice único de `lower(nome)` entre
  serviços **ativos**.
- **`historico_preco_servico`** — `id`, `servico_id` (FK), `valor_anterior`,
  `valor_novo`, `alterado_por` (FK → `usuario`), `criado_em`.
- **`categoria_produto`** — `id`, `nome`.
- **`produto`** — `id`, `nome`, `valor int` (`check >= 0`), `categoria_produto_id` (FK), `estado`.
- **`cliente`** — `id`, `nome`, `apelido` (opcional), `telefone int` (único),
  `endereco`, `data_nascimento`, `data_registo`, `saldo_pendente`, `estado`.
- **`atendimento`** — `id`, `cliente_id` (FK), `data_hora timestamp`, `estado`
  (`Em andamento`/`Concluido`/`Anulado`/`Pago`), `valor_bruto`, `valor_desconto`,
  `valor_total`, `registado_por` (FK → `usuario`), `motivo_anulacao`.
- **`atendimento_servico`** — `id`, `atendimento_id`/`servico_id`/`funcionario_id` (FKs),
  `preco_original`, `tipo_preco`, `valor_desconto`, `valor_final`, `estado`,
  `registado_por` (FK → `usuario`), `criado_em`.
- **`pagamento`** — `id`, `atendimento_id` (FK), `valor_total`, `estado`
  (`Pendente`/`Parcial`/`Liquidado`/`Anulado`), `data_hora`, `registado_por` (FK → `usuario`),
  `motivo_anulacao`.
- **`pagamento_parcela`** — `id`, `pagamento_id` (FK), `metodo_pagamento`, `valor`,
  `referencia`, `criado_em`.
- **`comissao`** — `id`, `atendimento_servico_id` (FK, `unique`), `funcionario_id` (FK),
  `taxa`, `base_calculo`, `valor_comissao`, `estado`, `criado_em`.
- **`funcionario`** — `id`, `nome`, `telefone varchar(20)`, `documento varchar(50)` (único),
  `cargo`, `data_admissao date`, `salario int not null`,
  `comissao_percentual numeric(5,2)` (`check 0–100`, default `30.00`), `estado`,
  `id_usuario` (FK opcional → `usuario`), `data_criacao`.
- **`comissao_config`** — `id`, `funcionario_id` (FK), `servico_id` (FK, nulo = taxa geral),
  `taxa_percentual` (`check 0–100`), `vigencia_inicio`, `vigencia_fim`, `estado`.
- **`despesa`** — `id`, `descricao`, `categoria_id` (FK → `categoria_despesa`), `valor_total`
  (`check > 0`), `data_compra`, `metodo_pagamento`, `caixa_sessao_id` (FK), `comprovativo`,
  `registado_por` (FK → `usuario`), `estado`, `criado_em`.
- **`item_produto`** — `id`, `produto_id` (FK), `despesa_id` (FK), `funcionario_id` (FK),
  `quantidade`, `preco_unitario`, `valor_total`.
- **`caixa`** — `id`, `designacao` (único), `estado`.
- **`caixa_sessao`** — `id`, `caixa_id` (FK), `data_abertura`, `saldo_inicial`, `aberto_por`,
  `data_fecho`, `valor_esperado`, `valor_contado`, `diferenca`, `observacoes`, `fechado_por`,
  `estado` (`Aberta`/`Fechada`). Índice único parcial: uma só sessão `Aberta` por caixa.
- **`movimento_caixa`** — `id`, `id_sessao` (FK), `tipo_movimento`
  (`Entrada`/`Saida`/`Levantamento`), `valor` (`check > 0`), `descricao`, `data_hora`,
  `origem`, `referencia_id`, `registado_por`, `estado`. Índice único parcial por
  `(origem, referencia_id)`.
- **`categoria_despesa`** — `id`, `nome` (único), `tipo` (`Fixa`/`Variavel`/`Produtos`/`Salarios`),
  `estado`.
- **`cartao_fidelizacao`** — `id`, `cliente_id` (FK, único), `data_ativacao`, `estado`.
- **`movimento_fidelizacao`** — `id`, `cartao_id` (FK), `atendimento_servico_id` (FK),
  `tipo_movimento` (`marca`/`beneficio_ganho`/`beneficio_utilizado`/`correcao`), `data_hora`,
  `ciclo`, `registado_por`, `observacao`. Índice único parcial por
  `(atendimento_servico_id, tipo_movimento)`.
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
- Apagar um **serviço** com serviços realizados associados → erro `23503` → resposta `409`.
- Criar/atualizar um **serviço** com categoria inexistente → erro `23503` → resposta `400`.
- Dois **serviços ativos** com o mesmo nome → erro `23505` → resposta `409`.
- `servico.valor`/`comissao_percentual`/`taxa_percentual` fora do intervalo → erro `23514`
  → resposta `400`.
- Apagar um **funcionário** com histórico → erro `23503` → resposta `409`.
- `funcionario.documento` duplicado → erro `23505` → resposta `409`.
- Criar **atendimento** com cliente/funcionário inexistente → erro `23503` → resposta `400`.
- Cada `atendimento_servico` origina no máximo **uma** `comissao` (`unique`) → geração
  idempotente.
- Abrir **caixa** com uma sessão já aberta → erro `23505` (índice único parcial) → `409`.
- O mesmo pagamento/despesa gera **um só** movimento de caixa (índice único parcial por
  `origem`+`referencia_id`) → idempotência.
- Cada `atendimento_servico` gera no máximo um movimento de fidelização de cada tipo
  (índice único parcial) → geração idempotente.
- `despesa.valor_total` ≤ 0 → erro `23514` → resposta `400`.

## Notas de modelação

- `telefone` é `int` em `usuario` e `cliente`. Os números moçambicanos (9 dígitos,
  começando por `8`) cabem num `int`, mas note que a coluna não suporta zeros à esquerda
  nem prefixos internacionais — o telefone é limpo/normalizado na aplicação.
- `valor` e `salario` usam `int` (unidades inteiras de MT).
- `senha varchar(100)` armazena o **hash** do bcrypt (60 caracteres), nunca a senha original.
