# Base de Dados

[← Voltar ao índice](./README.md)

Base de dados: **PostgreSQL**, esquema `public`, base `SalaoFaces`.

## Schema Drizzle (fonte de verdade)

O esquema é definido com **Drizzle ORM** em `Backend/src/db/schema/`, organizado por
domínio:

| Ficheiro | Tabelas |
| --- | --- |
| `acesso.js` | `perfil`, `usuario`, `permissao`, `perfil_permissao`, `usuario_permissao`, `recuperacao_senha`* |
| `catalogo.js` | `categoria_salao`, `servico`, `servico_modalidade`, `servico_aplicacao`, `historico_preco_servico`, `categoria_produto`, `produto` |
| `clientes.js` | `cliente` |
| `atendimentos.js` | `atendimento`, `atendimento_servico`, `desconto_atendimento`, `pagamento`, `pagamento_parcela`, `comissao_config`, `comissao` |
| `fidelizacao.js` | `cartao_fidelizacao`, `movimento_fidelizacao` |
| `financeiro.js` | `categoria_despesa`, `caixa`, `caixa_sessao`, `movimento_caixa`, `despesa`, `item_produto` |
| `movimento_estoque.js` | `movimento_estoque` |
| `rh.js` | `funcionario`, `horario_funcionario`, `assiduidade`, `processamento_salarial`, `deducao_salarial` |
| `auditoria.js` | `log_auditoria` |
| `idempotencia.js` | `requisicao_idempotencia` |
| `legacy.js` | `aplicacao`* |

\* Tabelas legadas mantidas por compatibilidade/histórico: `recuperacao_senha` (o fluxo de
recuperação por telefone foi removido) e `aplicacao` (substituída por
`servico.tipo_servico = 'Aplicacao'` + `servico_aplicacao`).

**Total:** 38 tabelas (33 na migração inicial + 5 acrescentadas depois).

A ligação é feita em `Backend/src/db/client.js`, que reutiliza o mesmo `Pool` do `pg`.
As migrações ficam em `Backend/drizzle/` e são versionadas no repositório.

### Comandos

Executar a partir de `Backend/`:

| Comando | Descrição |
| --- | --- |
| `npm run db:generate` | Gera uma nova migração a partir das alterações ao schema |
| `npm run db:migrate` | Cria a base (se faltar) e aplica as migrações pendentes |
| `npm run db:push` | Sincroniza o schema directamente com a base (apenas desenvolvimento) |
| `npm run db:studio` | Abre o Drizzle Studio para inspeccionar os dados |
| `npm run db:pull` | Introspecciona a base e gera o schema correspondente |
| `npm run db:check` | Valida o histórico de migrações |
| `npm run db:reset` | **Apaga e recria** a base, aplicando todas as migrações (destrutivo) |

### Arranque automático

O `npm run dev` (e o `npm start`) executam `bootstrapDatabase()` antes de abrir a porta
HTTP:

1. Cria a base `DATABASE_NAME` se ela não existir (ligando à base de manutenção,
   `DATABASE_MAINTENANCE_DB`, por omissão `postgres`), sem apagar dados.
2. Se não existir nenhuma migração em `drizzle/`, gera a migração inicial em
   desenvolvimento. Em produção falha com uma mensagem clara.
3. Verifica se a base já tem tabelas mas não tem o histórico
   `drizzle.__drizzle_migrations`; nesse caso para e pede reconciliação/baseline.
4. Aplica as migrações pendentes com o migrador do Drizzle.

### Migrações Drizzle

