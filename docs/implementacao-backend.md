# Implementação do Backend — Plano por Fases

[← Voltar ao índice](./README.md)

Este documento é o **plano de execução da camada de backend** do Faces System. Descreve,
fase a fase, o que construir, em que ordem, com que migrações de base de dados, endpoints,
regras de negócio e critérios de conclusão. Deve ser lido em conjunto com:

- [`arquitetura.md`](./arquitetura.md) — camadas e estrutura de pastas.
- [`base-de-dados.md`](./base-de-dados.md) — esquema atual.
- [`api.md`](./api.md) — endpoints já implementados.
- [`autenticacao-permissoes.md`](./autenticacao-permissoes.md) — sessão e perfis.
- [`documentacao.md`](./documentacao.md) — análise de requisitos (RF, RN, RNF) e plano de produto.
- [`historias-usuario-salao-beleza.md`](./historias-usuario-salao-beleza.md) — backlog (HU).

> **Objetivo do backend:** expor todos os módulos do produto através de uma API REST
> consistente, aplicando regras de negócio e autorização **no servidor**, com PostgreSQL
> e **Drizzle ORM**, conforme [`regras-tecnologia.md`](./regras-tecnologia.md).

## 0. Estado de execução

| Fase | Estado | Notas |
| --- | :---: | --- |
| Fase 0 — Fundação técnica | ✅ Concluída | mapeamento central de erros PostgreSQL→HTTP em `app.js`; validações de domínio em `utils/validacoes.js` (auth, horários e fidelização) e validações próprias nos controladores de clientes/atendimentos |
| Fase 1 — Contas, perfis e permissões | ✅ Concluída | Tabelas `permissao`/`perfil_permissao`/`usuario_permissao`, 22 permissões, 3 perfis (`Administrador`, `Usuario`, `Auditor`; `Financeiro` descontinuado), criação/edição/estado de contas e perfis, `authorizePermission`, alteração de senha |
| Fase 2 — Clientes | ✅ Concluída | CRUD + pesquisa por nome/apelido/telefone + estado; telefone único |
| Fase 3 — Serviços (evolução) | ✅ Concluída | `descricao`, `duracao_min`, `tipo_preco`, `estado`; histórico de preços; modalidades; aplicações associadas; `PATCH /estado`; nome único entre ativos |
| Fase 4 — Funcionários (evolução) | ✅ Concluída | contacto/documento/admissão/cargo/estado, ligação a conta, `comissao_percentual`, `comissao_config`, desempenho |
| Fase 5 — Atendimentos e serviços realizados | ✅ Concluída | `atendimento` remodelado, `atendimento_servico` (substitui `execucao_servico`), criação transacional, descontos, `services/atendimento.js` |
| Fase 6 — Pagamentos | ✅ Concluída | `pagamento` remodelado + `pagamento_parcela`; liquidação, anulação e estado do atendimento |
| Fase 7 — Comissões | ✅ Concluída | `comissao` gerada na liquidação (idempotente), taxa específica sobrepõe-se à geral |
| Fase 8 — Caixa e despesas | ✅ Concluída | `caixa`/`caixa_sessao`/`movimento_caixa`, `categoria_despesa`, `despesa` remodelada; abertura, levantamentos, fecho com diferença; stock por API |
| Fase 9 — Fidelização | ✅ Concluída | `cartao_fidelizacao`/`movimento_fidelizacao`; ambos os sexos, serviços elegíveis até 200 MT, 5 marcas → 6.º serviço obrigatoriamente gratuito |
| Fase 10 — Horários, assiduidade e salários | ✅ Concluída | `horario_funcionario`, `assiduidade`, `processamento_salarial`/`deducao_salarial`; fluxo Preparado→Aprovado→Pago; comissões elegíveis do período; controlo mensal em `PUT /assiduidade/dia` |
| Fase 11 — Relatórios | ✅ Concluída | 10 relatórios agregados (`repository/relatorio.js`, incluindo `financeiro`), filtro opcional `de`/`ate`, permissão `relatorios:ler` |
| Fase 12 — Catálogo público | ✅ Concluída | `GET /api/public/servicos` (+`:id`) sem autenticação; só serviços ativos e campos de divulgação |
| Fase 13 — Auditoria | ✅ Concluída | `log_auditoria` append-only (trigger na BD) + `services/auditoria.js`; integrado em pagamentos, atendimentos, descontos, caixa, despesas, salários, assiduidade, fidelização e permissões |
| Dashboard | ✅ Concluída | `GET /api/dashboard` com resumo do mês, indicadores, série de 6 meses, tops e recentes |
| Stock | 🟡 Parcial | `GET /movimentos`, `GET /stock/:id`, `POST /entrada`, `POST /saida`, `POST /ajuste`; falta `estoque:escrever` no seed e CRUD de produtos |
| Fases 14–15 | ⏳ Pendente | Ver detalhe abaixo |
| Fase 16 — Fecho das decisões pendentes | 📝 A cargo do utilizador | Lacunas da análise a decidir/documentar (não é código) — ver §16 de [`documentacao.md`](./documentacao.md) |

> **Base de dados:** o esquema é definido em Drizzle (`src/db/schema/`) e materializado
> nas migrações de `Backend/drizzle/` (ver [`base-de-dados.md`](./base-de-dados.md)).
> O arranque do backend aplica as migrações pendentes automaticamente.

---


## 1. Estado atual (baseline)

O que **já existe e funciona** no backend:

| Área | Estado | Ficheiros |
| --- | --- | --- |
| Autenticação (registo, login, `/me`, logout) | ✅ | `routes/auth.js` |
| Middlewares `authenticate` / `authorize` | ✅ | `middlewares/auth.js` |
| Gestão de utilizadores (listagem) | ✅ | `routes/auth.js` |
| CRUD categorias de serviço | ✅ | `controller` + `repository` + `routes/categoria.js` |
| CRUD serviços | ✅ | `controller` + `repository` + `routes/servico.js` |
| CRUD funcionários | ✅ | `controller` + `repository` + `routes/funcionario.js` |
| Clientes | ✅ | `controller` + `repository` + `routes/cliente.js` |
| Atendimentos + serviços realizados | ✅ | `controller` + `repository` + `services/atendimento.js` + `routes/atendimento.js` |
| Pagamentos + parcelas | ✅ | `controller` + `repository` + `services/pagamento.js` + `routes/pagamento.js` |
| Comissões | ✅ | `controller` + `repository` + `routes/comissao.js` |
| Caixa (sessões, movimentos, fecho) | ✅ | `controller` + `repository` + `services/caixa.js` + `routes/caixa.js` |
| Despesas + categorias de despesa | ✅ | `controller` + `repository` + `services/despesa.js` + `routes/despesa.js` |
| Stock (movimentos, saldo, entrada/saída/ajuste) | 🟡 | `controller` + `repository` + `services/movimento_estoque.js` + `routes/movimento_estoque.js` |
| Dashboard | ✅ | `controller/dashboard.js` + `repository/dashboard.js` + `routes/dashboard.js` |
| Fidelização | ✅ | `controller` + `repository` + `services/fidelizacao.js` + `routes/fidelizacao.js` |
| Horários de funcionários | ✅ | `controller` + `repository` + `routes/horario.js` |
| Assiduidade | ✅ | `controller` + `repository` + `routes/assiduidade.js` |
| Salários (processamento/deduções/aprovação) | ✅ | `controller` + `repository` + `services/salario.js` + `routes/salario.js` |
| Relatórios agregados | ✅ | `controller` + `repository` + `routes/relatorio.js` |
| Catálogo público | ✅ | `controller` + `repository` (funções públicas de `servico`) + `routes/publico.js` |
| Auditoria | ✅ | `controller` + `repository` + `services/auditoria.js` + `routes/auditoria.js` |
| Validações (nome, telefone, senha) | ✅ | `utils/validacoes.js` |
| Token JWT | ✅ | `utils/token.js` |
| Esquema Drizzle (37 tabelas, `src/db/schema/`) | ✅ | `src/db/schema/` + `drizzle/` |

