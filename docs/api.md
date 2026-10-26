# API

[← Voltar ao índice](./README.md)

> Para exemplos de pedido e resposta esperada de cada rota, incluindo cenários
> ponta-a-ponta e verificação dos requisitos, consulta
> [`testes-endpoints.md`](./testes-endpoints.md).

## Convenções gerais

- **Formato:** JSON (`Content-Type: application/json`).
- **URL base (dev):** `http://localhost:5000` (conforme `PORT` no `.env`).
- **Prefixo de rotas:** `/api`.
- **Autenticação:** cookie `token` (`httpOnly`). Pedidos autenticados devem incluir cookies
  (`withCredentials` no Axios).
- **Corpo das respostas:** a maioria dos controladores devolve **arrays/objetos directos**;
  `auth` devolve objetos embrulhados (`{ user }`, `{ users }`, `{ message }`). Alguns
  endpoints específicos (permissões, relatórios, caixa) devolvem objetos com chaves
  próprias.

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

Cria um utilizador com perfil `Usuario` e a **senha padrão `12345`**.
**Não** inicia sessão. A conta fica marcada para **primeiro acesso**
(`alteracao_obrigatoria_senha = true`), pelo que o login funciona mas obriga a
definir uma nova senha antes de usar o sistema.

**Corpo:**

```json
{ "nome": "Ana Silva", "telefone": "841234567" }
```

**Respostas:**

- `201` — criado:
  ```json
  {
    "message": "conta criada com sucesso",
    "senha_padrao": "12345",
    "user": { "id": 3, "nome": "Ana Silva", "telefone": 841234567, "perfil": "Usuario" }
  }
  ```
  > `senha_padrao` deve ser mostrada ao utilizador no fim do registo.
- `400` — `{ "message": "nome e telefone sao obrigatorios" }`
- `400`/`409` — erro de campo: `{ "field": "telefone", "message": "O usuario ja existe" }`
  ou `{ "field": "nome", "message": "O nome de utilizador ja existe" }`
  (campos possíveis: `nome`, `telefone`). O **nome de utilizador é único**
  (comparação case-insensitive), por ser o identificador de acesso.

### `POST /api/auth/login`

Autentica por **nome de utilizador** + senha e emite o cookie `token`.

**Corpo:**

```json
{ "nome": "Ana Silva", "senha": "12345" }
```

**Respostas:**

- `200` — sucesso (define `Set-Cookie: token=...`):
  ```json
  {
    "message": "login feito com sucesso",
    "user": { "id": 3, "nome": "Ana Silva", "telefone": 841234567, "perfil": "Usuario", "deve_alterar_senha": true }
  }
  ```
  > `deve_alterar_senha: true` sinaliza **primeiro acesso**: o frontend redireciona
  > para `/primeiro-acesso` e só deixa entrar no dashboard depois de definir a nova senha.
- `400` — `{ "message": "nome ou senha nao foram providenciados" }`
- `401` — `{ "message": "Nome ou senha invalidos" }`
- `403` — `{ "message": "Conta inativa: contacte o administrador" }`

### `POST /api/auth/primeiro-acesso` 🔒

Define a nova senha obrigatória de uma conta em primeiro acesso. Requer a sessão
criada pelo login e só funciona enquanto `alteracao_obrigatoria_senha = true`.

**Corpo:**

```json
{ "senha_nova": "novasenha1" }
```

**Respostas:**

- `200` — senha definida e conta pronta a usar:
  ```json
  {
    "message": "Senha definida com sucesso",
    "user": {
      "id": 3, "nome": "Ana Silva", "telefone": 841234567, "perfil": "Usuario",
      "deve_alterar_senha": false, "alteracao_obrigatoria_senha": false
    }
  }
  ```
- `400` — erro de campo: `{ "field": "senha_nova", "message": "..." }`
- `400` — `{ "message": "Esta conta ja tem uma senha definida" }`
- `401`/`403` — sem sessão válida ou conta inativa

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

### `PATCH /api/auth/me` 🔒

Actualiza o **próprio perfil** (nome e/ou telefone). Exige a confirmação da senha actual.

**Corpo:**

```json
{ "nome": "Ana Silva", "telefone": "841234567", "senha_atual": "novasenha1" }
```

**Respostas:**