| Migração | Conteúdo |
| --- | --- |
| `0000_init` | Cria as 33 tabelas base, FKs, checks e índices |
| `0001_seed` | Semeia perfis (1 `Administrador`, 2 `Usuario`, 4 `Auditor`), 22 permissões, permissões por perfil, caixa principal, categorias de despesa e o trigger append-only da auditoria |
| `0002_remove_vigencia_horario` | Remove `data_inicio_vigencia`/`data_fim_vigencia` de `horario_funcionario` |
| `0003_peaceful_krista_starr` | Adiciona `movimento_fidelizacao.origem` (`atendimento`/`manual`) |
| `0004_legal_meteorite` | Adiciona `cliente.sexo` (`M`/`F`) |
| `0005_dapper_harry_osborn` | Reconcilia `cliente.idade`, `servico.tipo_servico`/`permite_aplicacoes`, `produto.unidade`/`stock_minimo`, cria `servico_modalidade`, `servico_aplicacao` e `desconto_atendimento`, e acrescenta campos a `atendimento_servico` |
| `0006_powerful_firelord` | Cria `movimento_estoque` (entradas, saídas e ajustes) |
| `0007_reconcile_catalogo` | Reconcilia colunas/tabelas do catálogo e stock que faltavam na base Neon |
| `0008_cliente_telefone_nao_unico` | Remove a unicidade do telefone do cliente |
| `0009_servico_faixa_etaria` | Adiciona `servico.faixa_etaria` (`Geral`/`Adulto`/`Crianca`) |
| `0010_tidy_sandman` | Cria `requisicao_idempotencia` para a fila offline |

> O ficheiro `drizzle/0005_stock_controlo.sql` é uma versão manual antiga da migração de
> stock e **não** consta do `_journal.json`; por isso não é aplicado pelo `db:migrate`.
> A migração válida é a `0006_powerful_firelord`.

## Scripts SQL legados

Os scripts em `Backend/Database/schema/` (`001`–`038`) ficam como **referência histórica**
e não são aplicados pelo arranque. Alterações novas devem ser feitas no schema Drizzle e
materializadas com `npm run db:generate`. O antigo `000_create_database_SalaoFaces.sql` já
não é necessário: o bootstrap cria a base automaticamente.

## Modelo de dados

### Diagrama simplificado

```
categoria_salao 1───n servico 1───n historico_preco_servico
                         │
                         ├── 1───n servico_modalidade
                         └── n──n servico (servico_aplicacao)

perfil 1───n usuario n───n permissao (perfil_permissao / usuario_permissao)
funcionario n───1 usuario (opcional, via id_usuario)

cliente 1───n atendimento 1───n atendimento_servico
                     │                 ├── n──1 servico
                     │                 ├── n──1 funcionario
                     │                 └── 1───n desconto_atendimento
                     └── 1───n pagamento 1───n pagamento_parcela
atendimento_servico 1───1 comissao

caixa 1───n caixa_sessao 1───n movimento_caixa
categoria_despesa 1───n despesa 1───n item_produto n──1 produto
                        └── n──1 caixa_sessao

produto 1───n movimento_estoque

cliente 1───1 cartao_fidelizacao 1───n movimento_fidelizacao

funcionario 1───n horario_funcionario
funcionario 1───n assiduidade
funcionario 1───n processamento_salarial 1───n deducao_salarial
usuario 1───n log_auditoria
```

### Definições resumidas

#### Acesso

- **`perfil`** — `id`, `nome`, `descricao`, `estado`.
- **`usuario`** — `id`, `nome`, `senha` (hash bcrypt), `telefone int` (único),
  `id_perfil` (FK), `estado`, `alteracao_obrigatoria_senha`, `ultimo_acesso`,
  `data_criacao`. Índice único em `lower(nome)`: o login é feito pelo nome.
- **`permissao`** — `id`, `codigo` único (`modulo:acao`), `descricao`, `modulo`.
- **`perfil_permissao`** — `id_perfil` + `id_permissao` (PK composta; FKs com
  `on delete cascade`).
- **`usuario_permissao`** — `id_usuario` + `id_permissao` (PK composta), `efeito`
  (`conceder`/`revogar`).
- **`recuperacao_senha`** — tabela legada (código, validade, uso único, tentativas); sem
  uso actual.

#### Catálogo