O que **falta**: sincronização offline, CRUD de produtos e interface completa de stock,
página de caixa, auditoria de criação/edição de contas e o fecho das decisões da análise
(Fase 16). A auditoria já tem consulta em `/logs`.

### Estrutura de pastas alvo

```
Backend/
├── Database/
│   └── schema/            # scripts SQL legados (referência histórica)
├── drizzle/               # migrações geradas + seed SQL
├── drizzle.config.js      # configuração do drizzle-kit
└── src/
    ├── config/            # pool pg
    ├── db/                # schema Drizzle, cliente e bootstrap
    ├── controller/        # entrada HTTP → validação mínima → repositórios
    ├── services/          # regras de negócio (comissão, caixa, fidelização…) — só quando necessário
    ├── repository/        # acesso a dados via Drizzle (sem regras, sem HTTP)
    ├── middlewares/       # authenticate, authorize, authorizePermission
    ├── routes/            # definição de rotas
    ├── utils/             # token, validações
    ├── app.js
    └── server.js
```

> A camada `services/` fica **reservada** aos módulos com regras complexas
> (pagamentos, comissões, caixa, fidelização, salários); os CRUD simples continuam
> `controller → repository`.

---

## 2. Convenções transversais (aplicar em todas as fases)

Estas decisões devem ser respeitadas em **todo** o código novo para manter consistência.

### 2.1 Camadas e responsabilidades

1. **`routes/`** — método + caminho → controlador; aplica `authenticate`/`authorize`/`authorizePermission`.
2. **`controller/`** — lê a entrada, verifica **campos obrigatórios**, chama o
   `service`/`repository`, define o código HTTP e o corpo. Erros inesperados seguem para
   o handler central com `next(error)`.
3. **`services/`** — regras de negócio e **transações** (`db.transaction(async (tx) => …)`).
4. **`repository/`** — acesso a dados com o query builder do Drizzle; devolve linhas ou `null`.
5. **`db/client.js`** — instância `db` do Drizzle sobre o `Pool` partilhado do `pg`.

### 2.2 Respostas HTTP (padrão do backend)

| Situação | Padrão |
| --- | --- |
| Lista | `200` com **array** `[...]` |
| Recurso único | `200`/`201` com o **objeto** |
| Criação | `201` com o objeto criado |
| Remoção | `204` sem corpo |
| Sucesso sem recurso | `200` com `{ message }` |
| Erro de campo | `400` com `{ field, message }` |
| Erro genérico | `400`/`404`/`409`/`500` com `{ message }` |

> Mantém-se o padrão dominante já usado em `servico`/`categoria`/`funcionario`
> (objetos/arrays diretos). O `auth` continua embrulhado (`{ user }`, `{ users }`) por
> compatibilidade com o frontend.

### 2.3 Códigos de erro PostgreSQL → HTTP

| SQLSTATE | Significado | Resposta |
| --- | --- | --- |
| `23503` | foreign key | `400` (FK inválida) ou `409` (bloqueio de delete) |
| `23505` | unique violation | `409` `{ field, message }` |
| `23502` | not null violation | `400` |
| `22P02` | valor inválido (ex.: id não numérico) | `400` |
| — | não existe | `404` |

O mapeamento está centralizado no handler de erros de `app.js`
(`ERROS_CONHECIDOS`); os controladores só tratam casos de domínio específicos
(ex.: `23505` de telefone → `409 { field }`) e encaminham o resto com `next(error)`.

### 2.4 Validação de entrada

- O **frontend** é responsável pela validação de formato (ver
  [`validacoes.md`](./validacoes.md)).
- No backend, o controlador verifica apenas se os **campos obrigatórios estão vazios**
  (devolve `400 { message }`).
- A integridade de dados é garantida pelas **constraints** da base de dados; os erros
  resultantes são traduzidos pelo handler central.

### 2.5 Autorização

- `authenticate` em todas as rotas privadas.
- `authorize('Administrador')` para escrita administrativa simples.
- **`authorizePermission('modulo:acao')`** (novo) para permissões finas — ver Fase 1.
- A fonte de verdade é **sempre** o backend.

### 2.6 Migrações

- Nunca editar scripts já aplicados; criar sempre novo ficheiro numerado.
- Numeração sugerida neste plano: **`016` em diante** (indicativa; aplicar por ordem).
- Migrações **aditivas e idempotentes** sempre que possível (`add column if not exists`,
  `create table if not exists`).
- Como o projeto está em desenvolvimento inicial, a remodelação de tabelas ainda não
  usadas (ex.: `execucao_servico`) é aceitável; registar sempre o impacto na FK.

### 2.7 Nomenclatura de rotas

O código atual tem inconsistências (`GET /api/funcionarios` mas `POST /api/funcionario`).
Regra para rotas **novas**: **plural** e coerente (`/api/clientes`,
`/api/atendimentos`, `/api/pagamentos`). As rotas antigas mantêm-se para não quebrar o
frontend; se forem normalizadas, criar alias e documentar em [`api.md`](./api.md).

### 2.8 Auditoria e campos de rastreio

- Tabelas de negócio recebem `registado_por` (FK `usuario`), `criado_em`, `atualizado_em`
  onde faça sentido.
- Operações relevantes (financeiras, anulações, permissões, fidelização) escrevem em
  `log_auditoria` via helper `registrarAuditoria(...)` (Fase 13), chamado dentro da
  mesma transação da operação.

### 2.9 Testes

- Usar o runner nativo `node:test` + `fetch` global (Node 18+), **sem novas dependências**.
- Cada fase termina com testes manuais (curl) documentados e, quando possível, testes
  automatizados para as regras críticas (pagamento, comissão, fidelização, caixa).

---

## 3. Resumo das fases

| Fase | Nome | Módulos | Depende de |
| --- | --- | --- | --- |
| **0** | Fundação técnica e padronização | handler de erros central, padronização de respostas | — |
| **1** | Contas, perfis e permissões (RBAC) | usuários, perfis, permissões | 0 |
| **2** | Clientes | cliente | 0 |
| **3** | Serviços (evolução) | servico, histórico de preço | 0 |
| **4** | Funcionários (evolução) | funcionario, configuração de comissão | 0 |
| **5** | Atendimentos e serviços realizados | atendimento, atendimento_servico | 2,3,4 |
| **6** | Pagamentos | pagamento, pagamento_parcela | 5 |
| **7** | Comissões | comissao | 6,4 |
| **8** | Caixa e despesas | caixa, movimentos, despesa, produto | 6 |
| **9** | Fidelização | cartao_fidelizacao, movimentos | 5,6 |
| **10** | Horários, assiduidade e salários | horario, assiduidade, processamento | 4,7 |
| **11** | Relatórios | endpoints agregados | 5–10 |
| **12** | Catálogo público | serviços ativos (sem auth) | 3 |
| **13** | Auditoria (consolidação) | log_auditoria | transversal |
| **14** | Sincronização offline | operacao_sincronizacao, idempotência | 5–9 |
| **15** | Qualidade, segurança e produção | testes, backups, migração de dados | todas |
| **16** | Fecho das decisões pendentes | documentação/produto (não é código) | — |