- `200` — `{ "message": "Perfil atualizado com sucesso", "user": { ... } }`
- `400` — nenhum campo enviado, nome inválido ou sem alterações
  (`{ "field": "nome", "message": "..." }` quando aplicável)
- `401` — `{ "field": "senha_atual", "message": "Senha atual invalida" }`
- `409` — nome/telefone já usados por outra conta (`{ field, message }`)

> A alteração é auditada (sem guardar a senha). A troca de senha faz-se em
> `POST /api/auth/alterar-senha`.

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

## Dashboard — `/api/dashboard`

### `GET /api/dashboard` 🔒

Resumo operacional do mês actual e dos últimos seis meses. Disponível a qualquer
utilizador autenticado.

**Resposta `200`:**

```json
{
  "atualizado_em": "2026-10-26T10:00:00.000Z",
  "resumo": {
    "receita": 125000, "despesas": 43000, "resultado": 82000,
    "receita_anterior": 110000, "despesas_anterior": 40000,
    "resultado_anterior": 70000
  },
  "indicadores": {
    "atendimentos_hoje": 8, "atendimentos_mes": 132,
    "em_andamento": 3, "pagos": 120,
    "clientes_ativos": 240, "funcionarios_ativos": 6,
    "servicos_ativos": 28, "cartoes_fidelizacao": 54
  },
  "serie": [{ "mes": "2026-05", "receita": 90000, "despesas": 30000 }],
  "top_servicos": [{ "servico_id": 1, "servico_nome": "Corte", "quantidade": 42, "total": 42000 }],
  "top_funcionarios": [{ "funcionario_id": 1, "funcionario_nome": "Ana", "cargo": "Cabeleireira", "quantidade": 30, "total": 30000 }],
  "recentes": [{ "id": 10, "cliente_nome": "Maria", "data_hora": "...", "estado": "Pago", "valor_total": 2500, "metodos_pagamento": "Dinheiro" }],
  "fidelizacao": { "marcas": 22, "beneficios_ganhos": 4, "beneficios_utilizados": 3 }
}
```

> A receita ignora pagamentos `Anulado`; as despesas consideram apenas despesas `Ativo`.

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
  - `400` se `elegivel_fidelizacao: true` e o valor ultrapassar **200 MT**
- `PUT /api/servicos/:id` 🔒🛠️ — actualização parcial. `200` / `404` / `400`
  - Alterar `valor` grava automaticamente o histórico de preços
  - Se o estado final continuar elegível, o valor não pode ultrapassar **200 MT**;
    para aumentar o preço acima do limite, envie também `elegivel_fidelizacao: false`
- `PATCH /api/servicos/:id/estado` 🔒🛠️ — `{ "estado": "Ativo" | "Inativo" }`
- `DELETE /api/servicos/:id` 🔒🛠️ — `204` / `404`
  - `409` se existirem atendimentos que usam o serviço

### Modalidades de preço

- `GET /api/servicos/:id/modalidades` 🔒 — modalidades do serviço
- `POST /api/servicos/:id/modalidades` 🔒🛠️ — cria modalidade
- `PUT /api/servicos/modalidades/:id` 🔒🛠️ — actualiza modalidade
- `DELETE /api/servicos/modalidades/:id` 🔒🛠️ — remove modalidade

### Aplicações associadas

- `GET /api/servicos/:id/aplicacoes` 🔒 — aplicações/variações associadas
- `POST /api/servicos/:id/aplicacoes` 🔒🛠️ — corpo: `{ "aplicacao_id": 2 }`
- `DELETE /api/servicos/:id/aplicacoes/:aplicacaoId` 🔒🛠️ — desassocia

> Escrita requer a permissão `servicos:escrever`.

## Categorias de serviço — `/api`

- `GET /api/categorias` 🔒 — `[{ id, nome }]`
- `GET /api/categorias/:id` 🔒 — `200` / `404`
- `POST /api/categorias` 🔒🛠️ — corpo: `{ nome }`. `201`
- `PUT /api/categorias/:id` 🔒🛠️ — corpo: `{ nome }`. `200` / `404`
- `DELETE /api/categorias/:id` 🔒🛠️ — `204` / `404`
  - `409` se existirem serviços nesta categoria

> Escrita em categorias requer `servicos:escrever` (na configuração inicial, apenas o
> `Administrador`; o `Usuario` tem `servicos:ler`).