- **`categoria_salao`** — `id`, `nome`.
- **`servico`** — `id`, `nome`, `descricao`, `valor int` (`check >= 0`), `duracao_min`
  (legado, já não editável na UI), `faixa_etaria` (`Geral`/`Adulto`/`Crianca`),
  `tipo_preco` (`fixo`/`variavel`), `tipo_servico` (`Servico`/`Aplicacao`),
  `permite_aplicacoes`, `elegivel_fidelizacao`, `categoria_id` (FK), `estado`,
  `data_criacao`. Índice único de `lower(nome)` entre serviços **ativos**.
  A `faixa_etaria` permite separar, por exemplo, o corte de adulto do corte de criança.
- **`servico_modalidade`** — `id`, `servico_id` (FK), `nome`, `faixa_etaria`
  (`Geral`/`Adulto`/`Crianca`), `valor` (`check >= 0`), `ordem`, `estado`. Nome único por
  serviço entre modalidades ativas.
- **`servico_aplicacao`** — `id`, `servico_id` (FK), `aplicacao_id` (FK → `servico`),
  `data_criacao`. Impede associação duplicada e auto-associação.
- **`historico_preco_servico`** — `id`, `servico_id` (FK), `valor_anterior`, `valor_novo`,
  `alterado_por` (FK → `usuario`), `criado_em`.
- **`categoria_produto`** — `id`, `nome`.
- **`produto`** — `id`, `nome`, `valor int` (`check >= 0`), `categoria_produto_id` (FK),
  `unidade`, `stock_minimo` (`check >= 0`), `estado`.

#### Clientes e atendimentos

- **`cliente`** — `id`, `nome`, `apelido`, `telefone int` (único), `endereco`,
  `data_nascimento`, `idade` (`0`–`120`), `sexo` (`M`/`F`), `data_registo`,
  `saldo_pendente`, `estado`.
- **`atendimento`** — `id`, `cliente_id` (FK), `data_hora`, `estado`
  (`Em andamento`/`Concluido`/`Anulado`/`Pago`), `valor_bruto`, `valor_desconto`,
  `valor_total`, `registado_por` (FK → `usuario`), `motivo_anulacao`.
- **`atendimento_servico`** — `id`, `atendimento_id`/`servico_id`/`funcionario_id` (FKs),
  `servico_principal_id` (FK → `atendimento_servico`, liga aplicações ao serviço principal),
  `modalidade_id` (FK), `modalidade_nome`, `tipo_servico`, `preco_original`,
  `tipo_preco`, `valor_desconto`, `valor_final`, `estado`, `registado_por`, `criado_em`.
- **`desconto_atendimento`** — histórico de cada desconto: `atendimento_id`,
  `atendimento_servico_id`, `escopo` (`Servico`/`Atendimento`), `tipo`
  (`Percentagem`/`Valor`), `percentagem`, `valor_bruto`, `valor_desconto`, `valor_final`,
  `aplicado_por`, `criado_em`.
- **`pagamento`** — `id`, `atendimento_id` (FK), `valor_total`, `estado`
  (`Pendente`/`Parcial`/`Liquidado`/`Anulado`), `data_hora`, `registado_por`,
  `motivo_anulacao`.
- **`pagamento_parcela`** — `id`, `pagamento_id` (FK), `metodo_pagamento`, `valor`
  (`check > 0`), `referencia`, `criado_em`.
- **`comissao_config`** — `id`, `funcionario_id` (FK), `servico_id` (FK; nulo = taxa
  geral), `taxa_percentual` (`0`–`100`), `vigencia_inicio`, `vigencia_fim`, `estado`.
- **`comissao`** — `id`, `atendimento_servico_id` (FK, `unique`), `funcionario_id` (FK),
  `taxa`, `base_calculo`, `valor_comissao`, `estado`, `criado_em`.

#### Fidelização

- **`cartao_fidelizacao`** — `id`, `cliente_id` (FK, único), `data_ativacao`, `estado`.
- **`movimento_fidelizacao`** — `id`, `cartao_id` (FK), `atendimento_servico_id` (FK),
  `tipo_movimento` (`marca`/`beneficio_ganho`/`beneficio_utilizado`/`correcao`),
  `origem` (`atendimento`/`manual`), `data_hora`, `ciclo`, `registado_por`, `observacao`.
  Índice único parcial por `(atendimento_servico_id, tipo_movimento)`.
  Marcas de `origem = 'atendimento'` contam uma vez por dia; marcas `manual` contam
  individualmente.