> Mapeamento com o plano de produto (`documentacao.md` §13): as Fases 1–2 correspondem à
> "Fase 1 — Fundação"; as Fases 5–6 à "Fase 2 — Atendimento e pagamentos"; a Fase 8 à
> "Fase 3 — Caixa e despesas"; a Fase 9 à "Fase 4 — Fidelização"; a Fase 10 à "Fase 5 —
> Assiduidade, horários e salários"; a Fase 11 à "Fase 6 — Relatórios"; a Fase 12 à
> "Fase 7 — Catálogo público"; a Fase 14 à "Fase 8 — Offline"; a Fase 15 à "Fase 9 —
> Migração e produção". A **Fase 0**, a **Fase 13** e o RBAC da **Fase 1** são
> requisitos transversais derivados dos RNF e do §4 do documento de análise.

---

## Fase 0 — Fundação técnica e padronização

**Objetivo:** preparar infraestrutura transversal antes de criar módulos, para evitar
retrabalho e inconsistência.

**Entregáveis**

- Handler de erro central em `app.js` com o mapa `ERROS_CONHECIDOS`
  (SQLSTATE → `status` + mensagem), sem stack em produção.
- Controladores com assinatura `(req, res, next)`: tratam os casos de domínio e
  encaminham o resto com `next(error)`.
- Validação mínima: os controladores só verificam **campos obrigatórios vazios**; o
  frontend valida formatos.

**Alterações**

- Uniformizar `controller/{categoria,servico,funcionario,cliente,usuario,perfil}.js`
  para o mesmo padrão de erros.
- Corrigir pendências de [`estado-e-pendencias.md`](./estado-e-pendencias.md):
  duração de sessão (alinhar JWT 30d × cookie 10d), unificar logs em português.

**Critério de conclusão**

- Backend arranca, endpoints atuais mantêm o mesmo comportamento.
- Erros de FK/unique/não numérico devolvem mensagens legíveis e códigos corretos.
- Testes de fumo dos endpoints existentes passam (curl documentado).

---

## Fase 1 — Contas, perfis e permissões (RBAC)

**Objetivo:** completar a gestão de contas (RF02) e o modelo de autorização por
permissões (documentacao.md §4, §7.1).

**Migrações**

- `016_evolucao_usuario_perfil.sql`
  - `usuario`: `estado varchar(20) default 'Ativo'` (`Ativo`/`Inativo`),
    `alteracao_obrigatoria_senha boolean default false`,
    `ultimo_acesso timestamp`, `data_criacao timestamp default now()`,
    `unique (telefone)`.
  - `perfil`: `descricao varchar(255)`, `estado varchar(20) default 'Ativo'`.
  - Semear perfis adicionais previstos: `4` Auditor (o antigo `3` Financeiro foi descontinuado).
- `017_create_permissao.sql` — `permissao (id, codigo unique, descricao, modulo)`,
  `perfil_permissao (id_perfil, id_permissao)`,
  `usuario_permissao (id_usuario, id_permissao, efeito 'conceder'|'revogar')`,
  `usuario_perfil` (opcional, se multi-perfil for aprovado).
- `018_seed_permissoes.sql` — cataloga permissões por módulo
  (`clientes:ler`, `clientes:escrever`, `pagamentos:anular`, `caixa:fechar`,
  `relatorios:ler`, `auditoria:ler`, `contas:gerir`, …) e associa aos perfis.

**Endpoints** (`/api/...`, plural nas rotas novas)

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/usuarios` | `contas:gerir` | Lista contas (id, nome, telefone, perfil, estado) |
| POST | `/api/usuarios` | `contas:gerir` | Cria conta com senha padrão `12345` (troca obrigatória) |
| GET | `/api/usuarios/:id` | `contas:gerir` | Detalhe |
| PUT | `/api/usuarios/:id` | `contas:gerir` | Atualiza dados/perfil/estado |
| PATCH | `/api/usuarios/:id/estado` | `contas:gerir` | Ativa/inativa conta |
| POST | `/api/usuarios/:id/repor-senha` | `contas:gerir` | Repõe a senha padrão `12345` (troca obrigatória) |
| POST | `/api/auth/alterar-senha` | autenticado | Troca de senha (1.º acesso/inatividade) |
| GET | `/api/perfis` | `contas:gerir` | Lista perfis + permissões |
| PUT | `/api/perfis/:id/permissoes` | `contas:gerir` | Atualiza permissões do perfil |
| PUT | `/api/usuarios/:id/permissoes` | `contas:gerir` | Exceções individuais |

**Regras de negócio**

- Conta `Inativo` não inicia sessão (bloquear no `/login`).
- Credencial temporária força `alteracao_obrigatoria_senha = true`; enquanto ativo, o
  login devolve estado que obriga a trocar a senha antes de usar a app.
- Registo público mantém perfil `Usuario` (compatibilidade).
- Log de permissões e contas na auditoria (Fase 13).

**Middleware novo**

- `authorizePermission(...codigos)` — resolve permissões efetivas = permissões do perfil
  (+ exceções `usuario_permissao`), com `revogar` a ter precedência.

**Ficheiros:** `repository/{usuario,perfil,permissao}.js`, `controller/{usuario,perfil}.js`,
`services/permissoes.js`, `routes/{usuario,perfil}.js`, middleware atualizado.

**Critério de conclusão**

- Administrador cria/desativa contas e atribui perfis.
- Utilizador inativo não entra; novo utilizador troca senha no 1.º acesso.
- `authorizePermission` protegendo um endpoint de teste.

---

## Fase 2 — Clientes

**Objetivo:** CRUD de clientes com pesquisa e regras de duplicação (RF03, HU-13–16).

**Migrações**

- `019_evolucao_cliente.sql`
  - `cliente`: tornar `apelido` opcional, adicionar `endereco varchar(255)`,
    `data_nascimento date`, `data_registo timestamp default now()`,
    `estado varchar(20) default 'Ativo'`, `saldo_pendente int default 0`,
    `unique (telefone)`.

> ⚠️ `telefone` é `int`. Recomenda-se migrar para `varchar(20)` para suportar
> normalização/prefixos sem perda de zeros à esquerda — decisão pendente (§8). Manter
> `int` é aceitável se o telefone continuar a ser normalizado como hoje.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/clientes?search=` | autenticado | Lista + pesquisa por nome/apelido/telefone |
| GET | `/api/clientes/:id` | autenticado | Detalhe |
| GET | `/api/clientes/:id/historico` | autenticado | Atendimentos + pendências (HU-03/14) |
| POST | `/api/clientes` | `clientes:escrever` | Cria (rejeita telefone duplicado) |
| PUT | `/api/clientes/:id` | `clientes:escrever` | Atualiza |
| DELETE | `/api/clientes/:id` | `clientes:escrever` | Remove se sem histórico; senão `409` + inativar |
| PATCH | `/api/clientes/:id/estado` | `clientes:escrever` | Ativa/inativa |

**Regras de negócio**