Legenda: 🔒 requer sessão · 👑 só `Administrador` · 🛠️ requer a permissão indicada.

---

## Contas, perfis e permissões — `/api`

> Autorização por permissões (RBAC). Todas as rotas exigem a permissão `contas:gerir`
> (por padrão, `Administrador`).

### Utilizadores

- `GET /api/usuarios` — lista `[{ ... }]`
- `GET /api/usuarios/:id` — um utilizador (`200`/`404`)
- `POST /api/usuarios` — cria conta. Corpo: `{ nome, telefone, id_perfil, senha? }`
  - `nome` e `telefone` são únicos (`409` com `{field,message}`).
  - Sem `senha`, a conta fica com a **senha padrão `12345`**, devolvida em
    `senha_padrao` (e em `senha_temporaria` por compatibilidade), com troca
    obrigatória no próximo acesso.
- `PUT /api/usuarios/:id` — atualização parcial (`nome`, `telefone`, `id_perfil`)
- `PATCH /api/usuarios/:id/estado` — `{ "estado": "Ativo" | "Inativo" }`
- `POST /api/usuarios/:id/repor-senha` — repõe a senha para `12345` e força a troca
  no próximo acesso
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
  `{ cliente_id, servicos: [{ servico_id, funcionario_id, preco_praticado, desconto?, tipo_preco?, usar_beneficio_fidelizacao? }] }`.
  Cria cabeçalho + linhas **numa transação**. `201`; a resposta inclui `fidelizacao`
  com o progresso já atualizado (por exemplo, `0/5` depois de usar o 6.º serviço gratuito).
  - `400` se faltar `cliente_id`/`servicos` ou campos de cada serviço
  - `400` se `usar_beneficio_fidelizacao: true` num serviço não elegível, acima de 200 MT
    ou sem preço praticado válido
  - `409` se algum serviço estiver **inativo**
  - `409` se o cartão estiver completo (5/5) e o atendimento tiver serviços elegíveis sem
    exatamente um deles marcado como gratuito; o 6.º serviço não pode ser pago
  - `409` se for indicado `usar_beneficio_fidelizacao: true` sem o 6.º serviço pendente ou
    se forem indicados dois serviços gratuitos no mesmo atendimento
  - `usar_beneficio_fidelizacao: true` aplica 100% de desconto a **uma única** linha; o
    `desconto` enviado nessa linha é ignorado. O atendimento que usa o 6.º serviço gratuito
    não gera marca em nenhum dos seus serviços
- `PUT /api/atendimentos/:id` 🔒🛠️ — corpo: `{ cliente_id }`
- `POST /api/atendimentos/:id/servicos` 🔒🛠️ — adiciona serviço (recalcula totais).
  Aceita os mesmos campos, incluindo `usar_beneficio_fidelizacao`; rejeita com `409` se o
  atendimento já tiver um serviço gratuito, se o cartão estiver completo e o novo serviço
  for elegível sem ser o gratuito, ou se o serviço gratuito for acrescentado depois de o
  atendimento já ter gerado marca
- `DELETE /api/atendimentos/:id/servicos/:itemId` 🔒🛠️ — `204` (recalcula totais)
- `PATCH /api/atendimentos/:id/concluir` 🔒🛠️ — marca `Concluido`
- `POST /api/atendimentos/:id/anular` 🔒🛠️(`atendimentos:anular`) — corpo: `{ motivo }`
- `POST /api/atendimentos/:id/descontos` 🔒🛠️ — aplica desconto a uma linha. Corpo:
  `{ atendimento_servico_id, escopo, tipo, percentagem?, valor_bruto, valor_desconto, valor_final }`
  - `tipo`: `Valor` (fixo) ou `Percentagem`; `escopo`: `Servico` ou `Atendimento`
  - `400` se faltar campo, se `valor_desconto < 0`/exceder o valor bruto ou se a
    percentagem estiver fora de 0–100
  - `409` se o atendimento estiver `Anulado`
  - Regista o histórico do desconto, recalcula os totais e audita

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
- `GET /api/categorias-despesa` 🔒 — lista de categorias
- `POST /api/categorias-despesa` 🔒(`despesas:escrever`) — corpo: `{ nome, tipo? }`

## Stock — `/api`