#### Financeiro e stock

- **`categoria_despesa`** — `id`, `nome` (único), `tipo`
  (`Fixa`/`Variavel`/`Produtos`/`Salarios`), `estado`.
- **`caixa`** — `id`, `designacao` (único), `estado`.
- **`caixa_sessao`** — `id`, `caixa_id` (FK), `data_abertura`, `saldo_inicial`,
  `aberto_por`, `data_fecho`, `valor_esperado`, `valor_contado`, `diferenca`,
  `observacoes`, `fechado_por`, `estado` (`Aberta`/`Fechada`). Índice único parcial:
  uma só sessão `Aberta` por caixa.
- **`movimento_caixa`** — `id`, `id_sessao` (FK), `tipo_movimento`
  (`Entrada`/`Saida`/`Levantamento`), `valor` (`check > 0`), `descricao`, `data_hora`,
  `origem`, `referencia_id`, `registado_por`, `estado`. Índice único parcial por
  `(origem, referencia_id)`.
- **`despesa`** — `id`, `descricao`, `categoria_id` (FK), `valor_total`
  (`check > 0`), `data_compra`, `metodo_pagamento`, `caixa_sessao_id` (FK),
  `comprovativo`, `registado_por`, `estado`, `criado_em`.
- **`item_produto`** — `id`, `produto_id` (FK), `despesa_id` (FK), `funcionario_id` (FK),
  `quantidade` (`check > 0`), `preco_unitario`, `valor_total`.
- **`movimento_estoque`** — `id`, `produto_id` (FK), `tipo`
  (`entrada`/`saida`/`ajuste`), `quantidade`, `motivo`, `data_movimento`,
  `registado_por`, `despesa_id` (FK), `created_at`. Índices por produto, tipo, data e
  despesa. O stock actual é calculado como `entradas − saídas + ajustes`.

#### RH

- **`funcionario`** — `id`, `nome`, `telefone`, `documento` (único), `cargo`,
  `data_admissao`, `salario int`, `comissao_percentual` (`0`–`100`, default `30.00`),
  `estado`, `id_usuario` (FK opcional, única → `usuario`), `data_criacao`.
- **`horario_funcionario`** — `id`, `funcionario_id` (FK), `dia_semana`
  (`check 0–6`, 0 = Domingo), `hora_entrada`, `hora_saida`, `estado`.
- **`assiduidade`** — `id`, `funcionario_id` (FK), `data`, `hora_entrada_real`,
  `hora_saida_real`, `tipo_ocorrencia`
  (`atraso`/`falta_justificada`/`falta_injustificada`/`saida_antecipada`/`ausencia`/
  `sem_registo`), `justificacao`, `estado`, `registado_por`, `criado_em`. Índice único
  `(funcionario_id, data)`.
- **`processamento_salarial`** — `id`, `funcionario_id` (FK), `periodo_inicio`,
  `periodo_fim`, `salario_base`, `total_comissoes`, `total_deducoes`, `total_a_pagar`,
  `estado` (`Preparado`/`Aprovado`/`Pago`), `aprovado_por`, `data_aprovacao`,
  `data_pagamento`, `criado_em`. Índice único `(funcionario_id, periodo_inicio,
  periodo_fim)`.
- **`deducao_salarial`** — `id`, `processamento_id` (FK, `on delete cascade`), `tipo`,
  `descricao`, `valor` (`check > 0`), `motivo`, `aprovado_por`, `criado_em`.

#### Auditoria e legado

- **`log_auditoria`** — `id`, `id_utilizador` (FK), `data_hora`, `entidade`,
  `id_registo_afetado`, `tipo_operacao`, `valores_anteriores jsonb`,
  `valores_posteriores jsonb`, `motivo`, `identificador_operacao`. O trigger
  `log_auditoria_append_only` bloqueia `UPDATE`/`DELETE`.