- Nome e telefone obrigatórios (RN30); telefone único (RN31, RN33).
- Pesquisa por correspondência parcial de nome ou telefone (RN32).
- Cliente com histórico não pode ser apagado fisicamente (RN34/RN02) → inativação.
- Antes de criar, devolver possíveis correspondências (by design no frontend; a API
  aceita `?verificarDuplicado=1`).

**Ficheiros:** `repository/cliente.js`, `controller/cliente.js`, `routes/cliente.js`,
`utils/validacoes.js` (novos validadores).

**Critério de conclusão**

- Criar, pesquisar, editar, inativar e apagar cliente; duplicado devolve `409`.

---

## Fase 3 — Serviços (evolução)

**Objetivo:** aproximar o recurso existente do modelo (RF04, HU-04–07): descrição,
duração, tipo de preço, estado e histórico de preços.

**Migrações** (esquema editado diretamente, sem `ALTER TABLE`)

- `002_create_servico.sql` — `servico`: `descricao text`, `duracao_min int`,
  `tipo_preco varchar(20) default 'fixo'` (`fixo`/`variavel`),
  `estado varchar(20) default 'Ativo'`, `data_criacao timestamp default now()`,
  `check (valor > 0)` e índice único de `lower(nome)` entre serviços ativos.
- `018_create_historico_preco_servico.sql`
  - `historico_preco_servico (id, servico_id, valor_anterior, valor_novo, alterado_por, criado_em)`.

**Endpoints**

- Manter os atuais (`GET /api/servicos`, `POST /api/servicos`, …).
- Adicionar: `PATCH /api/servicos/:id/estado` (ativar/inativar),
  `GET /api/servicos/:id/historico-precos`.
- Listagem por omissão mostra apenas **ativos**; `?estado=todos` para administração (RN16).

**Regras de negócio**

- Preço > 0 (RN13).
- Dois serviços **ativos** não podem ter o mesmo nome; serviço inativo pode (RN: HU-04).
- Alterar preço grava histórico e **não** afeta atendimentos passados (RN15/RN19/RN20).
- Serviço com execuções não pode ser apagado → inativar (RN17/RN18) — manter `409`.

**Critério de conclusão**

- Histórico de preços registado em cada alteração; inativação bloqueia seleção futura.

---

## Fase 4 — Funcionários (evolução)

**Objetivo:** completar cadastro (RF14, HU-08–12): contacto, documento, admissão, cargo,
estado, ligação a conta e configuração de comissão.

**Migrações** (esquema editado diretamente, sem `ALTER TABLE`)

- `007_create_funcionario.sql` — `funcionario`: `telefone varchar(20)`, `documento varchar(50) unique`,
  `cargo varchar(100)`, `data_admissao date`, `estado varchar(20) default 'Ativo'`,
  `id_usuario int unique`, `comissao_percentual numeric(5,2) default 30.00`.
- `019_funcionario_conta.sql` — FK `funcionario.id_usuario` → `usuario` (adicionada após `014`).
- `020_create_comissao_config.sql`
  - `comissao_config (id, funcionario_id, servico_id null, taxa_percentual, vigencia_inicio, vigencia_fim, estado)`
    — regra geral por funcionário ou específica por serviço (RN27).

**Endpoints**

- Manter CRUD atual; adicionar `PATCH /api/funcionarios/:id/estado`,
  `GET /api/funcionarios/:id/desempenho` (serviços e comissões do período, RN26),
  `GET`/`PUT /api/funcionarios/:id/comissao`.

**Regras de negócio**

- Documento único (RN21); novos funcionários entram `Ativo` (RN22).
- Comissão entre 0% e 100% (HU-12); específica sobrepõe-se à geral (RN27).
- Funcionário com histórico não é apagado fisicamente → inativar (RN24/RN25).

**Critério de conclusão**

- CRUD completo + inativação; comissão configurável e consultável.

---

## Fase 5 — Atendimentos e serviços realizados

**Módulo central.** Objetivo: registar um atendimento com um ou mais serviços, cada um
com o seu funcionário e preço efetivo (RF05, RF06, RN01–RN03, HU-01).

**Migrações** (esquema editado diretamente, sem `ALTER TABLE` exceto as FKs diferidas)

- `006_create_atendimento.sql` — remodelado: `cliente_id int not null` (FK `cliente`),
  `data_hora timestamp default now()`, `estado varchar(20) default 'Em andamento'`
  (`Em andamento`/`Concluido`/`Anulado`/`Pago`), `valor_bruto`, `valor_desconto`,
  `valor_total`, `registado_por`, `motivo_anulacao`.
- `012_create_atendimento_servico.sql` — substitui `execucao_servico` (renomeado):
  `atendimento_servico (id, atendimento_id FK, servico_id FK, funcionario_id FK,
  preco_original, tipo_preco, valor_desconto, valor_final, estado, registado_por, criado_em)`.
- `023_ligacoes.sql` — FKs `atendimento.registado_por`/`atendimento_servico.registado_por`
  → `usuario` (diferidas por ordem dos scripts).

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/atendimentos?de=&ate=&cliente=&funcionario=&estado=` | autenticado | Lista com filtros |
| GET | `/api/atendimentos/:id` | autenticado | Detalhe + serviços |
| POST | `/api/atendimentos` | `atendimentos:escrever` | Cria atendimento + serviços (transacional) |
| PUT | `/api/atendimentos/:id` | `atendimentos:escrever` | Atualiza cabeçalho |
| POST | `/api/atendimentos/:id/servicos` | `atendimentos:escrever` | Adiciona serviço |
| DELETE | `/api/atendimentos/:id/servicos/:itemId` | `atendimentos:escrever` | Remove serviço |
| PATCH | `/api/atendimentos/:id/concluir` | `atendimentos:escrever` | Marca "Concluído" |
| POST | `/api/atendimentos/:id/anular` | `atendimentos:anular` | Anulação com motivo (RF09) |

**Corpo de criação (exemplo)**

```json
{
  "cliente_id": 12,
  "servicos": [
    { "servico_id": 3, "funcionario_id": 2, "preco_praticado": 500, "desconto": 100 },
    { "servico_id": 7, "funcionario_id": 5, "preco_praticado": 300, "desconto": 0 }
  ]
}
```

**Regras de negócio**

- Atendimento exige cliente cadastrado e ativo (RN01, RN05/HU-01).
- Cada serviço exige funcionário responsável, que pode variar por serviço (RN03).
- `preco_praticado` gravado na transação (não lido dinamicamente do catálogo) — RN03/RF06.
- `valor_final = preco_praticado − desconto`; `valor_total` = soma (RN04).
- Serviço precisa de estar `Ativo` para ser selecionado (RN18).
- Cálculo do cabeçalho e inserção das linhas **na mesma transação** (RNF02).

**Ficheiros:** `repository/atendimento.js`, `services/atendimento.js`,
`controller/atendimento.js`, `routes/atendimento.js`.

**Critério de conclusão**

- Atendimento com vários serviços e funcionários distintos é gravado atomicamente.
- Preço praticado permanece imutável no histórico.

---

## Fase 6 — Pagamentos

**Objetivo:** registar pagamento (simples e dividido), controlar liquidação e anular
(RF08, RF09, RN04–RN05, HU-02).

**Migrações** (esquema editado diretamente, sem `ALTER TABLE` exceto as FKs diferidas)

- `005_create_pagamento.sql` — remodelado: `atendimento_id int not null` (FK `atendimento`),
  `valor_total`, `estado` (`Pendente`/`Parcial`/`Liquidado`/`Anulado`), `data_hora`,
  `registado_por`, `motivo_anulacao`.
- `021_create_pagamento_parcela.sql`
  - `pagamento_parcela (id, pagamento_id FK, metodo_pagamento varchar(50),
    valor int, referencia varchar(100), criado_em)`.
  - Métodos: `Dinheiro`, `M-Pesa`, e o serviço adicional a confirmar (§8).
- `023_ligacoes.sql` — FKs `pagamento.atendimento_id` → `atendimento` e
  `pagamento.registado_por` → `usuario` (diferidas por ordem dos scripts).

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/pagamentos?de=&ate=&estado=&metodo=` | autenticado | Lista com filtros |
| GET | `/api/pagamentos/:id` | autenticado | Detalhe + parcelas |
| POST | `/api/atendimentos/:id/pagamentos` | `pagamentos:registar` | Regista pagamento (parcelas) |
| GET | `/api/atendimentos/:id/pagamento` | autenticado | Estado de liquidação |
| POST | `/api/pagamentos/:id/anular` | `pagamentos:anular` | Anulação com motivo |