- `GET /api/movimentos?produto_id=&tipo=&data_inicio=&data_fim=` 🔒 — movimentos de stock
- `GET /api/stock/:produto_id` 🔒 — resumo calculado a partir dos movimentos:
  `{ stock_minimo, total_entradas, total_saidas, total_ajustes, nota }`
- `POST /api/entrada` 🔒(`estoque:escrever`) — corpo: `{ produto_id, quantidade, motivo? }`. `201`
- `POST /api/saida` 🔒(`estoque:escrever`) — corpo: `{ produto_id, quantidade, motivo? }`. `201`
- `POST /api/ajuste` 🔒(`estoque:escrever`) — corpo: `{ produto_id, quantidade, motivo? }`. `201`

> A permissão `estoque:escrever` **não consta** do seed inicial; tem de ser concedida
> manualmente (ou acrescentada ao seed). Não existe CRUD de produtos na API.
>
> ⚠️ O `Frontend/src/services/api.js` chama actualmente `POST /api/estoque/entrada`,
> `/api/estoque/saida` e `/api/estoque/ajuste`; essas rotas **não existem** no backend
> (devolvem `404`). As rotas reais são as indicadas acima.

## Fidelização — `/api/clientes/:id/fidelizacao`

- `GET /api/clientes/:id/fidelizacao` 🔒 — progresso:
  `{ ciclo_atual, meta, limite_beneficio, marcas_no_ciclo, beneficios_disponiveis, beneficios_utilizados, beneficio_pendente, historico }`.
  Com o 6.º serviço pendente, o cartão mantém `marcas_no_ciclo: 5` e
  `beneficio_pendente: true`; depois de o usar, passa para `marcas_no_ciclo: 0` no ciclo
  seguinte. Cada item do `historico` inclui `origem` (`atendimento` | `manual`). O cartão
  aplica-se a clientes de ambos os sexos.
- `POST /api/clientes/:id/fidelizacao/correcao` 🔒(`fidelizacao:corrigir`) — corpo:
  `{ tipo_movimento?, ciclo?, observacao? }`
- `POST /api/clientes/:id/fidelizacao/marcas` 🔒👑 — preenchimento manual de cartões físicos.
  Corpo: `{ quantidade: 1..20, confirmar_beneficio?: boolean }`, limitado às marcas que
  faltam até 5/5. Com o 6.º serviço pendente devolve `409`. Se a operação
  completar o cartão e `confirmar_beneficio` não for `true`, devolve `409` com
  `{ requer_confirmacao: true, beneficios_a_gerar, marcas_no_ciclo, marcas_apos }`.
- `DELETE /api/clientes/:id/fidelizacao/marcas/:movimentoId` 🔒👑 — remove uma marca do
  ciclo atual, manual ou de atendimento. Se o cartão estava 5/5, o `beneficio_ganho`
  pendente também é removido. É bloqueado (`409`) para marcas de ciclos anteriores; nesses
  casos usa-se a correção de fidelização. Remover uma marca de atendimento não altera o
  atendimento nem os serviços registados.
- `POST /api/clientes/:id/fidelizacao/beneficios/utilizar` 🔒👑 — corpo: `{ observacao? }`.
  Regista a utilização do 6.º serviço gratuito, sem criar marca, e reinicia o cartão em
  0/5. `409` se não existir o 6.º serviço pendente.

> Só serviços com `elegivel_fidelizacao` **e valor até 200 MT** contam. Marcas de
> atendimento contam uma vez por dia (RN17); marcas manuais contam individualmente e entram
> no mesmo ciclo. Ao 5.º movimento o cartão fica completo (5/5) e o **6.º serviço é
> obrigatoriamente gratuito**, seja a marca manual ou de atendimento. O direito não acumula
> nem pode ser guardado para depois: enquanto estiver pendente, o próximo atendimento com
> serviços elegíveis tem de indicar exatamente um deles como gratuito. No 6.º serviço o
> cliente escolhe **um único** serviço elegível até 200 MT; se escolher um valor inferior, o
> remanescente não é reutilizado. O serviço gratuito consome o benefício e **não** cria
> marca; os restantes serviços desse atendimento também não criam marca e o ciclo seguinte
> começa em zero. A geração é idempotente por `atendimento_servico_id`.

---

## Horários — `/api/funcionarios/:id/horarios`

- `GET /api/funcionarios/:id/horarios` 🔒 — programação do funcionário (`404` se o
  funcionário não existir). Quem tem `horarios:gerir` consulta qualquer funcionário; os
  restantes só podem consultar o próprio horário (`403` caso contrário)