- **`requisicao_idempotencia`** — cache de respostas de escritas com
  `Idempotency-Key`: `chave` (única), `metodo`, `caminho`, `id_utilizador`, `estado`
  (`em_processamento`/`concluida`), `status_code`, `resposta jsonb` e timestamps. Permite
  que a fila offline reenvie uma operação sem criar duplicados.
- **`aplicacao`** — tabela legada, sem uso actual.

## Perfis e permissões

O `0001_seed` semeia os perfis base (idempotente via `on conflict`):

| `id_perfil` | Nome | Descrição |
| --- | --- | --- |
| `1` | `Administrador` | Acesso total |
| `2` | `Usuario` | Recepção/atendimento (perfil atribuído no registo público) |
| `4` | `Auditor` | Consulta de relatórios e auditoria |

> O antigo perfil `3` (`Financeiro`) foi descontinuado. As suas responsabilidades
> passaram para o `Administrador`.

O seed popula o catálogo `permissao` com **22 códigos** e atribui:

- **Administrador (1):** todas as permissões semeadas.
- **Usuario (2):** `clientes:ler`, `clientes:escrever`, `servicos:ler`,
  `atendimentos:escrever`, `pagamentos:registar`, `caixa:operar`.
- **Auditor (4):** `clientes:ler`, `servicos:ler`, `funcionarios:ler`,
  `relatorios:ler`, `auditoria:ler`.

> A permissão `estoque:escrever`, exigida pelas rotas de stock, **não está no seed**.
> Para usar as acções de stock é preciso criá-la e atribuí-la (ou fazê-lo manualmente).

A permissão efetiva é: **(permissões do perfil ∪ concedidas individualmente) − revogadas
individualmente** (`usuario_permissao`). A revogação individual prevalece.

> ⚠️ **Lacuna conhecida:** as rotas de escrita de stock exigem `estoque:escrever`, mas
> esse código ainda **não** está no catálogo semeado. Sem o inserir manualmente (ou criar
> uma migração de seed), nenhum perfil consegue escrever movimentos de stock. Ver
> [estado-e-pendencias.md](./estado-e-pendencias.md).

## Regras automáticas do PostgreSQL

- Apagar uma **categoria** com serviços associados → erro `23503` → resposta `409`.
- Apagar um **serviço** com serviços realizados associados → erro `23503` → resposta `409`.
- Criar/atualizar um **serviço** com categoria inexistente → erro `23503` → resposta `400`.
- Dois **serviços ativos** com o mesmo nome → erro `23505` → resposta `409`.
- Duas **modalidades ativas** com o mesmo nome no mesmo serviço → `23505` → `409`.
- Uma **aplicação** não pode ser associada duas vezes ao mesmo serviço nem a si própria.
- `servico.valor`, `produto.valor`, `servico_modalidade.valor`,
  `comissao_percentual` e `taxa_percentual` fora do intervalo → `23514` → `400`.
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
- Um registo de **assiduidade** por funcionário e por dia (índice único) → `23505` → `409`.
- Um **processamento salarial** por funcionário e período (índice único) → não duplica.
- `despesa.valor_total`, `pagamento_parcela.valor` e `deducao_salarial.valor` fora do
  intervalo → `23514` → `400`.
- O `log_auditoria` é **append-only**: qualquer `UPDATE`/`DELETE` é rejeitado por trigger.

## Notas de modelação

- `telefone` é `int` em `usuario` e `cliente`. Os números moçambicanos (9 dígitos,
  começando por `8`) cabem num `int`, mas a coluna não suporta zeros à esquerda nem
  prefixos internacionais — o telefone é limpo/normalizado na aplicação.
- `valor`, `salario`, `comissao` e totais usam `int` (unidades inteiras de MT).
- `senha varchar(100)` armazena o **hash** do bcrypt (60 caracteres), nunca a senha original.
- `recuperacao_senha` e `aplicacao` existem apenas por compatibilidade histórica; não são
  usadas pela aplicação actual.
- A fidelização actual aplica-se a clientes de ambos os sexos; o campo `cliente.sexo`
  existe para o cartão/identificação e já não limita o benefício.