**Corpo (pagamento dividido)**

```json
{
  "parcelas": [
    { "metodo_pagamento": "Dinheiro", "valor": 300 },
    { "metodo_pagamento": "M-Pesa", "valor": 200, "referencia": "MP-123" }
  ]
}
```

**Regras de negócio**

- Um pagamento está sempre associado a um atendimento válido (RN06).
- Soma das parcelas ≤ valor devido; sem crédito nesta fase (RN07/RF08). Estado
  `Liquidado` apenas quando soma = devido (RN08).
- Toda parcela guarda data/hora e responsável (RN09).
- Anulação preserva histórico, exige motivo, recalcula derivados e **não** é apagamento
  físico (RF09, RN08).
- Pagamento (e anulação) escrevem em auditoria e impactam o caixa (Fase 8).

**Critério de conclusão**

- Pagamento simples e dividido funcionam; soma validada; atendimento muda para `Pago`
  só com liquidação total.

---

## Fase 7 — Comissões

**Objetivo:** calcular e disponibilizar comissões elegíveis (RF18, RN06, HU-12).

**Migrações**

- `022_create_comissao.sql`
  - `comissao (id, atendimento_servico_id FK unique, funcionario_id FK, taxa numeric(5,2),
    base_calculo int, valor_comissao int, estado varchar(20) default 'Elegivel',
    criado_em)`. Gerada dentro da transação de liquidação do pagamento
    (`repository/comissao.js`), de forma idempotente.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/comissoes?funcionario=&de=&ate=&estado=` | `relatorios:ler` | Lista |
| GET | `/api/funcionarios/:id/comissoes` | autenticado (próprio) / `relatorios:ler` | Comissões por período |

**Regras de negócio**

- Taxa padrão 30% (RN06); base = `valor_final` do serviço (após desconto).
- Geração **apenas** quando o pagamento estiver integralmente liquidado (RN05/RN28/RN10).
- Alterações de comissão não afetam pagamentos já efetuados (RN29).
- Geração idempotente: um `atendimento_servico` origina no máximo uma comissão
  (`unique`), evitando duplicação.
- Funcionários que não são funcionários não recebem comissão por terem conta (RF17).

**Critério de conclusão**

- Comissão gerada no momento da liquidação, com base correta e sem duplicados.

---

## Fase 8 — Caixa e despesas

**Objetivo:** caixa operacional único, movimentos, levantamentos, despesas com produtos,
saldo esperado, contagem física e fecho diário (RF10–RF13, RN09–RN13, HU-17/18).

**Migrações** (esquema editado diretamente, sem `ALTER TABLE` exceto as FKs diferidas)

- `024_create_caixa.sql` — `caixa (id, designacao unique, estado default 'Ativo')`; semeia
  "Caixa Principal".
- `025_create_caixa_sessao.sql` — `caixa_sessao (id, caixa_id FK, data_abertura,
  saldo_inicial int, aberto_por, data_fecho, valor_esperado int, valor_contado int,
  diferenca int, observacoes text, fechado_por, estado default 'Aberta')`; índice único
  parcial garante uma só sessão aberta.
- `026_create_movimento_caixa.sql` — `movimento_caixa (id, id_sessao FK,
  tipo_movimento, valor int, descricao, data_hora, origem, referencia_id, registado_por, estado)`;
  índice único parcial `(origem, referencia_id)` para idempotência.
- `027_create_categoria_despesa.sql` — categoria de despesa (fixa, variável, produtos, salários).
- `008_create_despesa.sql` (editado) — `despesa`: `descricao`, `categoria_id`, `valor_total`,
  `data_compra`, `metodo_pagamento`, `caixa_sessao_id`, `comprovativo`,
  `registado_por`, `estado`.
- `010`/`011` (editados) — `produto` com `estado`; `item_produto` com `preco_unitario` e
  `valor_total`. O stock detalhado fica fora do âmbito desta fase (RN25); a API básica de
  movimentos foi acrescentada depois.
- `030_ligacoes_despesa.sql` — FKs diferidas de `despesa` → `categoria_despesa`,
  `caixa_sessao`, `usuario`.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| POST | `/api/caixa/abrir` | `caixa:operar` | Abre sessão com saldo inicial |
| GET | `/api/caixa/atual` | `caixa:operar` | Sessão aberta + saldo esperado |
| POST | `/api/caixa/levantamento` | `caixa:levantar` | Regista levantamento |
| GET | `/api/caixa/movimentos` | `caixa:operar` | Movimentos da sessão |
| POST | `/api/caixa/fechar` | `caixa:fechar` | Contagem física + diferença + fecho |
| GET | `/api/caixa/fechos` | `relatorios:ler` | Histórico de fechos |
| GET/POST | `/api/despesas` | `despesas:escrever` | Listar/registar despesas |
| PUT/DELETE | `/api/despesas/:id` | `despesas:escrever` | Editar/remover |
| GET/POST | `/api/categorias-despesa` | `despesas:escrever` | Categorias de despesa |

**Regras de negócio**

- Caixa único (RN09). Se existir sessão aberta do dia anterior, **bloquear** novas
  operações até ao fecho (RN10) — com procedimento administrativo controlado.
- Receitas de pagamentos entram como movimentos; despesas pagas pelo caixa geram
  movimento de saída associado de forma inequívoca (evitar dupla contabilização, RF13).
- `valor_esperado` calculado a partir dos movimentos válidos; `diferenca = contado − esperado`.
- Fecho guarda responsável e data/hora (RN11). Levantamentos reduzem o saldo (RN12).
- Despesa com valor ≤ 0 é rejeitada (RN37/RF13). Despesas só por perfis autorizados (RN40).
- Operações financeiras idempotentes por `referencia_id` (RNF05).

**Critério de conclusão**

- Abrir → movimentos → fecho com diferença calculada; bloqueio quando caixa anterior
  não fechado; despesas refletidas no relatório e no caixa.

---

## Fase 9 — Fidelização

**Objetivo:** cartão de fidelização para clientes de ambos os sexos, aplicado a serviços
elegíveis até 200 MT (RF20, RN16–RN20).

**Migrações**

- `028_create_cartao_fidelizacao.sql` — `cartao_fidelizacao (id, cliente_id FK unique,
  data_ativacao, estado)`.
- `029_create_movimento_fidelizacao.sql` — `movimento_fidelizacao (id, cartao_id FK,
  atendimento_servico_id null, tipo_movimento
  ('marca'|'beneficio_ganho'|'beneficio_utilizado'|'correcao'), origem
  ('atendimento'|'manual'), data_hora, ciclo int, registado_por, observacao)`; índice único
  parcial `(atendimento_servico_id, tipo_movimento)`.
- `038_add_origem_movimento_fidelizacao.sql` — adiciona `origem` para distinguir as marcas
  de atendimento das introduzidas manualmente pelo administrador.
- `002_create_servico.sql` (editado) — `elegivel_fidelizacao boolean` marca os serviços
  que contam. A API só permite marcar serviços com valor até **200 MT**.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/clientes/:id/fidelizacao` | autenticado | Progresso + 6.º serviço pendente/benefícios utilizados |
