# API

[← Voltar ao índice](./README.md)

## Convenções gerais

- **Formato:** JSON (`Content-Type: application/json`).
- **URL base (dev):** `http://localhost:5000` (conforme `PORT` no `.env`).
- **Prefixo de rotas:** `/api`.
- **Autenticação:** cookie `token` (`httpOnly`). Pedidos autenticados devem incluir cookies
  (`withCredentials` no Axios).
- **Corpo das respostas:** os controladores de `funcionario`, `servico` e `categoria`
  devolvem **arrays/objetos directos**; `auth` devolve objetos embrulhados
  (`{ user }`, `{ users }`, `{ message }`).

## Códigos de estado usados

| Código | Significado |
| --- | --- |
| `200` | Sucesso |
| `201` | Recurso criado |
| `204` | Sucesso sem conteúdo (delete) |
| `400` | Dados inválidos / FK inexistente |
| `401` | Não autenticado (token ausente/inválido) |
| `403` | Autenticado mas sem perfil autorizado |
| `404` | Recurso ou rota inexistente |
| `409` | Conflito (delete bloqueado por FK) |
| `500` | Erro interno |

---

## Autenticação — `/api/auth`

Implementado em `Backend/src/routes/auth.js`.

### `POST /api/auth/register`

Cria um utilizador com perfil `Usuario`. **Não** inicia sessão.

**Corpo:**

```json
{ "nome": "Ana Silva", "telefone": "841234567", "senha": "senha123" }
```

**Respostas:**

- `201` — criado:
  ```json
  {
    "message": "usuario registrado com sucesso",
    "user": { "id": 3, "nome": "Ana Silva", "telefone": 841234567, "perfil": "Usuario" }
  }
  ```
- `400` — `{ "message": "nome ou telefone ou senha nao forma providenciadas" }`
- `400` — erro de campo: `{ "field": "telefone", "message": "O usuario ja existe" }`
  (campos possíveis: `nome`, `telefone`, `senha`)

### `POST /api/auth/login`

Autentica por telefone + senha e emite o cookie `token`.

**Corpo:**

```json
{ "telefone": "841234567", "senha": "senha123" }
```

**Respostas:**

- `200` — sucesso (define `Set-Cookie: token=...`):
  ```json
  {
    "message": "login feito com sucesso",
    "user": { "id": 3, "nome": "Ana Silva", "telefone": 841234567, "perfil": "Usuario", "deve_alterar_senha": false }
  }
  ```
  > `deve_alterar_senha: true` sinaliza que a conta usa uma credencial temporária.
- `400` — telefone/senha ausentes ou telefone inválido (`{field,message}`)
- `401` — `{ "message": "Telefone ou senha invalidos" }`
- `403` — `{ "message": "Conta inativa: contacte o administrador" }`

### `GET /api/auth/me` 🔒

Devolve o utilizador da sessão actual.

**Resposta `200`:**

```json
{
  "user": {
    "id": 3, "nome": "Ana Silva", "telefone": 841234567,
    "id_perfil": 2, "perfil": "Usuario", "estado": "Ativo",
    "alteracao_obrigatoria_senha": false,
    "permissoes": ["clientes:ler", "clientes:escrever", "atendimentos:escrever"]
  }
}
```

- `401` — sem token, token inválido/expirado ou utilizador inexistente.
- `403` — conta inativa.

### `GET /api/auth/users` 🔒👑

Lista todos os utilizadores. **Só `Administrador`.**

**Resposta `200`:**

```json
{
  "users": [
    { "id": 1, "nome": "Admin", "telefone": 821111111, "id_perfil": 1 },
    { "id": 3, "nome": "Ana Silva", "telefone": 841234567, "id_perfil": 2 }
  ]
}
```

- `403` — perfil sem autorização.

### `POST /api/auth/logout`

Limpa o cookie `token`.

**Resposta `200`:**

```json
{ "message": "logged out sucessfully" }
```

---

## Funcionários — `/api/funcionarios`

- `GET /api/funcionarios` 🔒 — lista (ordenada por nome)
- `GET /api/funcionarios/:id` 🔒 — um funcionário (`200`/`404`)
- `GET /api/funcionarios/:id/desempenho?de=&ate=` 🔒 — serviços e comissões do período
  (`{ periodo, total_servicos, total_valor, total_comissao, servicos }`)