- `POST /api/funcionarios/:id/horarios` 🔒(`horarios:gerir`) — corpo:
  `{ dia_semana, hora_entrada, hora_saida }`. `201`
  - `dia_semana`: `0` = Domingo … `6` = Sábado
  - `hora_entrada`/`hora_saida`: `HH:MM`; a saída tem de ser posterior à entrada
  - São permitidos vários turnos no mesmo dia, desde que não se sobreponham (`409`)
- `PUT /api/funcionarios/:id/horarios` 🔒(`horarios:gerir`) — corpo:
  `{ horarios: [{ dia_semana, hora_entrada, hora_saida }] }` — **substitui** toda a
  programação (transação); valida sobreposições dentro da lista
- `PUT /api/horarios/:id` 🔒(`horarios:gerir`) — atualiza **um único turno**, sem afetar
  os restantes. Corpo: `{ dia_semana, hora_entrada, hora_saida }`
- `DELETE /api/horarios/:id` 🔒(`horarios:gerir`) — remove **um único turno**
- `DELETE /api/funcionarios/:id/horarios/:dia_semana` 🔒(`horarios:gerir`) —
  compatibilidade: remove todos os turnos desse dia

## Assiduidade — `/api/assiduidade`

- `GET /api/assiduidade?funcionario=&de=&ate=&tipo=` 🔒(`assiduidade:gerir`) — registos
- `POST /api/assiduidade` 🔒(`assiduidade:gerir`) — corpo:
  `{ funcionario_id, data?, hora_entrada_real?, hora_saida_real?, tipo_ocorrencia?, justificacao? }`. `201`
  - `tipo_ocorrencia`: `atraso` | `falta_justificada` | `falta_injustificada` |
    `saida_antecipada` | `ausencia` | `sem_registo`
  - `409` se já existir registo do funcionário nesse dia; `400` se o funcionário não existir
- `PUT /api/assiduidade/:id` 🔒(`assiduidade:gerir`) — correção parcial
  (`hora_entrada_real`, `hora_saida_real`, `tipo_ocorrencia`, `justificacao`, `estado`).
  Enviar `null` nas horas limpa o valor
- `PUT /api/assiduidade/dia` 🔒(`assiduidade:gerir`) — cria ou atualiza o dia
  `(funcionario_id, data)` sem duplicar. Corpo:
  `{ funcionario_id, data, hora_entrada_real, hora_saida_real }`
  - `data` no formato `AAAA-MM-DD`; horas em `HH:MM` ou `null` (registo parcial permitido)
  - Um dia novo exige pelo menos uma hora; se o dia já existir, `null` limpa a hora
  - Se ambas as horas forem enviadas, a saída tem de ser posterior à entrada
  - Preserva ocorrência/justificação existentes; `201` ao criar e `200` ao atualizar

> A página `/horarios` usa `PUT /api/assiduidade/dia` para o controlo mensal: base
> `09:00–19:00` (10h por dia), em todos os dias. Dias sem entrada e saída não contam
> para as horas previstas e não há desconto de almoço.

> A ocorrência é registada separadamente do efeito salarial (RN15).

## Salários — `/api/salarios`

- `GET /api/salarios/processamentos?periodo=&funcionario=&estado=` 🔒(`salarios:gerir`) —
  lista; `periodo` no formato `AAAA-MM`
- `GET /api/salarios/processamentos/:id` 🔒(`salarios:gerir`) — detalhe + `deducoes`
- `POST /api/salarios/processar` 🔒(`salarios:gerir`) — corpo: `{ periodo: "AAAA-MM" }`.
  Gera o processamento de todos os funcionários **ativos** para o mês. `201` com a lista
  criada (vazia se já processado). `400` se o período for inválido
- `PUT /api/salarios/processamentos/:id/deducoes` 🔒(`salarios:gerir`) — corpo:
  `{ deducoes: [{ tipo, descricao?, valor, motivo? }] }` — substitui as deduções e
  recalcula `total_a_pagar`. `409` se o processamento já não estiver em `Preparado`
- `PATCH /api/salarios/processamentos/:id/aprovar` 🔒(`salarios:aprovar`) — `Preparado` →
  `Aprovado`. `409` se o estado não permitir