| POST | `/api/clientes/:id/fidelizacao/correcao` | `fidelizacao:corrigir` | Correção autorizada |
| POST | `/api/clientes/:id/fidelizacao/marcas` | Administrador | Preenchimento manual de cartões físicos (até completar 5/5) |
| DELETE | `/api/clientes/:id/fidelizacao/marcas/:movimentoId` | Administrador | Remove marca do ciclo atual (manual ou de atendimento) e recalcula o cartão |
| POST | `/api/clientes/:id/fidelizacao/beneficios/utilizar` | Administrador | Regista a utilização do 6.º serviço gratuito |

**Regras de negócio**

- Uma marca de atendimento por cliente por dia, mesmo com vários serviços (RN17).
- Marcas manuais entram no mesmo ciclo e contam individualmente; o 5.º movimento do ciclo
  deixa o cartão completo independentemente de ser manual ou de atendimento.
- Ao 5.º serviço elegível o cartão fica **5/5** e o **6.º serviço é obrigatoriamente
  gratuito** (RN18). O direito não pode ser guardado para depois: não há acumulação (RN19).
- Enquanto o 6.º serviço estiver pendente, um atendimento com serviços elegíveis tem de
  marcar exatamente um deles com `usar_beneficio_fidelizacao: true`. Um atendimento só com
  serviços não elegíveis não consome o benefício.
- O cliente escolhe **um único** serviço elegível do atendimento, até 200 MT, para ser
  gratuito. Se o valor for inferior ao limite, o remanescente não é reutilizado.
- O serviço gratuito consome o benefício e **não** gera marca; os restantes serviços desse
  atendimento também não geram marca e o ciclo seguinte começa em zero (RN20).
- O preenchimento manual para em 5/5: para acrescentar novas marcas é necessário registar
  primeiro a utilização do 6.º serviço gratuito.
- A remoção de marcas está limitada ao ciclo atual. Se o cartão estava completo, o
  `beneficio_ganho` pendente também é removido; ciclos anteriores são corrigidos pela
  correção de fidelização. A marca de atendimento pode ser removida sem apagar o
  atendimento.
- A resposta de criação de atendimento inclui `fidelizacao`, para a UI refletir
  imediatamente o reset para 0/5 após o 6.º serviço gratuito.
- Distinguir histórico real de serviços, marcas visíveis e progresso do ciclo.
- Implementação **transacional e idempotente** (RNF02/RNF05) — operações repetidas ou
  sincronizações não geram benefícios duplicados.
- A elegibilidade é configurável por serviço e aplica-se a ambos os sexos; a API valida o
  limite de 200 MT ao configurar e ao usar o benefício.
- A linha do atendimento usa `usar_beneficio_fidelizacao: true`; o backend aplica o desconto
  integral e recusa mais de um serviço gratuito no mesmo atendimento.

**Critério de conclusão**

- Ciclo e benefícios corretos; repetição de operação não duplica marcas/benefícios.

---

## Fase 10 — Horários, assiduidade e salários

**Objetivo:** horários individuais, registo de assiduidade, processamento salarial mensal
e aprovação (RF15–RF19, RN14–RN15, HU relacionadas).

**Migrações**

- `031_create_horario_funcionario.sql` — `horario_funcionario (id, funcionario_id FK,
  dia_semana int, hora_entrada time, hora_saida time, estado)`.
- `032_create_assiduidade.sql` — `assiduidade (id, funcionario_id FK, data,
  hora_entrada_real, hora_saida_real, tipo_ocorrencia
  ('atraso'|'falta_justificada'|'falta_injustificada'|'saida_antecipada'|'ausencia'|'sem_registo'),
  justificacao, estado, registado_por)`; índice único `(funcionario_id, data)`.
- `033_create_processamento_salarial.sql` — `processamento_salarial (id, funcionario_id FK,
  periodo_inicio, periodo_fim, salario_base int, total_comissoes int, total_deducoes int,
  total_a_pagar int, estado ('Preparado'|'Aprovado'|'Pago'), aprovado_por, data_aprovacao,
  data_pagamento)`; índice único `(funcionario_id, periodo_inicio, periodo_fim)`.