- `GET /api/funcionarios/:id/comissao` 🔒 — `{ comissao_percentual, configuracoes }`
- `POST /api/funcionarios` 🔒🛠️ — corpo: `{ nome, salario, telefone?, documento?, cargo?,
  data_admissao?, comissao_percentual?, id_usuario? }`. `201`
- `PUT /api/funcionarios/:id` 🔒🛠️ — actualização parcial. `200` / `404`
- `PUT /api/funcionarios/:id/comissao` 🔒🛠️ — corpo: `{ configuracoes: [{ servico_id?, taxa_percentual,
  vigencia_inicio?, vigencia_fim? }] }` (substitui a configuração)
- `PATCH /api/funcionarios/:id/estado` 🔒🛠️ — `{ "estado": "Ativo" | "Inativo" }`
- `DELETE /api/funcionarios/:id` 🔒🛠️ — `204`; `409` se existirem atendimentos

> Escrita requer a permissão `funcionarios:escrever`. `documento` é único (`409`).

## Serviços — `/api/servicos`

- `GET /api/servicos?estado=todos` 🔒 — lista com o nome da categoria. Por omissão só
  **ativos**; `?estado=todos` inclui inativos.
- `GET /api/servicos/:id` 🔒 — um serviço (`200`) ou `404`
- `GET /api/servicos/:id/historico-precos` 🔒 — histórico de alterações de preço
- `POST /api/servicos` 🔒🛠️ — corpo: `{ nome, valor, categoria_id, descricao?, duracao_min?,
  tipo_preco?, elegivel_fidelizacao? }`. `201`
  - `400` se faltar campo ou `valor <= 0`; `409` se já existir um serviço **ativo** com o nome
- `PUT /api/servicos/:id` 🔒🛠️ — actualização parcial. `200` / `404` / `400`
  - Alterar `valor` grava automaticamente o histórico de preços
- `PATCH /api/servicos/:id/estado` 🔒🛠️ — `{ "estado": "Ativo" | "Inativo" }`
- `DELETE /api/servicos/:id` 🔒🛠️ — `204` / `404`
  - `409` se existirem atendimentos que usam o serviço

> Escrita requer a permissão `servicos:escrever`.

## Categorias de serviço — `/api`

- `GET /api/categorias` 🔒 — `[{ id, nome }]`
- `GET /api/categorias/:id` 🔒 — `200` / `404`
- `POST /api/categorias` 🔒👑 — corpo: `{ nome }`. `201`
- `PUT /api/categorias/:id` 🔒👑 — corpo: `{ nome }`. `200` / `404`
- `DELETE /api/categorias/:id` 🔒👑 — `204` / `404`
  - `409` se existirem serviços nesta categoria

Legenda: 🔒 requer sessão · 👑 só `Administrador` · 🛠️ requer a permissão indicada.

---

## Contas, perfis e permissões — `/api`

> Autorização por permissões (RBAC). Todas as rotas exigem a permissão `contas:gerir`
> (por padrão, `Administrador`).

### Utilizadores

- `GET /api/usuarios` — lista `[{ ... }]`
- `GET /api/usuarios/:id` — um utilizador (`200`/`404`)
- `POST /api/usuarios` — cria conta. Corpo: `{ nome, telefone, id_perfil, senha? }`
  - Sem `senha`, o sistema gera uma **credencial temporária** e devolve-a uma única vez
    em `senha_temporaria` (obriga a troca no próximo acesso).
- `PUT /api/usuarios/:id` — atualização parcial (`nome`, `telefone`, `id_perfil`)
- `PATCH /api/usuarios/:id/estado` — `{ "estado": "Ativo" | "Inativo" }`
- `POST /api/usuarios/:id/repor-senha` — repõe credencial temporária e força a troca
- `GET /api/usuarios/:id/permissoes` — `{ efetivas: [...], overrides: [...] }`
- `PUT /api/usuarios/:id/permissoes` — corpo: `{ conceder: [codigos], revogar: [codigos] }`

### Perfis e permissões