- `PATCH /api/salarios/processamentos/:id/pagar` 🔒(`salarios:gerir`) — `Aprovado` → `Pago`;
  marca as comissões do período como `Paga`. `409` se não estiver aprovado

> `total_a_pagar = salario_base + total_comissoes − total_deducoes`. Só funcionários
> recebem salário/comissão (RF17).

## Relatórios — `/api/relatorios`

Todas as rotas exigem `relatorios:ler`. `de`/`ate` são **opcionais** (`AAAA-MM-DD`); sem
filtro devolve todo o histórico.

- `GET /api/relatorios/resumo?de=&ate=` — `{ receita, despesas, resultado }`
- `GET /api/relatorios/financeiro?de=&ate=` — `{ periodo, resumo, comparacao, receitas,
  despesas, fluxo, salarios, dividas, gerado_por, gerado_em }`
- `GET /api/relatorios/caixa?de=&ate=` — `{ entradas, saidas, levantamentos, sessoes }`
- `GET /api/relatorios/servicos?de=&ate=` — serviços mais realizados
- `GET /api/relatorios/funcionarios?de=&ate=` — serviços e comissões por funcionário
- `GET /api/relatorios/assiduidade?de=&ate=` — registos e ocorrências por funcionário
- `GET /api/relatorios/clientes?de=&ate=` — clientes mais frequentes
- `GET /api/relatorios/fidelizacao?de=&ate=` — `{ marcas, beneficios_ganhos, beneficios_utilizados }`
- `GET /api/relatorios/anulacoes?de=&ate=` — histórico de anulações (atendimentos + pagamentos)
- `GET /api/relatorios/movimentos?de=&ate=` — movimentos do caixa

---

## Catálogo público — `/api/public` 🔓 (sem sessão)

Apenas **serviços ativos** e campos de divulgação (RF22/RN22/RNF11): nunca expõe
clientes, funcionários, custos ou qualquer dado interno.

- `GET /api/public/servicos` — lista `[{ id, nome, descricao, valor, duracao_min,
  tipo_preco, categoria_nome }]`
- `GET /api/public/servicos/:id` — detalhe (`200`); `404` se não existir ou estiver inativo

> O preço é apresentado com `valor` + `tipo_preco` (`fixo`/`variavel`), ficando a decisão
> de apresentação (preço fixo, preço inicial ou "variável") a cargo do frontend
> (ver "Decisões pendentes").

## Auditoria — `/api/auditoria`

Registo auditável das operações relevantes (RF23/RN21/RNF03). Todas as rotas exigem
`auditoria:ler` (Administrador e Auditor).

- `GET /api/auditoria?entidade=&utilizador=&utilizador_nome=&perfil=&de=&ate=&operacao=` — lista (filtros opcionais)
- `GET /api/auditoria/opcoes` — valores disponíveis para os filtros (`operacoes`, `perfis`, `utilizadores`)
- `GET /api/auditoria/:id` — detalhe (`200`/`404`)

```json
{
  "id": 11, "id_utilizador": 1, "utilizador_nome": "Administrador",
  "utilizador_perfil": "Administrador",
  "data_hora": "2026-10-17T...", "entidade": "pagamento", "id_registo_afetado": 2,
  "tipo_operacao": "anular", "valores_anteriores": { "estado": "Liquidado" },
  "valores_posteriores": { "estado": "Anulado" }, "motivo": "erro de caixa"
}
```

> Operações auditadas: criação de atendimentos e pagamentos; anulações; abertura,
> levantamentos e fecho de caixa; despesas (criar/atualizar/remover); processamento
> salarial (criar/atualizar deduções/aprovar/pagar); assiduidade (criar/atualizar);
> correções de fidelização; alterações de permissões (utilizador e perfil).
> O registo é **append-only**: um trigger da base de dados bloqueia `UPDATE`/`DELETE`.

---

## Exemplos com `curl`

```bash
# registo (cria com a senha padrao 12345; a resposta devolve senha_padrao)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","telefone":"841234567"}'

# login normal com a senha padrao (resposta traz deve_alterar_senha = true)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","senha":"12345"}'

# primeiro acesso: definir a nova senha obrigatoria
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/primeiro-acesso \
  -H "Content-Type: application/json" \
  -d '{"senha_nova":"novasenha1"}'

# login seguinte ja com a nova senha
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","senha":"novasenha1"}'

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