- `034_create_deducao_salarial.sql` — `deducao_salarial (id, processamento_id FK on delete
  cascade, tipo, descricao, valor int, motivo, aprovado_por)`.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/funcionarios/:id/horarios` | autenticado (gestor ou próprio) | Programação semanal (vários turnos por dia) |
| POST/PUT | `/api/funcionarios/:id/horarios` | `horarios:gerir` | Criar turno / substituir a lista |
| PUT/DELETE | `/api/horarios/:id` | `horarios:gerir` | Atualizar / remover um único turno |
| GET/POST | `/api/assiduidade` | `assiduidade:gerir` | Registos e ocorrências |
| PUT | `/api/assiduidade/:id` | `assiduidade:gerir` | Correção (com auditoria) |
| PUT | `/api/assiduidade/dia` | `assiduidade:gerir` | Criar/atualizar o dia do controlo mensal (upsert) |
| GET | `/api/salarios/processamentos?periodo=` | `salarios:gerir` | Lista |
| GET | `/api/salarios/processamentos/:id` | `salarios:gerir` | Detalhe + deduções |
| POST | `/api/salarios/processar` | `salarios:gerir` | Gera processamento do período (`{ periodo: 'AAAA-MM' }`) |
| PUT | `/api/salarios/processamentos/:id/deducoes` | `salarios:gerir` | Deduções (substitui a lista) |
| PATCH | `/api/salarios/processamentos/:id/aprovar` | `salarios:aprovar` | Aprovação |
| PATCH | `/api/salarios/processamentos/:id/pagar` | `salarios:gerir` | Registo do pagamento |

**Regras de negócio**

- Salário base + comissões elegíveis − deduções = total a pagar (RF17).
- Distinguir ocorrência de assiduidade **do** efeito salarial (RN15).
- Fluxo Preparado → Aprovado → Pago (RF19); só admin autorizado aprova; deduções só em Preparado.
- Administrador que não é funcionário não recebe salário/comissão (RF17) — só funcionários ativos entram no processamento.
- Comissões `Elegivel` do período passam a `Paga` quando o processamento é pago (evita duplo pagamento).
- Alterações de assiduidade e salário são auditadas (auditoria completa na Fase 13).

**Critério de conclusão**

- Processamento mensal com valores conferíveis; pagamento registado no histórico.

---

## Fase 11 — Relatórios

**Objetivo:** relatórios operacionais e financeiros com filtros de período (RF21, §12.9).

**Endpoints** (todos `relatorios:ler`; restritos por permissão/ocultação financeira)

| Método | Rota | Conteúdo |
| --- | --- | --- |
| GET | `/api/relatorios/resumo?de=&ate=` | Receita, despesas, resultado |
| GET | `/api/relatorios/caixa?de=&ate=` | Entradas/saídas, saldo esperado, diferenças |
| GET | `/api/relatorios/servicos?de=&ate=` | Serviços mais realizados |
| GET | `/api/relatorios/funcionarios?de=&ate=` | Serviços e comissões por funcionário |
| GET | `/api/relatorios/assiduidade?de=&ate=` | Assiduidade |
| GET | `/api/relatorios/clientes?de=&ate=` | Clientes mais frequentes |
| GET | `/api/relatorios/fidelizacao?de=&ate=` | Benefícios ganhos/utilizados |
| GET | `/api/relatorios/anulacoes?de=&ate=` | Histórico de anulações |
| GET | `/api/relatorios/movimentos?de=&ate=` | Movimentos financeiros |

> Implementado em `repository/relatorio.js` (SQL agregado) + `controller/relatorio.js`.
> `de`/`ate` são **opcionais**; sem filtro devolve todo o histórico. `resumo` devolve
> `{ receita, despesas, resultado }`; `caixa`/`fidelizacao` devolvem um objeto; os restantes
> devolvem arrays.

**Regras de negócio**

- Consultas agregadas (SQL `group by`) — sem dupla contabilização (RNF10).
- Filtragem por período e, quando aplicável, funcionário/serviço/método/estado.
- Exportação (CSV agora; PDF/Excel a confirmar — §8). Nunca expor dados no catálogo público.

**Critério de conclusão**

- Indicadores do dashboard alimentados por dados reais; totais conferem com os movimentos.

---

## Fase 12 — Catálogo público

**Objetivo:** consulta pública dos serviços ativos (RF22, RN22, §12.11).

**Endpoints** (sem `authenticate`)

| Método | Rota | Conteúdo |
| --- | --- | --- |
| GET | `/api/public/servicos` | Serviços ativos (nome, descrição, categoria, tipo de preço) |
| GET | `/api/public/servicos/:id` | Detalhe público |

> Implementado com funções públicas em `repository/servico.js` (`findPublicos`,
> `findPublicoById`) e `controller/publico.js`; as rotas **não** usam `authenticate`.
> `findPublicoById` devolve `404` para serviços inativos (não só inexistentes), para não
> revelar serviços retirados.

**Regras de negócio**

- Apenas serviços ativos e campos de divulgação (RN22) — sem dados internos.
- Preço apresentado conforme tipo fixo/variável (§8, decisão pendente).
- Não expor clientes, funcionários ou qualquer dado pessoal (RNF11).

**Critério de conclusão**

- Página pública funciona sem sessão e sem vazar dados internos.

---

## Fase 13 — Auditoria (consolidação)

**Objetivo:** registo auditável transversal e consulta protegida (RF23, RN21, RNF03).

**Migrações**

- `035_create_log_auditoria.sql` — `log_auditoria (id, id_utilizador, data_hora,
  entidade, id_registo_afetado, tipo_operacao, valores_anteriores jsonb,
  valores_posteriores jsonb, motivo, identificador_operacao)`; índices por entidade e data,
  e um **trigger** que rejeita `UPDATE`/`DELETE` (append-only na BD).

**Componentes**

- `services/auditoria.js` → `registar({ id_utilizador, entidade, id_registo, operacao,
  antes, depois, motivo }, db)`, chamado **dentro da mesma transação** da operação
  (recebe o `client`); fora de transação usa o `pool` por omissão.
- Integrado em: **pagamentos** (criar/anular), **atendimentos** (criar/anular),
  **caixa** (abrir, levantamento, fechar), **despesas** (criar/atualizar/remover),
  **salários** (criar/atualizar deduções/aprovar/pagar), **assiduidade** (criar/atualizar),
  **fidelização** (corrigir) e **permissões** (utilizador e perfil).
- Logs **append-only**: sem `UPDATE`/`DELETE` pela aplicação, garantido por trigger.

**Endpoints**

| Método | Rota | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/auditoria?entidade=&utilizador=&utilizador_nome=&perfil=&de=&ate=&operacao=` | `auditoria:ler` | Consulta (filtros opcionais) |
| GET | `/api/auditoria/opcoes` | `auditoria:ler` | Opções de operação, perfil e utilizador |
| GET | `/api/auditoria/:id` | `auditoria:ler` | Detalhe |

**Critério de conclusão**

- Operações relevantes deixam histórico com utilizador, data/hora e valores.

---

## Fase 14 — Sincronização offline

> Fase arquitetural; requer a decisão pendente §8 sobre dispositivo/estratégia (RNF04).

**Objetivo:** permitir operações offline com sincronização segura e idempotente
(RF25, RN23, RNF05).

**Migrações**

- `042_create_operacao_sincronizacao.sql` — `operacao_sincronizacao (id,
  identificador_unico unique, tipo_entidade, id_registo, tipo_operacao, data_criacao,
  estado_sincronizacao, tentativas, ultima_tentativa, erro)`.
- Adicionar a tabelas financeiras uma chave idempotente (`identificador_unico`)
  para impedir duplicação de receitas/despesas/comissões.