- `GET /api/perfis` — lista perfis
- `GET /api/perfis/:id` — perfil + permissões
- `POST /api/perfis` — cria perfil. Corpo: `{ nome, descricao }`
- `PUT /api/perfis/:id` — atualiza (`nome`, `descricao`, `estado`)
- `PUT /api/perfis/:id/permissoes` — corpo: `{ permissoes: [codigos] }`
- `GET /api/permissoes` — catálogo de permissões (`{ id, codigo, descricao, modulo }`)

### Alteração de senha (própria)

- `POST /api/auth/alterar-senha` 🔒 — corpo: `{ senha_atual, senha_nova }`

## Clientes — `/api/clientes`

- `GET /api/clientes?search=` 🔒 — lista `[{ ... }]`;
  `search` pesquisa por nome, apelido ou telefone.
- `GET /api/clientes/:id` 🔒 — um cliente (`200`/`404`)
- `POST /api/clientes` 🔒 — corpo: `{ nome, apelido?, telefone, endereco?, data_nascimento? }`.
  `201`; `409 { field: "telefone" }` se o telefone já existir.
- `PUT /api/clientes/:id` 🔒 — atualização parcial
- `PATCH /api/clientes/:id/estado` 🔒 — `{ "estado": "Ativo" | "Inativo" }`
- `DELETE /api/clientes/:id` 🔒 — `204`; `409` se existirem atendimentos associados

> Escrita em clientes requer a permissão `clientes:escrever` (Administrador e Usuario).

---

## Atendimentos — `/api/atendimentos`

- `GET /api/atendimentos?de=&ate=&cliente=&funcionario=&estado=` 🔒 — lista com filtros
- `GET /api/atendimentos/:id` 🔒 — detalhe + `servicos`
- `POST /api/atendimentos` 🔒🛠️ — corpo:
  `{ cliente_id, servicos: [{ servico_id, funcionario_id, preco_praticado, desconto?, tipo_preco? }] }`.
  Cria cabeçalho + linhas **numa transação**. `201`
  - `400` se faltar `cliente_id`/`servicos` ou campos de cada serviço
  - `409` se algum serviço estiver **inativo**
- `PUT /api/atendimentos/:id` 🔒🛠️ — corpo: `{ cliente_id }`
- `POST /api/atendimentos/:id/servicos` 🔒🛠️ — adiciona serviço (recalcula totais)
- `DELETE /api/atendimentos/:id/servicos/:itemId` 🔒🛠️ — `204` (recalcula totais)
- `PATCH /api/atendimentos/:id/concluir` 🔒🛠️ — marca `Concluido`
- `POST /api/atendimentos/:id/anular` 🔒🛠️(`atendimentos:anular`) — corpo: `{ motivo }`

> Totais do cabeçalho: `valor_bruto` = Σ `preco_original`,
> `valor_desconto` = Σ `valor_desconto`, `valor_total` = Σ `valor_final`
> (`valor_final = preco_original − desconto`). O preço fica gravado na linha.

## Pagamentos — `/api`

- `GET /api/pagamentos?de=&ate=&estado=&metodo=` 🔒 — lista com filtros
- `GET /api/pagamentos/:id` 🔒 — detalhe + `parcelas`
- `POST /api/atendimentos/:id/pagamentos` 🔒(`pagamentos:registar`) — corpo:
  `{ parcelas: [{ metodo_pagamento, valor, referencia? }] }`. `201`
  - `400` se a soma das parcelas exceder o valor devido
- `GET /api/atendimentos/:id/pagamento` 🔒 — estado de liquidação
- `POST /api/pagamentos/:id/anular` 🔒(`pagamentos:anular`) — corpo: `{ motivo }`

> Um pagamento está `Liquidado` quando a soma das parcelas iguala o valor devido;
> nesse momento o atendimento passa a `Pago` e as **comissões** são geradas.
> Anular um pagamento recalcula o estado do atendimento (não apaga nada).

## Comissões — `/api`

- `GET /api/comissoes?funcionario=&de=&ate=&estado=` 🔒(`relatorios:ler`) — lista
- `GET /api/funcionarios/:id/comissoes?de=&ate=` 🔒 — comissões do funcionário
  (o próprio via conta ligada, ou `relatorios:ler`)

