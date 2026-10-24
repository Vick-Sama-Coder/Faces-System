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
- `400`/`409` — erro de campo: `{ "field": "telefone", "message": "O usuario ja existe" }`
  ou `{ "field": "nome", "message": "O nome de utilizador ja existe" }`
  (campos possíveis: `nome`, `telefone`, `senha`). O **nome de utilizador é único**
  (comparação case-insensitive), por ser o identificador de acesso.

### `POST /api/auth/login`

Autentica por **nome de utilizador** + senha e emite o cookie `token`.

**Corpo:**

```json
{ "nome": "Ana Silva", "senha": "senha123" }
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
- `400` — `{ "message": "nome ou senha nao foram providenciados" }`
- `401` — `{ "message": "Nome ou senha invalidos" }`
- `403` — `{ "message": "Conta inativa: contacte o administrador" }`

### `POST /api/auth/recuperar-senha`

Passo 1 da recuperação: gera um código de 6 dígitos, válido por **10 minutos**, e
envia-o por **SMS ao telefone** do utilizador (ver `Backend/src/utils/sms.js`).

**Corpo:**

```json
{ "telefone": "841234567" }
```

**Resposta `200`** (mensagem genérica, não revela se o número existe):

```json
{ "message": "Se o numero estiver registado, enviaremos um codigo de redefinicao." }
```

> Fora de produção (`NODE_ENV !== 'production'`) a resposta inclui também
> `"codigo": "123456"`, para permitir testar o fluxo sem um provedor de SMS real.

- `400` — telefone inválido (`{field:"telefone", message}`)

### `POST /api/auth/redefinir-senha`

Passo 2 da recuperação: valida o código e define a nova senha. O código é de
**uso único** e aceita no máximo **5 tentativas**.

**Corpo:**

```json
{ "telefone": "841234567", "codigo": "123456", "senha_nova": "novasenha1" }
```

**Respostas:**

- `200` — `{ "message": "Senha redefinida com sucesso" }`
- `400` — erro de campo (`{field,message}`): `telefone` inválido, `codigo` inválido
  (não tem 6 dígitos) ou `senha_nova` fora das regras de senha
- `400` — `{ "field": "codigo", "message": "Codigo invalido ou expirado" }`
  (código errado, expirado, já usado ou inexistente)
- `400` — `{ "field": "codigo", "message": "Demasiadas tentativas: peca um novo codigo" }`

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
  - `nome` e `telefone` são únicos (`409` com `{field,message}`).
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

## Horários — `/api/funcionarios/:id/horarios`

- `GET /api/funcionarios/:id/horarios` 🔒 — programação do funcionário (`404` se o
  funcionário não existir)
- `POST /api/funcionarios/:id/horarios` 🔒(`horarios:gerir`) — corpo:
  `{ dia_semana, hora_entrada, hora_saida }`. `201`
  - `dia_semana`: `0` = Domingo … `6` = Sábado
- `PUT /api/funcionarios/:id/horarios` 🔒(`horarios:gerir`) — corpo:
  `{ horarios: [{ dia_semana, hora_entrada, hora_saida, ... }] }` — **substitui** toda a
  programação (transação)

## Assiduidade — `/api/assiduidade`

- `GET /api/assiduidade?funcionario=&de=&ate=&tipo=` 🔒(`assiduidade:gerir`) — registos
- `POST /api/assiduidade` 🔒(`assiduidade:gerir`) — corpo:
  `{ funcionario_id, data?, hora_entrada_real?, hora_saida_real?, tipo_ocorrencia?, justificacao? }`. `201`
  - `tipo_ocorrencia`: `atraso` | `falta_justificada` | `falta_injustificada` |
    `saida_antecipada` | `ausencia` | `sem_registo`
  - `409` se já existir registo do funcionário nesse dia; `400` se o funcionário não existir
- `PUT /api/assiduidade/:id` 🔒(`assiduidade:gerir`) — correção parcial
  (`hora_entrada_real`, `hora_saida_real`, `tipo_ocorrencia`, `justificacao`, `estado`)

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
# registo
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","telefone":"841234567","senha":"senha123"}'

# login por nome de utilizador (guarda o cookie em cookies.txt)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","senha":"senha123"}'

# recuperacao de senha: pedir o codigo por SMS
curl -X POST http://localhost:5000/api/auth/recuperar-senha \
  -H "Content-Type: application/json" \
  -d '{"telefone":"841234567"}'

# recuperacao de senha: validar o codigo e definir a nova senha
curl -X POST http://localhost:5000/api/auth/redefinir-senha \
  -H "Content-Type: application/json" \
  -d '{"telefone":"841234567","codigo":"123456","senha_nova":"novasenha1"}'

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