**Endpoints**

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/sync/push` | Recebe lote de operações locais (idempotente) |
| GET | `/api/sync/pull?desde=` | Devolve alterações desde um ponto |
| GET | `/api/sync/estado` | Estado da fila |

**Regras de negócio**

- Processamento idempotente por `identificador_unico` (RNF05).
- Prevenção de duplicações em pagamentos, movimentos de caixa e fidelização.
- Tratamento de conflitos e repetição segura documentados no `docs/`.

**Critério de conclusão**

- Operação offline reenviada **não** duplica receita/despesa/comissão.

---

## Fase 15 — Qualidade, segurança e produção

**Objetivo:** consolidar qualidade, segurança e entrada em produção.

**Tarefas**

- **Testes:** `node:test` para regras críticas (pagamento, comissão, caixa, fidelização,
  sessão) e de integração (endpoints); testes manuais em `docs/`.
- **Segurança:** confirmar `JWT_SECRET` forte e rodado (ver
  [`estado-e-pendencias.md`](./estado-e-pendencias.md)); `.env` nunca comitado; cookie
  `secure` em produção; rate limiting e *helmet-like* headers se aprovado (§8).
- **Backups:** script de cópia semanal + procedimento de restauro documentado (RF24, RNF06).
- **Migração de dados:** importação controlada dos cadernos (clientes, cartões, serviços),
  com verificação de duplicados (RN24).
- **Documentação:** atualizar `api.md`, `base-de-dados.md`, `estado-e-pendencias.md` e
  este documento a cada fase concluída.
- **Performance:** índices para colunas de filtro (`cliente_id`, `data_hora`, `estado`,
  `funcionario_id`), paginação em todas as listagens.

**Critério de conclusão**

- Suíte de testes verde; backup restaurável; documentação sincronizada.

---

## Fase 16 — Fecho das decisões pendentes (lacunas da análise)

**Estado:** 📝 a cargo do utilizador (produto/negócio) — não é código.

**Objetivo:** fechar as lacunas da análise antes (ou durante) as fases que delas dependem,
registando aqui a decisão final de cada questão do §16 de
[`documentacao.md`](./documentacao.md). Serve de checklist para não se implementar regras
"por adivinhação".

**Como usar:** para cada item, escrever a decisão numa frase e o respetivo impacto na
implementação (fase/regra afetada). Quando uma decisão alterar o comportamento já
implementado, deve ser aberta uma tarefa na fase correspondente.

| # | Questão (§16) | Decisão (a preencher) | Impacto |
| --- | --- | --- | --- |
| 1 | Métodos de pagamento (2.º serviço móvel além de M-Pesa) | _pendente_ | Fase 6 (parcelas) |
| 2 | Descontos: valor fixo, percentagem ou ambos | _pendente_ | Fase 5 |
| 3 | Deduções salariais: automáticas ou manuais | _pendente_ | Fase 10 (implementadas como manuais/aprovadas) |
| 4 | Anulações: todos os admins ou restrito por módulo | _pendente_ | Fases 5, 6 |
| 5 | Comissões: serviços gratuitos, pagamentos anulados, reembolsos e correções | _pendente_ | Fases 6, 7 |
| 6 | Caixa: valor inicial, forma de abertura e correção de um fecho incorreto | _pendente_ | Fase 8 |
| 7 | Horários: turnos semanais variáveis e horários excecionais | _pendente_ | Fase 10 |
| 8 | Catálogo público: preço fixo, preço inicial ou indicação de "variável" | _pendente_ | Fase 12 |
| 9 | Relatórios: formatos de exportação (PDF/Excel) | _pendente_ | Fase 11 |
| 10 | Migração: dados históricos a recuperar além de clientes e cartões | _pendente_ | Fase 15 |
| 11 | Offline: dispositivo, instalação local e estratégia de sincronização | _pendente_ | Fase 14 |
| 12 | Fidelização: vários serviços no mesmo dia e apresentação do progresso | ✅ resolvido (1 marca/dia; grátis não conta) | Fase 9 |
| 13 | Reservas de clientes: introduzir agendamento numa fase futura? | _pendente_ | §12 (fora do âmbito atual) |
| 14 | Controlo de stock: requisitos detalhados quando o módulo existir | _pendente_ | §12 (fora do âmbito atual) |

**Critério de conclusão**

- Todas as questões com decisão registada e as fases afetadas ajustadas em conformidade.

---

## 4. Matriz de permissões alvo

Expande a matriz simples atual (`Administrador`/`Usuario`) para a granularidade das
Fases 1 e seguintes. Cada código corresponde a `modulo:acao` em `permissao.codigo`.
O perfil `Financeiro` foi descontinuado; as suas permissões passam a ser do
`Administrador`.

| Permissão | Administrador | Usuario | Auditor |
| --- | :---: | :---: | :---: |
| `clientes:ler` | ✅ | ✅ | ✅ |
| `clientes:escrever` | ✅ | ✅ | — |
| `servicos:ler` | ✅ | ✅ | ✅ |
| `servicos:escrever` | ✅ | — | — |
| `funcionarios:ler` | ✅ | — | ✅ |
| `funcionarios:escrever` | ✅ | — | — |
| `atendimentos:escrever` | ✅ | ✅ | — |
| `atendimentos:anular` | ✅ | — | — |
| `pagamentos:registar` | ✅ | ✅ | — |
| `pagamentos:anular` | ✅ | — | — |
| `caixa:operar` | ✅ | ✅ | — |
| `caixa:levantar` | ✅ | — | — |
| `caixa:fechar` | ✅ | — | — |
| `despesas:escrever` | ✅ | — | — |
| `estoque:escrever` | ⚠️ (não semeada) | — | — |
| `fidelizacao:corrigir` | ✅ | — | — |
| `horarios:gerir` | ✅ | — | — |
| `assiduidade:gerir` | ✅ | — | — |
| `salarios:gerir` | ✅ | — | — |
| `salarios:aprovar` | ✅ | — | — |
| `relatorios:ler` | ✅ | — | ✅ |
| `contas:gerir` | ✅ | — | — |
| `auditoria:ler` | ✅ | — | ✅ |

> Esta matriz é a **configuração inicial**; deve ser ajustável por perfil e por
> utilizador (exceções individuais), conforme documentacao.md §4.
>
> O seed `drizzle/0001_seed.sql` cria **22 permissões**. A permissão `estoque:escrever`,
> exigida pelas rotas de stock, **não consta** do seed — é necessário acrescentá-la e
> concedê-la (ou fazê-lo manualmente em cada base).

---

## 5. Regras de negócio de referência (consolidado)

Rastreio rápido das regras mais críticas e onde são aplicadas:

| Regra | Descrição | Fase |
| --- | --- | --- |
| RN03 | Preço praticado gravado na transação (imutável) | 5 |
| RN04 | Pagamento dividido em parcelas | 6 |
| RN05 | Comissão só com pagamento integral | 6, 7 |
| RN06 | Comissão padrão 30% sobre valor após desconto | 7 |
| RN08 | Anulação preserva histórico + motivo | 5, 6 |
| RN09 | Caixa único | 8 |
| RN10 | Fecho diário obrigatório; bloqueio no dia seguinte | 8 |
| RN17–RN20 | Regras de fidelização (marca diária, serviço elegível até 200 MT, 5→1, acúmulo, ciclo) | 9 |
| RN30–RN34 | Clientes (obrigatórios, telefone único, inativação) | 2 |
| RN21–RN29 | Funcionários e comissões | 4, 7 |
| RN35–RN40 | Despesas e empréstimos | 8 |

---

## 6. Dependências e decisões pendentes

Antes de implementar as fases afetadas, confirmar as decisões de
[documentacao.md](./documentacao.md) §16. A lista consolidada — **14 questões, 13 ainda
pendentes** (a fidelização foi resolvida) — e o respetivo impacto estão na **Fase 16**,
abaixo. Não mantenha listas paralelas: qualquer decisão nova deve ser registada nessa
tabela.

---

## 7. Checklist de progresso por fase

Copiar para o PR de cada fase:

```text
Fase N — <nome>
[ ] Migração Drizzle gerada (`npm run db:generate`) e revisada
[ ] repository/ com query builder do Drizzle (ou `sql` parametrizado)
[ ] service/ quando há regras/transações
[ ] controller/ com validação e tradução de erros
[ ] routes/ registadas em app.js e protegidas
[ ] Validações adicionadas em utils/validacoes.js (+ espelho no frontend)
[ ] Auditoria nos pontos exigidos
[ ] Documentação atualizada (api.md, base-de-dados.md, este doc)
[ ] Testes (node:test) para regras críticas
[ ] Endpoints verificados com curl
```

---

## 8. Ordem recomendada de execução

1. **Fase 0** (fundação) →
2. **Fase 1** (RBAC) em paralelo com **Fases 2, 3, 4** (entidades isoladas) →
3. **Fase 5** (atendimentos) →
4. **Fase 6** (pagamentos) →
5. **Fase 7** (comissões) em paralelo com **Fase 9** (fidelização) →
6. **Fase 8** (caixa e despesas) →
7. **Fase 10** (horários, assiduidade, salários) →
8. **Fase 11** (relatórios) →
9. **Fase 12** (catálogo público) →
10. **Fase 13** (auditoria) ao longo de todas →
11. **Fase 14** (offline) →
12. **Fase 15** (qualidade e produção) →
13. **Fase 16** (fecho das decisões pendentes) em paralelo, à medida que cada fase dependente avança.

> A auditoria (Fase 13) e as convenções da Fase 0 são **transversais**: os helpers devem
> existir cedo, mesmo que os endpoints de consulta só venham no fim. As decisões da
> **Fase 16** devem ser fechadas antes das fases que delas dependem, para não implementar
> regras por adivinhação.