> A taxa é a específica do serviço (`comissao_config`) ou, na sua ausência, a geral do
> funcionário; a base é o `valor_final` do serviço. A geração é idempotente.

---

## Caixa — `/api/caixa`

- `POST /api/caixa/abrir` 🔒(`caixa:operar`) — corpo: `{ saldo_inicial }`. `201`
  - `409` se já existir uma sessão aberta (caixa único)
- `GET /api/caixa/atual` 🔒(`caixa:operar`) — `{ aberta, sessao, saldo_esperado }`
- `POST /api/caixa/levantamento` 🔒(`caixa:levantar`) — corpo: `{ valor, descricao? }`
- `GET /api/caixa/movimentos` 🔒(`caixa:operar`) — movimentos da sessão aberta (`404` se fechada)
- `POST /api/caixa/fechar` 🔒(`caixa:fechar`) — corpo: `{ valor_contado, observacoes? }`
- `GET /api/caixa/fechos?de=&ate=` 🔒(`relatorios:ler`) — histórico de fechos

> `saldo_esperado = saldo_inicial + entradas − saídas − levantamentos`.
> `diferenca = valor_contado − valor_esperado`. Os pagamentos geram **entradas** e as
> despesas pagas pelo caixa geram **saídas**, ambos idempotentes por `referencia_id`.

## Despesas — `/api/despesas`

- `GET /api/despesas?de=&ate=&categoria=&estado=` 🔒 — lista com filtros
- `GET /api/despesas/:id` 🔒 — detalhe + `itens`
- `POST /api/despesas` 🔒(`despesas:escrever`) — corpo:
  `{ descricao, valor_total?, categoria_id?, data_compra?, metodo_pagamento?, caixa_sessao_id?, comprovativo?, itens? }`
  - `itens: [{ produto_id, funcionario_id?, quantidade, preco_unitario }]`; se existirem,
    `valor_total` é calculado a partir deles
  - `caixa_sessao_id` gera o movimento de saída no caixa
  - `400` se `valor_total <= 0`
- `PUT /api/despesas/:id` 🔒(`despesas:escrever`) — actualização parcial
- `DELETE /api/despesas/:id` 🔒(`despesas:escrever`) — `204`
- `GET/POST /api/categorias-despesa` 🔒(`despesas:escrever`) — `{ nome, tipo? }`

## Fidelização — `/api/clientes/:id/fidelizacao`

- `GET /api/clientes/:id/fidelizacao` 🔒 — progresso:
  `{ ciclo_atual, meta, marcas_no_ciclo, beneficios_disponiveis, beneficios_utilizados, historico }`
- `POST /api/clientes/:id/fidelizacao/correcao` 🔒(`fidelizacao:corrigir`) — corpo:
  `{ tipo_movimento?, ciclo?, observacao? }`

> Só serviços com `elegivel_fidelizacao` contam. Uma marca por cliente por dia; ao 5.º
> corte do ciclo gera-se um benefício (acumulam). Um corte gratuito consome um benefício
> e conta para o ciclo seguinte. A geração é idempotente por `atendimento_servico_id`.

---

## Exemplos com `curl`

```bash
# registo
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","telefone":"841234567","senha":"senha123"}'

# login (guarda o cookie em cookies.txt)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefone":"841234567","senha":"senha123"}'

# sessão actual (usa o cookie)
curl -b cookies.txt http://localhost:5000/api/auth/me

# listar serviços
curl -b cookies.txt http://localhost:5000/api/servicos

# criar categoria (só Administrador)
curl -b cookies.txt -X POST http://localhost:5000/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cabelo"}'
```

## Erros padrão

| Situação | Resposta |
| --- | --- |
| Rota inexistente | `404 { "message": "Rota nao encontrada" }` |
| Erro interno | `500 { "message": "Erro interno do servidor" }` |
| Sem token | `401 { "message": "Nao autenticado: token em falta" }` |
| Token inválido/expirado | `401 { "message": "Nao autenticado: token invalido ou expirado" }` |
| Perfil sem permissão | `403 { "message": "Acesso negado: perfil sem autorizacao" }` |
