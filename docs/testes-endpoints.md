# Guia de Teste dos Endpoints (Backend)

[← Voltar ao índice](./README.md)

Este documento serve para **testar a API do backend** e, em paralelo, **verificar se cada
funcionalidade corresponde aos requisitos** de [`documentacao.md`](./documentacao.md).

Para cada módulo indica:

1. **Porque existe** — requisito(s) que justificam o endpoint.
2. **Quem pode** — autenticação e permissão exigida.
3. **Como testar** — pedido `curl` pronto a executar.
4. **Resultado esperado** — código HTTP, corpo e efeitos colaterais.
5. **Erros** — casos que devem falhar e com que resposta.

> Os valores monetários são **inteiros em Meticais** (sem casas decimais) em toda a API.
> Os `id` são inteiros. As datas usam `AAAA-MM-DD`; os salários usam o período `AAAA-MM`.

---

## 1. Preparação do ambiente

### 1.1. Requisitos

- Node.js 20+ e npm
- PostgreSQL 13+ a correr
- Ficheiro `Backend/.env` com:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=...
DATABASE_NAME=SalaoFaces
DATABASE_MAINTENANCE_DB=postgres
DATABASE_SSL=false
JWT_SECRET=uma-chave-longa-e-aleatoria
CLIENT_URL=http://localhost:5173
PORT=5000
```

### 1.2. Instalar e arrancar

```bash
cd Backend
npm install
node src/server.js
# ou, em desenvolvimento:
npm run dev
```

Deve aparecer algo como `Servidor esta escutando na porta: 5000`.
Nos exemplos abaixo usa-se `BASE`; ajusta a porta se for diferente:

```bash
BASE=http://localhost:5000/api
```

### 1.3. Recriar a base de dados do zero (opcional)

O schema e o seed são aplicados pelas migrações Drizzle. O comando seguinte **apaga** a
base `DATABASE_NAME` e recria-a:

```bash
cd Backend
npm run db:reset
```

O `npm run db:reset` usa as variáveis do `.env` e aplica todas as migrações
(`drizzle/0000`–`0006`), incluindo o seed de perfis, permissões e categorias de despesa.
Não é necessário executar os SQL de `Backend/Database/schema/` (referência histórica).

### 1.4. Criar o primeiro administrador

O registo público cria sempre o perfil **Usuario (2)** com a senha padrão `12345`:

```bash
curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d '{
  "nome": "Administrador",
  "telefone": "821111111"
}'
```

Resposta `201` com `senha_padrao: "12345"`. Depois promove-se a conta na base de dados:

```bash
psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  -c "update usuario set id_perfil = 1 where telefone = '821111111';"
```

### 1.5. Sessão (cookie) para os restantes testes

A autenticação é por **nome de utilizador** e cookie `httpOnly` chamado `token`. A conta
acabada de criar está em primeiro acesso: o login com `12345` devolve
`deve_alterar_senha: true` e é preciso definir a nova senha antes de continuar.

```bash
JAR=/tmp/faces.cookies
rm -f "$JAR"

# login inicial com a senha padrão
curl -s -c "$JAR" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Administrador","senha":"12345"}'

# define a senha definitiva
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/auth/primeiro-acesso" \
  -H 'Content-Type: application/json' \
  -d '{"senha_nova":"Admin1234"}'
```

A partir daqui, todos os pedidos autenticados usam `-b "$JAR" -c "$JAR"`. Logins
posteriores usam `{"nome":"Administrador","senha":"Admin1234"}`.

### 1.6. Atalho para os exemplos

```bash
api() {
  curl -s -b "$JAR" -c "$JAR" "$@"
}
```

Assim, `api "$BASE/clientes"` faz um `GET` com a sessão.

---

## 2. Convenções de resposta

| Situação | Código | Corpo |
| --- | --- | --- |
| Leitura de lista | `200` | **Array simples** `[{...}]` (sem envelope, sem paginação) |
| Leitura de um registo | `200` | Objeto |
| Criação | `201` | Objeto criado (ou envelope próprio, ex.: auth/usuários) |
| Atualização | `200` | Objeto atualizado |
| Remoção | `204` | **Sem corpo** |
| Campo obrigatório em falta / inválido | `400` | `{ "message": "..." }` ou `{ "field": "...", "message": "..." }` |
| Não autenticado (sem token / token inválido) | `401` | `{ "message": "..." }` |
| Autenticado mas sem permissão / conta inativa | `403` | `{ "message": "..." }` |
| Recurso inexistente | `404` | `{ "message": "..." }` |
| Conflito (duplicado, estado inválido, FK em uso) | `409` | `{ "message": "..." }` |
| Erro inesperado | `500` | `{ "message": "Erro interno do servidor" }` |

Respostas de **autenticação** são a exceção: vêm em envelope (`{ user }`, `{ users }`,
`{ message }`).

Erros do PostgreSQL são traduzidos centralmente em `src/app.js`:

| Código PG | HTTP | Significado |
| --- | --- | --- |
| `22P02` | `400` | id/valor com formato inválido |
| `23502` | `400` | campo obrigatório em falta (NOT NULL) |
| `23503` | `409` | violação de chave estrangeira (registo associado) |
| `23505` | `409` | duplicado (UNIQUE) |
| `23514` | `400` | valor fora do intervalo (CHECK) |

> **Importante:** o backend valida os campos obrigatórios e um conjunto crescente de
> formatos (auth: nome/telefone/senha; clientes: sexo/idade e normalização do telefone;
> atendimentos: preços e benefício; horários: dia/horas; salários: período). Nos restantes
> recursos, a validação de formato é sobretudo responsabilidade do frontend.

---

## 3. Verificação de conformidade com os requisitos

Legenda: ✅ implementado · ⚠️ implementado com desvio/lacuna · ❌ não implementado.

| Requisito | Estado | Onde está | Observações |
| --- | --- | --- | --- |
| **RF01 — Autenticação** | ⚠️ | `routes/auth.js`, `middlewares/auth.js` | Login/logout/me/permissoes OK; conta inativa bloqueada. **Não** há expiração por inatividade (JWT 30 dias, cookie 10 dias) nem **bloqueio** enquanto `alteracao_obrigatoria_senha` estiver ativa (o flag é devolvido, mas não impede chamadas). |
| **RF02 — Gestão de contas** | ⚠️ | `controller/usuario.js`, `controller/perfil.js` | Criar/editar/estado/repor senha/perfis/permissões OK; último acesso exposto. **Auditoria só nas alterações de permissões** — criação, edição, estado e reposição de senha não geram log (RF02 pede “registar as alterações”). |
| **RF03 — Gestão de clientes** | ⚠️ | `controller/cliente.js` | CRUD, pesquisa por nome/telefone e bloqueio de telefone duplicado OK. **Não** existe endpoint de “possíveis correspondências” antes de criar; o cliente tem de existir antes do atendimento. |
| **RF04 — Gestão de serviços** | ✅ | `controller/servico.js` | CRUD, ativar/desativar, catálogo e histórico de preços. Serviço usado em atendimento não é apagável (`409`). |
| **RF05 — Registo de atendimento** | ✅ | `services/atendimento.js` | Um ou vários clientes por atendimento, serviços e aplicações por cliente, funcionário por linha, preço por linha, fidelização explícita por cliente, totais automáticos e `registado_por`. Cliente tem de ser criado numa chamada separada. |
| **RF06 — Preços variáveis** | ✅ | `services/atendimento.js`, `repository/servico.js` | `tipo_preco` e `preco_praticado` por linha; alterar o catálogo não afeta transações antigas. |
| **RF07 — Descontos** | ⚠️ | `services/atendimento.js` | A rota legada aceita desconto em **valor fixo** e em **percentagem** (`tipo = Valor`/`Percentagem`, com validação 0–100; o valor final é calculado no cliente). A interface de atendimento **já não usa descontos**; a rota mantém-se por compatibilidade. A política definitiva (fixo, percentagem ou ambos) continua em decisão. |
| **RF08 — Pagamentos** | ⚠️ | `services/pagamento.js` | Parcelas e vários métodos OK; impede pagar **acima** do devido; comissão só na liquidação total. **Permite pagamento parcial** (`estado = Parcial`), o que na prática é crédito — RF08 diz “não serão permitidos pagamentos a crédito”. |
| **RF09 — Anulações** | ⚠️ | `controller/atendimento.js`, `services/pagamento.js` | Preserva registo, exige motivo, audita e recalcula o estado do atendimento. **Mas não** anula o movimento de caixa, **não** invalida/remover a comissão e **não** exclui do relatório de receita os pagamentos de um atendimento anulado — a parte financeira da anulação está por fazer. |
| **RF10 — Caixa** | ✅ | `services/caixa.js` | Caixa único, abertura, saldo inicial, entradas, saídas, levantamentos, saldo esperado, contagem e diferença. |
| **RF11 — Fecho diário** | ⚠️ | `services/caixa.js` | Fecho explícito, diferença e histórico OK. **Não** bloqueia operações do dia seguinte quando existe sessão de um dia anterior aberta; **não** existe procedimento administrativo de correção de fecho. |
| **RF12 — Levantamentos** | ✅ | `services/caixa.js` | Valor, descrição/motivo, utilizador, sessão, data/hora e estado (`Ativo`). |
| **RF13 — Despesas** | ✅ | `services/despesa.js` | Registo com itens ou total, categoria, método, caixa de origem e comprovativo; gera saída no caixa; audita. |
| **RF14 — Funcionários** | ✅ | `controller/funcionario.js` | Dados, salário, comissão, conta associada e ativação/desativação sem apagar histórico. |
| **RF15 — Horários** | ⚠️ | `controller/horario.js` | Programação semanal e substituição transacional OK. **Não** guarda histórico das alterações (a substituição apaga as linhas anteriores); turnos rotativos ficam para decisão (§16.7). |
| **RF16 — Assiduidade** | ✅ | `controller/assiduidade.js` | Tipos de ocorrência, horas reais, correção com antes/depois na auditoria. |
| **RF17 — Salários** | ✅ | `services/salario.js` | Base + comissões − deduções, estados `Preparado → Aprovado → Pago`, data de pagamento e só funcionários ativos. |
| **RF18 — Comissões** | ✅ | `repository/comissao.js` | 30% por omissão (ou taxa do funcionário/serviço), sobre `valor_final` após desconto, só com pagamento liquidado; consulta por funcionário/período. |
| **RF19 — Aprovação salarial** | ✅ | `services/salario.js` | Consulta, deduções, aprovação (`salarios:aprovar`), pagamento e histórico; comissões passam a `Paga` ao pagar. |
| **RF20 — Fidelização** | ✅ | `services/fidelizacao.js` | Ambos os sexos; serviços elegíveis até 200 MT; uma marca por dia; 5 marcas → cartão 5/5; o 6.º serviço é obrigatoriamente gratuito, escolhido pelo cliente dentro do limite, sem acumulação; histórico e correção auditada. O serviço gratuito e os restantes serviços desse atendimento não geram marca. |
| **RF21 — Relatórios** | ⚠️ | `repository/relatorio.js`, `pages/relatorio/relatorio.jsx` | Os 10 conjuntos de dados existem (incluindo `financeiro`), com filtro `de`/`ate`; a interface exporta **CSV** e imprime/gera **PDF pelo browser**. Faltam filtros por funcionário/serviço/método/estado em todos os relatórios e uma exportação PDF gerada no servidor (decisão §16.9). |
| **RF22 — Catálogo público** | ✅ | `routes/publico.js`, `repository/servico.js` | Sem autenticação; só ativos e campos de divulgação; inativo devolve `404`. |
| **RF23 — Logs de auditoria** | ⚠️ | `services/auditoria.js`, `repository/auditoria.js` | Utilizador, data/hora, tipo, entidade, id e valores antes/depois; append-only por trigger. **Não** guarda “resultado da operação” nem registos de falhas (só grava em sucesso); **não** audita criação/edição/estado de contas. |
| **RF24 — Cópias de segurança** | ❌ | — | Não existe script de backup/restauro documentado. |
| **RF25 — Offline** | ⚠️ | `Frontend/src/services/offline*.js`, `Backend/src/middlewares/idempotencia.js` | Cache de leituras em IndexedDB, fila persistida de escritas com `Idempotency-Key`, prefetch e indicador de estado. Sincroniza apenas com a app aberta (sem Background Sync); conflitos entre dispositivos são last-write-wins; autenticação, perfil, contas, salários e fidelização manual são online-only. |

### 3.1. Lacunas que merecem correção prioritária

1. **Anulação de pagamento (RF09)** — hoje deixa o dinheiro no caixa e a comissão ativa.
   Um pagamento anulado continua a contar para `relatorios/resumo` se o atendimento
   estiver anulado (a query só filtra `pagamento.estado <> 'Anulado'`, não o atendimento).
2. **Pagamento parcial (RF08)** — decidir: bloquear pagamentos inferiores ao devido ou
   documentar que “Parcial” é permitido (o requisito fala em não haver crédito).
3. **Troca de senha obrigatória (RF01)** — bloquear as restantes rotas enquanto
   `alteracao_obrigatoria_senha = true` (exceto `/auth/me`, `/auth/alterar-senha` e
   `/auth/logout`).
4. **Auditoria de contas (RF02/RF23)** — auditar criar/editar/estado/repor senha e
   registar falhas (“resultado da operação”).
5. **Fecho de caixa (RF11)** — bloquear operações no dia seguinte e documentar a
   correção administrativa.

### 3.2. Evidência observada (execução manual)

Resultado de uma execução local (base limpa, um atendimento de 2500 pago em duas parcelas
e depois anulado):

```text
# 1) pagamento parcial de 1000/2500
POST /api/atendimentos/1/pagamentos {"parcelas":[{"metodo_pagamento":"Dinheiro","valor":1000}]}
-> 201; pagamento.estado = "Parcial"; atendimento.estado = "Em andamento"
   (ou seja: o backend aceita crédito, ao contrário de RF08)

# 2) pagamento do remanescente (1500)
-> 201; atendimento.estado = "Pago"
-> comissao: { valor_comissao: 750, taxa: 30, estado: "Elegivel" }
-> caixa: saldo_esperado = 2500

# 3) anular o segundo pagamento
POST /api/pagamentos/2/anular {"motivo":"teste"}
-> 200; atendimento.estado = "Concluido"
-> comissao continua { valor_comissao: 750, estado: "Elegivel" }   (RF09)
-> caixa continua { saldo_esperado: 2500 }
-> movimentos: [
     { tipo_movimento:"Entrada", valor:1000, origem:"Pagamento", estado:"Ativo" },
     { tipo_movimento:"Entrada", valor:1500, origem:"Pagamento", estado:"Ativo" }
   ]                                                               (RF09)

# 4) conta criada com a senha padrão
POST /api/usuarios (sem "senha") -> 201 { senha_padrao: "12345" }
login com a senha 12345 -> user.deve_alterar_senha = true
frontend redireciona para /primeiro-acesso; só depois de definir a nova senha entra (RF01)
```

Estes quatro pontos são os que justificam as lacunas 1–3 de §3.1.

---

## 4. Testes por módulo

### 4.1. Autenticação — `/api/auth`

**Porquê:** RF01 (login, sessão, logout, troca de senha) e base do RBAC.

| Método | Rota | Autenticação | Resultado |
| --- | --- | --- | --- |
| POST | `/auth/register` | pública | `201` conta criada com senha padrão `12345` (não inicia sessão) |
| POST | `/auth/login` | pública | `200` + cookie `token` (`deve_alterar_senha` indica primeiro acesso) |
| POST | `/auth/primeiro-acesso` | sessão | `200` nova senha definida (só com `alteracao_obrigatoria_senha = true`) |
| GET | `/auth/me` | sessão | `200 { user }` com `permissoes` |
| PATCH | `/auth/me` | sessão | `200` actualiza nome/telefone; exige `senha_atual` |
| POST | `/auth/alterar-senha` | sessão | `200` |
| GET | `/auth/users` | Administrador | `200 { users }` (rota legada) |
| POST | `/auth/logout` | pública | `200`, limpa o cookie |

**Teste — registo válido**

```bash
curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d '{
  "nome": "Maria Silva",
  "telefone": "841234567"
}'
```

Esperado `201`:

```json
{
  "message": "conta criada com sucesso",
  "senha_padrao": "12345",
  "user": { "id": 2, "nome": "Maria Silva", "telefone": 841234567, "perfil": "Usuario" }
}
```

**Teste — erros de registo**

```bash
# nome com números -> 400 { field: "nome" }
curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d '{"nome":"Maria 2","telefone":"841234568"}'

# telefone inválido -> 400 { field: "telefone" }
curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d '{"nome":"Maria Silva","telefone":"123"}'

# telefone já existente -> 400 { field: "telefone", message: "O usuario ja existe" }
```

**Teste — login e primeiro acesso**

```bash
curl -s -c "$JAR" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"nome":"Maria Silva","senha":"12345"}'
```

Esperado `200` com `user.deve_alterar_senha: true`.

```bash
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/auth/primeiro-acesso" \
  -H 'Content-Type: application/json' -d '{"senha_nova":"Maria1234"}'
```

Esperado `200` com `user.deve_alterar_senha: false`. A partir daqui o login
normal usa a nova senha.

Erros: nome/senha errados → `401`; conta `Inativo` → `403`; nova senha fraca → `400`.

**Teste — sessão**

```bash
curl -s -b "$JAR" "$BASE/auth/me"
```

Esperado `200` com `user.permissoes` (lista de códigos efetivos).

**Teste — actualizar o próprio perfil**

```bash
curl -s -b "$JAR" -X PATCH "$BASE/auth/me" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Administrador Geral","senha_atual":"Admin1234"}'
# 200 { message: "Perfil atualizado com sucesso", user: {...} }
```

Erros: sem `senha_atual` → `400 { field: "senha_atual" }`; senha errada → `401`;
nome/telefone já usados → `409`; nada para alterar → `400`.

**Teste — troca de senha**

```bash
curl -s -b "$JAR" -X POST "$BASE/auth/alterar-senha" \
  -H 'Content-Type: application/json' \
  -d '{"senha_atual":"Admin1234","senha_nova":"Admin5678"}'
```

Esperado `200`. Erros: senha atual errada → `401 { field: "senha_atual" }`; nova fraca → `400`.

**Teste — logout**

```bash
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/auth/logout"
```

Esperado `200` e o cookie deixa de autenticar (`/auth/me` passa a `401`).

---

### 4.2. Categorias de serviço — `/api/categorias`

**Porquê:** RF04 (organização do catálogo).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/categorias` | autenticado | `200` array |
| GET | `/categorias/:id` | autenticado | `200` / `404` |
| POST | `/categorias` | `servicos:escrever` | `201` |
| PUT | `/categorias/:id` | `servicos:escrever` | `200` |
| DELETE | `/categorias/:id` | `servicos:escrever` | `204` / `409` se tiver serviços |

```bash
curl -s -b "$JAR" -X POST "$BASE/categorias" \
  -H 'Content-Type: application/json' -d '{"nome":"Cabelo"}'
# 201 {"id":1,"nome":"Cabelo"}

curl -s -b "$JAR" "$BASE/categorias"
# 200 [{"id":1,"nome":"Cabelo"}]

curl -s -b "$JAR" -X PUT "$BASE/categorias/1" \
  -H 'Content-Type: application/json' -d '{"nome":"Cabelo e Barba"}'
# 200 objeto atualizado

curl -s -b "$JAR" -X DELETE "$BASE/categorias/999" -o /dev/null -w '%{http_code}\n'
# 404
```

**Erros:** sem `nome` → `400`; sem sessão → `401`; sem `servicos:escrever` → `403`.

---

### 4.3. Serviços — `/api/servicos`

**Porquê:** RF04 (catálogo, preços, ativação) e RF06 (preço variável).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/servicos` | autenticado | `200` **só ativos**; `?estado=todos` mostra todos |
| GET | `/servicos/:id` | autenticado | `200` / `404` |
| GET | `/servicos/:id/historico-precos` | autenticado | `200` array |
| POST | `/servicos` | `servicos:escrever` | `201` |
| PUT | `/servicos/:id` | `servicos:escrever` | `200`; alterar `valor` grava histórico |
| PATCH | `/servicos/:id/estado` | `servicos:escrever` | `200` |
| DELETE | `/servicos/:id` | `servicos:escrever` | `204` / `409` se usado em atendimento |

Corpo de criação: `nome` (obrigatório), `valor` (obrigatório, > 0), `categoria_id`
(obrigatório), `descricao`, `duracao_min`, `tipo_preco` (`fixo`|`variavel`, omissão
`fixo`), `elegivel_fidelizacao` (bool, omissão `false`). Se `elegivel_fidelizacao` for
`true`, o `valor` não pode ultrapassar **200 MT**.

```bash
curl -s -b "$JAR" -X POST "$BASE/servicos" -H 'Content-Type: application/json' -d '{
  "nome": "Corte",
  "descricao": "Corte simples",
  "valor": 150,
  "duracao_min": 30,
  "tipo_preco": "fixo",
  "elegivel_fidelizacao": true,
  "categoria_id": 1
}'
# 201 {id, nome, descricao, valor:150, duracao_min:30, tipo_preco:"fixo",
#      elegivel_fidelizacao:true, categoria_id:1, estado:"Ativo"}
```

**Teste — histórico de preços**

```bash
curl -s -b "$JAR" -X PUT "$BASE/servicos/1" -H 'Content-Type: application/json' \
  -d '{"valor": 3000}'
# 200 { valor: 3000, ... }

curl -s -b "$JAR" "$BASE/servicos/1/historico-precos"
# 200 [{id, valor_anterior: 2500, valor_novo: 3000, alterado_por: 1,
#       alterado_por_nome: "Administrador", criado_em: "..."}]
```

**Teste — desativar e catálogo**

```bash
curl -s -b "$JAR" -X PATCH "$BASE/servicos/1/estado" \
  -H 'Content-Type: application/json' -d '{"estado":"Inativo"}'
# 200 { estado: "Inativo" }

curl -s -b "$JAR" "$BASE/servicos"          # 200 [] (não aparecem inativos)
curl -s -b "$JAR" "$BASE/servicos?estado=todos"  # 200 [ ... ]
curl -s -b "$JAR" "$BASE/servicos/1"        # 200 (o detalhe continua acessível)
```

**Erros:** faltar `nome`/`valor`/`categoria_id` → `400`; categoria inexistente → `400`
(`field: "categoria_id"`); nome ativo duplicado → `409` (`field: "nome"`); apagar serviço
com atendimentos → `409`.

**Teste — modalidades e aplicações**

```bash
# modalidades de preço
curl -s -b "$JAR" -X POST "$BASE/servicos/1/modalidades" \
  -H 'Content-Type: application/json' -d '{"nome":"Curto","valor":1000}'
# 201
curl -s -b "$JAR" "$BASE/servicos/1/modalidades"
# 200 [ ... ]
curl -s -b "$JAR" -X PUT "$BASE/servicos/modalidades/1" \
  -H 'Content-Type: application/json' -d '{"valor":1200}'
# 200
curl -s -b "$JAR" -X DELETE "$BASE/servicos/modalidades/1" -o /dev/null -w '%{http_code}\n'
# 204

# aplicações/variações associadas
curl -s -b "$JAR" -X POST "$BASE/servicos/1/aplicacoes" \
  -H 'Content-Type: application/json' -d '{"aplicacao_id":2}'
# 201
curl -s -b "$JAR" "$BASE/servicos/1/aplicacoes"
# 200 [ ... ]
curl -s -b "$JAR" -X DELETE "$BASE/servicos/1/aplicacoes/2" -o /dev/null -w '%{http_code}\n'
# 204
```

> Escrita requer `servicos:escrever`; sem a permissão → `403`.

---

### 4.4. Clientes — `/api/clientes`

**Porquê:** RF03 (cadastro, pesquisa, duplicados, estado).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/clientes?search=` | autenticado | `200` array |
| GET | `/clientes/:id` | autenticado | `200` / `404` |
| POST | `/clientes` | `clientes:escrever` | `201` / `409` telefone duplicado |
| PUT | `/clientes/:id` | `clientes:escrever` | `200` |
| PATCH | `/clientes/:id/estado` | `clientes:escrever` | `200` |
| DELETE | `/clientes/:id` | `clientes:escrever` | `204` / `409` se tiver atendimentos |

Campos: `nome`, `telefone` (obrigatórios), `apelido`, `endereco`, `data_nascimento`
(`AAAA-MM-DD`). A resposta inclui `data_registo`, `saldo_pendente`, `estado`.

```bash
curl -s -b "$JAR" -X POST "$BASE/clientes" -H 'Content-Type: application/json' -d '{
  "nome": "Ana",
  "apelido": "Costa",
  "telefone": "841111111",
  "endereco": "Maputo",
  "data_nascimento": "1995-04-12"
}'
# 201 {id, nome, apelido, telefone: 841111111, endereco,
#       data_nascimento: "1995-04-12", data_registo, saldo_pendente: 0, estado: "Ativo"}

curl -s -b "$JAR" "$BASE/clientes?search=8411"
# 200 [ ... ] (pesquisa por telefone parcial)

curl -s -b "$JAR" -X POST "$BASE/clientes" -H 'Content-Type: application/json' \
  -d '{"nome":"Ana Costa","telefone":"841111111"}'
# 409 { field: "telefone", message: "Ja existe um cliente com este telefone" }
```

**Nota RF03:** não há endpoint para “sugerir correspondências” antes de criar. O frontend
deve chamar `GET /clientes?search=` e mostrar os resultados antes do `POST`.

---

### 4.5. Funcionários e comissões — `/api/funcionarios`

**Porquê:** RF14 (funcionários) e RF18 (taxa de comissão).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/funcionarios` | autenticado | `200` array |
| GET | `/funcionarios/:id` | autenticado | `200` / `404` |
| GET | `/funcionarios/:id/desempenho?de=&ate=` | autenticado | `200` totais + serviços |
| GET | `/funcionarios/:id/comissao` | autenticado | `200 { comissao_percentual, configuracoes }` |
| POST | `/funcionarios` | `funcionarios:escrever` | `201` |
| PUT | `/funcionarios/:id` | `funcionarios:escrever` | `200` |
| PATCH | `/funcionarios/:id/estado` | `funcionarios:escrever` | `200` |
| PUT | `/funcionarios/:id/comissao` | `funcionarios:escrever` | `200` (substitui configurações) |
| DELETE | `/funcionarios/:id` | `funcionarios:escrever` | `204` / `409` se tiver histórico |

Criação exige `nome` e `salario`; `comissao_percentual` assume `30`; `id_usuario` é opcional.

```bash
curl -s -b "$JAR" -X POST "$BASE/funcionarios" -H 'Content-Type: application/json' -d '{
  "nome": "Joana Macuacua",
  "telefone": "842222222",
  "cargo": "Cabeleireira",
  "salario": 9000,
  "comissao_percentual": 30
}'
# 201 {id, nome, salario: 9000, comissao_percentual: 30, estado: "Ativo", ...}
```

**Teste — comissão específica por serviço**

```bash
curl -s -b "$JAR" -X PUT "$BASE/funcionarios/1/comissao" \
  -H 'Content-Type: application/json' -d '{
    "configuracoes": [{ "servico_id": 1, "taxa_percentual": 40 }]
  }'
# 200 { message, configuracoes: [{servico_id:1, taxa_percentual:40, estado:"Ativo"}] }
```

**Teste — desempenho**

```bash
curl -s -b "$JAR" "$BASE/funcionarios/1/desempenho?de=2026-10-01&ate=2026-10-31"
```

Esperado `200`:

```json
{
  "periodo": { "de": "2026-10-01", "ate": "2026-10-31" },
  "total_servicos": 1,
  "total_valor": 2500,
  "total_comissao": 750,
  "servicos": [
    { "servico_id": 1, "servico_nome": "Corte", "quantidade": 1,
      "total": 2500, "taxa_percentual": 30, "comissao": 750 }
  ]
}
```

**Erros:** faltar `nome`/`salario` → `400`; conta associada inexistente → `400`
(`field: "id_usuario"`); `configuracoes` não ser lista → `400`; serviço inexistente na
configuração → `400` (`field: "servico_id"`).

---

### 4.6. Horários — `/api/funcionarios/:id/horarios`

**Porquê:** RF15 (programação semanal).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/funcionarios/:id/horarios` | autenticado (gestor ou próprio) | `200` array / `403` / `404` funcionário |
| POST | `/funcionarios/:id/horarios` | `horarios:gerir` | `201` / `409` sobreposição |
| PUT | `/funcionarios/:id/horarios` | `horarios:gerir` | `200` lista substituída |
| PUT | `/horarios/:id` | `horarios:gerir` | `200` turno atualizado / `409` |
| DELETE | `/horarios/:id` | `horarios:gerir` | `200` / `404` |

`dia_semana`: `0` = Domingo … `6` = Sábado. `hora_entrada`/`hora_saida` em `HH:MM`.
Pode haver **vários turnos no mesmo dia**, desde que não se sobreponham.

```bash
curl -s -b "$JAR" -X POST "$BASE/funcionarios/1/horarios" \
  -H 'Content-Type: application/json' \
  -d '{"dia_semana":1,"hora_entrada":"09:00","hora_saida":"12:00"}'
# 201 {id, funcionario_id:1, dia_semana:1, hora_entrada:"09:00:00", hora_saida:"12:00:00",
#      estado:"Ativo"}

curl -s -b "$JAR" -X PUT "$BASE/horarios/1" \
  -H 'Content-Type: application/json' \
  -d '{"dia_semana":1,"hora_entrada":"09:30","hora_saida":"12:30"}'
# 200 {id:1, ...} — atualiza apenas este turno

curl -s -b "$JAR" -X DELETE "$BASE/horarios/1"
# 200 {"message":"Horario deletado com sucesso"}

curl -s -b "$JAR" -X PUT "$BASE/funcionarios/1/horarios" \
  -H 'Content-Type: application/json' -d '{
    "horarios": [
      {"dia_semana":1,"hora_entrada":"08:00","hora_saida":"12:00"},
      {"dia_semana":1,"hora_entrada":"13:00","hora_saida":"17:00"},
      {"dia_semana":3,"hora_entrada":"10:00","hora_saida":"18:00"}
    ]
  }'
# 200 [ ... 3 registos ... ]  (substitui toda a programação)
```

**Erros:** `dia_semana` fora de `0..6` → `400`; horas em falta ou inválidas → `400`;
saída não posterior à entrada → `400`; turnos sobrepostos → `409`;
`horarios` não ser lista → `400`.

---

### 4.7. Assiduidade — `/api/assiduidade`

**Porquê:** RF16 (ocorrências, horas reais, histórico de correções via auditoria).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/assiduidade?funcionario=&de=&ate=&tipo=` | `assiduidade:gerir` | `200` array |
| POST | `/assiduidade` | `assiduidade:gerir` | `201` / `409` duplicado `(funcionario,data)` |
| PUT | `/assiduidade/:id` | `assiduidade:gerir` | `200` + auditoria antes/depois |
| PUT | `/assiduidade/dia` | `assiduidade:gerir` | `201` criado / `200` atualizado (upsert por funcionário/data) |

```bash
curl -s -b "$JAR" -X POST "$BASE/assiduidade" -H 'Content-Type: application/json' -d '{
  "funcionario_id": 1,
  "data": "2026-10-05",
  "hora_entrada_real": "09:10",
  "tipo_ocorrencia": "atraso",
  "justificacao": "transito"
}'
# 201 {id, funcionario_id, data, hora_entrada_real, tipo_ocorrencia, estado, ...}

# repetir o mesmo funcionário/data -> 409
curl -s -b "$JAR" -X POST "$BASE/assiduidade" -H 'Content-Type: application/json' \
  -d '{"funcionario_id":1,"data":"2026-10-05"}'

curl -s -b "$JAR" -X PUT "$BASE/assiduidade/1" \
  -H 'Content-Type: application/json' -d '{"justificacao":"consulta medica"}'
# 200 { ... justificacao: "consulta medica" ... }

# controlo mensal: cria ou atualiza o dia sem duplicar
curl -s -b "$JAR" -X PUT "$BASE/assiduidade/dia" \
  -H 'Content-Type: application/json' -d '{
    "funcionario_id": 1,
    "data": "2026-10-05",
    "hora_entrada_real": "09:00",
    "hora_saida_real": "19:00"
  }'
# 201 na primeira vez; 200 nas seguintes (mesmo id)
```

**Erros:** data ou horas inválidas → `400`; saída não posterior à entrada → `400`;
dia novo sem horas → `400`; funcionário inexistente → `400`; `PUT /assiduidade/:id`
inexistente → `404`.

**Verificação de auditoria:**

```bash
curl -s -b "$JAR" "$BASE/auditoria?entidade=assiduidade"
# 200 [ {tipo_operacao:"atualizar", valores_anteriores:{...}, valores_posteriores:{...}} ]
```

---

### 4.8. Atendimentos — `/api/atendimentos`

**Porquê:** RF05 (um ou vários serviços, funcionário por serviço, preço praticado) e
RF06/RF07 (preço variável e desconto).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/atendimentos?de=&ate=&cliente=&funcionario=&estado=` | autenticado | `200` array |
| GET | `/atendimentos/:id` | autenticado | `200` com `servicos` / `404` |
| POST | `/atendimentos` | `atendimentos:escrever` | `201` |
| PUT | `/atendimentos/:id` | `atendimentos:escrever` | `200` (só `cliente_id`) |
| POST | `/atendimentos/:id/servicos` | `atendimentos:escrever` | `201` atendimento atualizado |
| DELETE | `/atendimentos/:id/servicos/:itemId` | `atendimentos:escrever` | `204` |
| PATCH | `/atendimentos/:id/concluir` | `atendimentos:escrever` | `200` |
| POST | `/atendimentos/:id/anular` | `atendimentos:anular` | `200`; exige `motivo` |
| POST | `/atendimentos/:id/descontos` | `atendimentos:escrever` | `200` atendimento atualizado |

Corpo de criação:

```json
{
  "cliente_id": 1,
  "servicos": [
    { "servico_id": 1, "funcionario_id": 1, "preco_praticado": 2500,
      "desconto": 0, "tipo_preco": "fixo" }
  ]
}
```

Os totais do cabeçalho (`valor_bruto`, `valor_desconto`, `valor_total`) são calculados
pelo backend.

```bash
curl -s -b "$JAR" -X POST "$BASE/atendimentos" -H 'Content-Type: application/json' -d '{
  "cliente_id": 1,
  "servicos": [
    {"servico_id":1,"funcionario_id":1,"preco_praticado":2500,"desconto":200}
  ]
}'
# 201 {id, cliente_id, valor_bruto:2500, valor_desconto:200, valor_total:2300,
#       estado:"Em andamento", registado_por:1, servicos:[{... valor_final:2300 ...}]}
```

**Teste — serviço inativo**

```bash
curl -s -b "$JAR" -X POST "$BASE/atendimentos" -H 'Content-Type: application/json' -d '{
  "cliente_id": 1,
  "servicos": [{"servico_id":2,"funcionario_id":1,"preco_praticado":1500}]
}'
# 409 { message: 'O servico "Corte Inativo" esta inativo' }
```

**Teste — adicionar/remover serviço**

```bash
curl -s -b "$JAR" -X POST "$BASE/atendimentos/1/servicos" \
  -H 'Content-Type: application/json' \
  -d '{"servico_id":1,"funcionario_id":1,"preco_praticado":2500}'
# 201 atendimento com 2 serviços e totais recalculados

curl -s -b "$JAR" -X DELETE "$BASE/atendimentos/1/servicos/2" -o /dev/null -w '%{http_code}\n'
# 204
```

**Teste — aplicar desconto numa linha**

```bash
curl -s -b "$JAR" -X POST "$BASE/atendimentos/1/descontos" \
  -H 'Content-Type: application/json' -d '{
    "atendimento_servico_id": 1,
    "escopo": "Servico",
    "tipo": "Percentagem",
    "percentagem": 10,
    "valor_bruto": 2500,
    "valor_desconto": 250,
    "valor_final": 2250
  }'
# 200 atendimento com servicos[] e descontos[] atualizados
```

Erros: faltar campo → `400`; desconto negativo ou acima do valor bruto → `400`;
percentagem fora de 0–100 → `400`; atendimento anulado → `409`.

**Teste — anular**

```bash
curl -s -b "$JAR" -X POST "$BASE/atendimentos/1/anular" \
  -H 'Content-Type: application/json' -d '{"motivo":"Cliente desistiu"}'
# 200 { estado: "Anulado", motivo_anulacao: "Cliente desistiu", ... }
```

**Erros:** sem `cliente_id` ou `servicos` vazio → `400`; linha sem
`servico_id`/`funcionario_id`/`preco_praticado` → `400`; cliente/funcionário inexistente
→ `400`; sem `motivo` na anulação → `400`; sem `atendimentos:anular` → `403`.

> **Nota:** anular o atendimento **não** anula automaticamente os pagamentos nem as
> comissões (ver §3.1). Testa-o de propósito para conheceres o comportamento atual.

---

### 4.9. Pagamentos — `/api/pagamentos` e `/api/atendimentos/:id/pagamentos`

**Porquê:** RF08 (parcelas/métodos), RF09 (anulação) e RF18 (comissão só na liquidação).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/pagamentos?de=&ate=&estado=&metodo=` | autenticado | `200` array |
| GET | `/pagamentos/:id` | autenticado | `200` com `parcelas` / `404` |
| POST | `/atendimentos/:id/pagamentos` | `pagamentos:registar` | `201` |
| GET | `/atendimentos/:id/pagamento` | autenticado | `200` estado de liquidação |
| POST | `/pagamentos/:id/anular` | `pagamentos:anular` | `200`; exige `motivo` |

Corpo:

```json
{ "parcelas": [
  { "metodo_pagamento": "Dinheiro", "valor": 1500 },
  { "metodo_pagamento": "M-Pesa", "valor": 1000, "referencia": "MP123" }
] }
```

Regras verificáveis:

- Soma `>` devido → `400`.
- Soma `<` devido → `estado = "Parcial"` (comportamento atual; ver §3.1).
- Soma `=` devido → `estado = "Liquidado"`, atendimento passa a `Pago` e **gera comissões**.
- Se houver caixa aberto, é criada uma `Entrada` no caixa.
- `on conflict` por `(origem, referencia_id)` evita duplicar o movimento.

```bash
# liquidar por completo um atendimento de 2500
curl -s -b "$JAR" -X POST "$BASE/atendimentos/1/pagamentos" \
  -H 'Content-Type: application/json' -d '{
    "parcelas": [
      {"metodo_pagamento":"Dinheiro","valor":1500},
      {"metodo_pagamento":"M-Pesa","valor":1000,"referencia":"MP123"}
    ]
  }'
# 201 {id, atendimento_id:1, valor_total:2500, estado:"Liquidado",
#       parcelas:[{metodo_pagamento, valor, referencia}, ...]}
```

**Estado de liquidação**

```bash
curl -s -b "$JAR" "$BASE/atendimentos/1/pagamento"
# 200 { atendimento_id:1, valor_total:2500, estado:"Pago",
#       pagamentos:[{id, valor_total, estado:"Liquidado", data_hora}] }
```

**Comissão gerada**

```bash
curl -s -b "$JAR" "$BASE/comissoes?funcionario=1"
# 200 [{atendimento_servico_id, funcionario_id, taxa:30,
#       base_calculo:2500 (ou valor_final com desconto),
#       valor_comissao:750, estado:"Elegivel"}]
```

**Anulação**

```bash
curl -s -b "$JAR" -X POST "$BASE/pagamentos/1/anular" \
  -H 'Content-Type: application/json' -d '{"motivo":"Erro de operador"}'
# 200 { message: "Pagamento anulado" }
```

Efeito atual: o pagamento fica `Anulado` e o atendimento é recalculado; **o movimento de
caixa e a comissão permanecem** (ver §3.1). Repetir a anulação → `409`.

**Erros:** lista vazia → `400`; parcela sem método/valor → `400`; atendimento inexistente →
`404`; atendimento anulado → `409`; pagar acima do devido → `400`; sem `motivo` → `400`.

---

### 4.10. Comissões — `/api/comissoes`

**Porquê:** RF18 (consulta por funcionário/período).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/comissoes?funcionario=&de=&ate=&estado=` | `relatorios:ler` | `200` array |
| GET | `/funcionarios/:id/comissoes?de=&ate=` | próprio funcionário **ou** `relatorios:ler` | `200` / `403` |

```bash
curl -s -b "$JAR" "$BASE/comissoes?de=2026-10-01&ate=2026-10-31"
# 200 [{id, atendimento_servico_id, funcionario_id, funcionario_nome,
#       taxa: 30, base_calculo, valor_comissao, estado, criado_em}]
```

Estados possíveis: `Elegivel` (criada na liquidação) e `Paga` (após pagamento do
processamento salarial).

---

### 4.11. Caixa — `/api/caixa`

**Porquê:** RF10 (caixa único, saldo), RF11 (fecho) e RF12 (levantamentos).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| POST | `/caixa/abrir` | `caixa:operar` | `201` sessão / `409` se já aberta |
| GET | `/caixa/atual` | `caixa:operar` | `200` estado + saldo esperado |
| POST | `/caixa/levantamento` | `caixa:levantar` | `201` / `409` sem sessão |
| GET | `/caixa/movimentos` | `caixa:operar` | `200` / `404` sem sessão |
| POST | `/caixa/fechar` | `caixa:fechar` | `200` fecho com diferença / `409` |
| GET | `/caixa/fechos?de=&ate=` | `relatorios:ler` | `200` array |

```bash
curl -s -b "$JAR" -X POST "$BASE/caixa/abrir" \
  -H 'Content-Type: application/json' -d '{"saldo_inicial":1000}'
# 201 {id, caixa_id, saldo_inicial:1000, estado:"Aberta", data_abertura, ...}

curl -s -b "$JAR" -X POST "$BASE/caixa/abrir" \
  -H 'Content-Type: application/json' -d '{"saldo_inicial":500}'
# 409 { message: "Ja existe uma sessao de caixa aberta; feche-a antes de abrir outra" }

curl -s -b "$JAR" "$BASE/caixa/atual"
# 200 { aberta:true, sessao:{...}, saldo_esperado: 1000 }
```

**Levantamento**

```bash
curl -s -b "$JAR" -X POST "$BASE/caixa/levantamento" \
  -H 'Content-Type: application/json' -d '{"valor":200,"descricao":"troco"}'
# 201 { message: "Levantamento registado" }

curl -s -b "$JAR" "$BASE/caixa/atual"
# 200 { ..., saldo_esperado: 800 }
```

**Movimentos**

```bash
curl -s -b "$JAR" "$BASE/caixa/movimentos"
# 200 { sessao_id:1, movimentos:[{id, tipo_movimento:"Levantamento", valor:200,
#       origem:"Levantamento", estado:"Ativo", ...}] }
```

**Fecho**

```bash
curl -s -b "$JAR" -X POST "$BASE/caixa/fechar" \
  -H 'Content-Type: application/json' -d '{"valor_contado":780,"observacoes":"faltam 20"}'
# 200 { id:1, valor_esperado:800, valor_contado:780, diferenca:-20,
#       observacoes:"faltam 20", estado:"Fechada", data_fecho, ... }
```

**Histórico**

```bash
curl -s -b "$JAR" "$BASE/caixa/fechos?de=2026-10-01&ate=2026-10-31"
# 200 [{id, data_abertura, data_fecho, saldo_inicial, valor_esperado,
#       valor_contado, diferenca, ...}]
```

**Erros:** `saldo_inicial` em falta → `400`; `valor` do levantamento ≤ 0 → `400`;
`valor_contado` em falta → `400`; operar sem sessão → `409`; consultar movimentos sem
sessão → `404`.

---

### 4.12. Despesas e categorias de despesa — `/api/despesas`

**Porque:** RF13 (compras de produtos, ligação ao caixa, relatórios).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/despesas?de=&ate=&categoria=&estado=` | autenticado | `200` array |
| GET | `/despesas/:id` | autenticado | `200` com `itens` / `404` |
| POST | `/despesas` | `despesas:escrever` | `201`; cria saída se `caixa_sessao_id` |
| PUT | `/despesas/:id` | `despesas:escrever` | `200` + auditoria antes/depois |
| DELETE | `/despesas/:id` | `despesas:escrever` | `204` + auditoria |
| GET | `/categorias-despesa` | autenticado | `200` array |
| POST | `/categorias-despesa` | `despesas:escrever` | `201` / `409` nome duplicado |

Criação aceita `valor_total` **ou** `itens`. Se enviar `itens`, o total é recalculado a
partir de `quantidade * preco_unitario`.

```bash
curl -s -b "$JAR" -X POST "$BASE/despesas" -H 'Content-Type: application/json' -d '{
  "descricao": "Compra de shampoo",
  "categoria_id": 1,
  "valor_total": 1500,
  "data_compra": "2026-10-17",
  "metodo_pagamento": "Dinheiro",
  "caixa_sessao_id": 1,
  "comprovativo": "FAC-001"
}'
# 201 {id, descricao, valor_total:1500, estado:"Ativo", itens:[]}
```

Com `caixa_sessao_id` válido, passa a existir em `/caixa/movimentos`:

```json
{ "tipo_movimento": "Saida", "valor": 1500, "origem": "Despesa",
  "referencia_id": 1, "estado": "Ativo" }
```

**Atualizar (gera auditoria)**

```bash
curl -s -b "$JAR" -X PUT "$BASE/despesas/1" \
  -H 'Content-Type: application/json' -d '{"descricao":"Compra corrigida"}'
# 200 { ... descricao:"Compra corrigida" ... }

curl -s -b "$JAR" "$BASE/auditoria?entidade=despesa&operacao=atualizar"
# 200 [{valores_anteriores:{descricao:"Compra de shampoo",...},
#       valores_posteriores:{descricao:"Compra corrigida",...}}]
```

**Erros:** sem `descricao` ou sem `valor_total`/`itens` → `400`; total ≤ 0 → `400`;
categoria/produto inexistente → `400`; editar sem nenhum campo → `400`.

> **Nota:** a tabela `produto` existe, mas ainda não há API de produtos (ver
> `estado-e-pendencias.md`). Nos testes usa `valor_total`.

---

### 4.13. Fidelização — `/api/clientes/:id/fidelizacao`

**Porquê:** RF20 (marca diária, 5 → 6.º serviço obrigatório, sem acúmulo, histórico, correção auditada).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/clientes/:id/fidelizacao` | autenticado | `200` progresso / `404` cliente |
| POST | `/clientes/:id/fidelizacao/correcao` | `fidelizacao:corrigir` | `200` progresso + auditoria |
| POST | `/clientes/:id/fidelizacao/marcas` | Administrador | `200` progresso + marcas / `409` se exigir confirmação, se passar de 5/5 ou se o 6.º serviço estiver pendente |
| DELETE | `/clientes/:id/fidelizacao/marcas/:movimentoId` | Administrador | `200` progresso / `409` para marcas de ciclos anteriores |
| POST | `/clientes/:id/fidelizacao/beneficios/utilizar` | Administrador | `200` progresso / `409` sem 6.º serviço pendente |

```bash
curl -s -b "$JAR" "$BASE/clientes/1/fidelizacao"
```

Esperado `200`:

```json
{
  "cliente_id": 1,
  "cartao": { "id": 1, "cliente_id": 1, "estado": "Ativo" },
  "ciclo_atual": 1,
  "meta": 5,
  "limite_beneficio": 200,
  "marcas_no_ciclo": 1,
  "beneficios_disponiveis": 0,
  "beneficios_utilizados": 0,
  "beneficio_pendente": false,
  "historico": [
    { "tipo_movimento": "marca", "origem": "atendimento", "ciclo": 1, "data_hora": "..." }
  ]
}
```

Sem cartão, devolve `cartao: null`, `marcas_no_ciclo: 0` e `historico: []`.

**Como gerar marcas:** cria atendimentos com um serviço `elegivel_fidelizacao: true`,
com valor até 200 MT, e liquida-os. Regras a verificar nos testes:

1. Vários serviços do mesmo cliente no mesmo dia → **1 marca**.
2. Ao chegar a 5 marcas no ciclo → aparece `beneficio_ganho`, o cartão continua em
   `marcas_no_ciclo: 5`, `beneficios_disponiveis: 1` e `beneficio_pendente: true`.
3. Com o cartão completo, um atendimento com serviço elegível **sem** a flag gratuita →
   `409`; o 6.º serviço não pode ser pago.
4. No 6.º serviço, envia `usar_beneficio_fidelizacao: true` na linha escolhida, mantendo o
   `preco_praticado` normal. O backend aplica 100% de desconto a **essa única linha**.
5. O benefício passa a `beneficios_utilizados: 1`, `beneficio_pendente: false`, e o ciclo
   seguinte começa em **0 marcas**.
6. Se o atendimento do 6.º serviço tiver outros serviços pagos, esses serviços também não
   geram marca.
7. Tentar dois serviços gratuitos no mesmo atendimento → `409`.
8. Tentar usar o benefício num serviço não elegível ou acima de 200 MT → `400`.
9. Tentar usar o benefício sem o cartão completo → `409`.
10. Cliente feminino e cliente masculino seguem exatamente as mesmas regras.

**Correção**

```bash
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/correcao" \
  -H 'Content-Type: application/json' \
  -d '{"tipo_movimento":"correcao","ciclo":1,"observacao":"Ajuste autorizado"}'
# 200 progresso atualizado

curl -s -b "$JAR" "$BASE/auditoria?entidade=fidelizacao"
# 200 [{tipo_operacao:"corrigir", ...}]
```

**Preenchimento manual (Administrador)**

```bash
# 2 marcas manuais (sem gerar benefício)
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/marcas" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade":2}'
# 200 { marcas_no_ciclo:2, beneficios_gerados:0, ... }

# mais 3 marcas: o 5.º movimento completa o cartão -> 409 se não confirmar
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/marcas" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade":3}'
# 409 { requer_confirmacao:true, beneficios_a_gerar:1, marcas_no_ciclo:2, marcas_apos:5 }

curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/marcas" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade":3,"confirmar_beneficio":true}'
# 200 { ciclo_atual:1, marcas_no_ciclo:5, beneficios_disponiveis:1, beneficio_pendente:true, beneficios_gerados:1 }

# o cartão está 5/5: não aceita mais marcas
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/marcas" \
  -H 'Content-Type: application/json' -d '{"quantidade":1}'
# 409

# antes de consumir o 6.º, é possível remover uma marca do ciclo atual,
# manual ou de atendimento (remove também o benefício pendente)
curl -s -b "$JAR" -X DELETE "$BASE/clientes/1/fidelizacao/marcas/123"
# 200 { marcas_no_ciclo:4, beneficio_pendente:false, ... }

# marcas de ciclos anteriores devolvem 409
curl -s -b "$JAR" -X DELETE "$BASE/clientes/1/fidelizacao/marcas/1"
# 409

# repor a 5.ª marca
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/marcas" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade":1,"confirmar_beneficio":true}'
# 200 { marcas_no_ciclo:5, beneficio_pendente:true, ... }

# cartão físico em que o 6.º serviço já foi prestado: registar a utilização manual
curl -s -b "$JAR" -X POST "$BASE/clientes/1/fidelizacao/beneficios/utilizar" \
  -H 'Content-Type: application/json' -d '{}'
# 200 { marcas_no_ciclo:0, beneficios_disponiveis:0, beneficio_pendente:false, ... }
```

> Para consumir o 6.º serviço num atendimento em vez do registo manual, use
> `usar_beneficio_fidelizacao: true` (ver as regras desta secção). Os dois caminhos não
> devem ser usados em conjunto para o mesmo cartão completo.
>
> Um utilizador sem perfil `Administrador` recebe `403` nas três rotas de preenchimento
> manual, mesmo que tenha `clientes:escrever`.

---

### 4.14. Salários — `/api/salarios`

**Porquê:** RF17 (processamento mensal) e RF19 (aprovação/pagamento).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/salarios/processamentos?periodo=&funcionario=&estado=` | `salarios:gerir` | `200` array |
| GET | `/salarios/processamentos/:id` | `salarios:gerir` | `200` com `deducoes` / `404` |
| POST | `/salarios/processar` | `salarios:gerir` | `201` array (um por funcionário ativo) |
| PUT | `/salarios/processamentos/:id/deducoes` | `salarios:gerir` | `200` / `409` se não estiver `Preparado` |
| PATCH | `/salarios/processamentos/:id/aprovar` | `salarios:aprovar` | `200` / `409` |
| PATCH | `/salarios/processamentos/:id/pagar` | `salarios:gerir` | `200` / `409` |

```bash
curl -s -b "$JAR" -X POST "$BASE/salarios/processar" \
  -H 'Content-Type: application/json' -d '{"periodo":"2026-10"}'
# 201 [{id, funcionario_id, funcionario_nome, periodo_inicio:"2026-10-01",
#       periodo_fim:"2026-10-31", salario_base, total_comissoes,
#       total_deducoes:0, total_a_pagar, estado:"Preparado", deducoes:[]}]
```

Repetir o mesmo período **não duplica** (o índice único + `on conflict do nothing` faz com
que a segunda chamada devolva uma lista vazia).

**Deduções**

```bash
curl -s -b "$JAR" -X PUT "$BASE/salarios/processamentos/1/deducoes" \
  -H 'Content-Type: application/json' -d '{
    "deducoes": [
      {"tipo":"falta","descricao":"Falta injustificada","valor":1500,"motivo":"RF16"}
    ]
  }'
# 200 { total_deducoes:1500, total_a_pagar: (base + comissoes - 1500), deducoes:[...] }
```

**Aprovar e pagar**

```bash
curl -s -b "$JAR" -X PATCH "$BASE/salarios/processamentos/1/aprovar"
# 200 { estado:"Aprovado", aprovado_por:1, data_aprovacao:"..." }

curl -s -b "$JAR" -X PATCH "$BASE/salarios/processamentos/1/pagar"
# 200 { estado:"Pago", data_pagamento:"..." }

# tentar alterar deduções depois de aprovado -> 409
curl -s -b "$JAR" -X PUT "$BASE/salarios/processamentos/1/deducoes" \
  -H 'Content-Type: application/json' -d '{"deducoes":[]}'
```

**Comissões passam a `Paga`:**

```bash
curl -s -b "$JAR" "$BASE/comissoes?funcionario=1&estado=Paga"
# 200 [ ... ]
```

**Erros:** período fora de `AAAA-MM` → `400`; mês `13` → `400`; aprovar duas vezes → `409`;
pagar antes de aprovar → `409`; sem `salarios:aprovar` → `403` (ex.: perfil `Usuario`).

---

### 4.15. Relatórios — `/api/relatorios`

**Porquê:** RF21 (financeiro, serviços, funcionários, assiduidade, clientes, fidelização,
anulações, movimentos).

Todas as rotas exigem `relatorios:ler` e aceitam `?de=AAAA-MM-DD&ate=AAAA-MM-DD`
(opcionais).

| Rota | Conteúdo | Forma |
| --- | --- | --- |
| `/relatorios/resumo` | receita, despesas, resultado | objeto |
| `/relatorios/financeiro` | resumo, comparação, receitas, despesas e fluxo | objeto |
| `/relatorios/caixa` | entradas, saídas, levantamentos, sessões | objeto |
| `/relatorios/servicos` | serviços mais realizados | array |
| `/relatorios/funcionarios` | serviços e comissões por funcionário | array |
| `/relatorios/assiduidade` | registos/ocorrências por funcionário | array |
| `/relatorios/clientes` | clientes mais frequentes | array |
| `/relatorios/fidelizacao` | marcas/benefícios ganhos/utilizados | objeto |
| `/relatorios/anulacoes` | atendimentos e pagamentos anulados | array |
| `/relatorios/movimentos` | movimentos de caixa | array |

```bash
curl -s -b "$JAR" "$BASE/relatorios/resumo?de=2026-10-01&ate=2026-10-31"
# 200 { "receita": 2500, "despesas": 1500, "resultado": 1000 }

curl -s -b "$JAR" "$BASE/relatorios/caixa?de=2026-10-01&ate=2026-10-31"
# 200 { "entradas":2500, "saidas":1500, "levantamentos":200, "sessoes":[...] }

curl -s -b "$JAR" "$BASE/relatorios/financeiro?de=2026-10-01&ate=2026-10-31"
# 200 { "periodo":{...}, "resumo":{...}, "comparacao":{...},
#       "receitas":{...}, "despesas":{...}, "fluxo":{...},
#       "salarios":{...}, "dividas":{...}, "gerado_por":"...", "gerado_em":"..." }

curl -s -b "$JAR" "$BASE/relatorios/servicos"
# 200 [{servico_id, servico_nome, quantidade, total}]

curl -s -b "$JAR" "$BASE/relatorios/funcionarios"
# 200 [{funcionario_id, funcionario_nome, servicos, total_servicos, total_comissoes}]

curl -s -b "$JAR" "$BASE/relatorios/assiduidade"
# 200 [{funcionario_id, funcionario_nome, registos, ocorrencias, atrasos, faltas}]

curl -s -b "$JAR" "$BASE/relatorios/clientes"
# 200 [{cliente_id, cliente_nome, telefone, atendimentos, total_gasto}]

curl -s -b "$JAR" "$BASE/relatorios/fidelizacao"
# 200 { "marcas": 1, "beneficios_ganhos": 0, "beneficios_utilizados": 0 }

curl -s -b "$JAR" "$BASE/relatorios/anulacoes"
# 200 [{tipo:"atendimento"|"pagamento", id, cliente_id, cliente_nome, valor, motivo, data_hora}]

curl -s -b "$JAR" "$BASE/relatorios/movimentos"
# 200 [{id, id_sessao, tipo_movimento, valor, descricao, origem, referencia_id, data_hora, estado}]
```

> `resumo` conta apenas parcelas de pagamentos **não anulados**, mas **não** verifica se o
> atendimento está anulado (ver §3.1). `clientes` conta todos os atendimentos em
> `atendimentos`, mas só soma `total_gasto` dos não anulados.

---

### 4.16. Catálogo público — `/api/public`

**Porquê:** RF22 e RNF11 (divulgação sem autenticação, sem expor dados internos).

| Método | Rota | Autenticação | Esperado |
| --- | --- | --- | --- |
| GET | `/public/servicos` | **nenhuma** | `200` array de serviços ativos |
| GET | `/public/servicos/:id` | **nenhuma** | `200` / `404` (inativo ou inexistente) |

```bash
# sem cookie de propósito
curl -s "$BASE/public/servicos"
```

Esperado `200`:

```json
[
  {
    "id": 1,
    "nome": "Corte",
    "descricao": "Corte simples",
    "valor": 2500,
    "duracao_min": 30,
    "tipo_preco": "fixo",
    "categoria_nome": "Cabelo"
  }
]
```

Campos internos (`estado`, `categoria_id`, `elegivel_fidelizacao`, `data_criacao`) **não**
podem aparecer. Serviço inativo:

```bash
curl -s "$BASE/public/servicos/2" -w '\n%{http_code}\n'
# {"message":"Servico nao encontrado"}
# 404
```

**Teste de segurança:** confirmar que sem cookie a rota responde `200` e que
`/api/clientes` sem cookie responde `401`.

---

### 4.17. Auditoria — `/api/auditoria`

**Porquê:** RF23 e RN21 (registo imutável das operações relevantes).

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/auditoria?entidade=&utilizador=&de=&ate=&operacao=` | `auditoria:ler` | `200` array |
| GET | `/auditoria/:id` | `auditoria:ler` | `200` / `404` |

```bash
curl -s -b "$JAR" "$BASE/auditoria"
# 200 [{id, id_utilizador, utilizador_nome, data_hora, entidade,
#       id_registo_afetado, tipo_operacao, valores_anteriores,
#       valores_posteriores, motivo, identificador_operacao}]

curl -s -b "$JAR" "$BASE/auditoria?entidade=pagamento&operacao=anular"
# 200 [{tipo_operacao:"anular", valores_anteriores:{estado:"Liquidado"},
#       valores_posteriores:{estado:"Anulado"}, motivo:"Erro de operador"}]

curl -s -b "$JAR" "$BASE/auditoria?utilizador=1&de=2026-10-01&ate=2026-10-31"
```

**Teste — append-only (na base de dados)**

```bash
psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  -c "update log_auditoria set motivo='alterado' where id=1;"
# ERROR: log_auditoria e append-only (sem update/delete)

psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  -c "delete from log_auditoria where id=1;"
# ERROR: log_auditoria e append-only (sem update/delete)
```

**Permissões:**

```bash
# perfil Usuario (sem auditoria:ler) -> 403
curl -s -b "$JAR_USUARIO" "$BASE/auditoria" -w '\n%{http_code}\n'
# {"message":"Acesso negado: permissao insuficiente"}
# 403
```

**Operações que devem gerar log (checklist):**

| Ação | `entidade` | `tipo_operacao` |
| --- | --- | --- |
| Criar atendimento | `atendimento` | `criar` |
| Anular atendimento | `atendimento` | `anular` |
| Registar pagamento | `pagamento` | `criar` |
| Anular pagamento | `pagamento` | `anular` |
| Abrir caixa | `caixa_sessao` | `criar` |
| Levantamento | `movimento_caixa` | `criar` |
| Fechar caixa | `caixa_sessao` | `fechar` |
| Criar/atualizar/remover despesa | `despesa` | `criar`/`atualizar`/`remover` |
| Processar salário | `processamento_salarial` | `criar` |
| Atualizar deduções | `processamento_salarial` | `atualizar_deducoes` |
| Aprovar/pagar salário | `processamento_salarial` | `aprovar`/`pagar` |
| Criar/atualizar assiduidade | `assiduidade` | `criar`/`atualizar` |
| Corrigir fidelização | `fidelizacao` | `corrigir` |
| Alterar permissões de utilizador | `usuario_permissao` | `atualizar` |
| Alterar permissões de perfil | `perfil_permissao` | `atualizar` |

---

### 4.18. Utilizadores, perfis e permissões — `/api/usuarios`, `/api/perfis`

**Porquê:** RF02 (contas, perfis, permissões, reposição de credenciais) e RFC do RBAC.

Todas as rotas exigem `contas:gerir` (por omissão, Administrador).

| Método | Rota | Esperado |
| --- | --- | --- |
| GET | `/usuarios` | `200` array (sem senha) |
| GET | `/usuarios/:id` | `200` / `404` |
| POST | `/usuarios` | `201`; sem `senha` usa a senha padrão `12345` e obriga a troca |
| PUT | `/usuarios/:id` | `200` |
| PATCH | `/usuarios/:id/estado` | `200` |
| POST | `/usuarios/:id/repor-senha` | `200 { senha_padrao: "12345" }` |
| GET | `/usuarios/:id/permissoes` | `200 { efetivas, overrides }` |
| PUT | `/usuarios/:id/permissoes` | `200` + auditoria |
| GET | `/perfis` | `200` array |
| GET | `/perfis/:id` | `200` com `permissoes` |
| POST | `/perfis` | `201` |
| PUT | `/perfis/:id` | `200` |
| PUT | `/perfis/:id/permissoes` | `200` + auditoria |
| GET | `/permissoes` | `200` catálogo |

**Criar conta com a senha padrão**

```bash
curl -s -b "$JAR" -X POST "$BASE/usuarios" -H 'Content-Type: application/json' -d '{
  "nome": "Paulo Nhaca",
  "telefone": "843333333",
  "id_perfil": 2
}'
# 201 { user: {id, nome, telefone, id_perfil, estado:"Ativo",
#              alteracao_obrigatoria_senha: true, ...},
#       senha_padrao: "12345", senha_temporaria: "12345" }
```

O login com `12345` devolve `deve_alterar_senha: true`. O frontend redireciona para
`/primeiro-acesso` e só permite entrar no sistema depois de definir a nova senha.

**Permissões individuais**

```bash
curl -s -b "$JAR" -X PUT "$BASE/usuarios/2/permissoes" \
  -H 'Content-Type: application/json' \
  -d '{"conceder":["relatorios:ler"],"revogar":["caixa:operar"]}'
# 200 { message, efetivas: [...] }

curl -s -b "$JAR" "$BASE/usuarios/2/permissoes"
# 200 { efetivas: [...], overrides: [{codigo:"relatorios:ler", efeito:"conceder"}, ...] }
```

**Permissões de perfil**

```bash
curl -s -b "$JAR" -X PUT "$BASE/perfis/2/permissoes" \
  -H 'Content-Type: application/json' \
  -d '{"permissoes":["clientes:ler","clientes:escrever","atendimentos:escrever"]}'
# 200 { message, permissoes:[...] }
```

**Erros:** faltar `nome`/`telefone`/`id_perfil` → `400`; telefone duplicado → `409`;
perfil inexistente → `400`; lista de permissões inválida → `400`; `conceder`/`revogar` com
código inexistente → erro de FK (`400`/`409`).

---

### 4.19. Dashboard — `/api/dashboard`

**Porquê:** visão inicial com indicadores reais (mês actual, série de 6 meses, tops e
atendimentos recentes).

| Método | Rota | Autenticação | Esperado |
| --- | --- | --- | --- |
| GET | `/dashboard` | autenticado | `200` objeto com `resumo`, `indicadores`, `serie`, `top_servicos`, `top_funcionarios`, `recentes` e `fidelizacao` |

```bash
curl -s -b "$JAR" "$BASE/dashboard"
# 200 {
#   "atualizado_em": "...",
#   "resumo": {"receita":..., "despesas":..., "resultado":..., ...},
#   "indicadores": {"atendimentos_hoje":..., ...},
#   "serie": [{"mes":"2026-05","receita":...,"despesas":...}],
#   "top_servicos": [...], "top_funcionarios": [...],
#   "recentes": [...], "fidelizacao": {"marcas":..., ...}
# }
```

> Sem sessão → `401`. A receita ignora pagamentos anulados; as despesas contam apenas
> despesas `Ativo`.

---

### 4.20. Stock — `/api/movimentos`, `/api/stock`, `/api/entrada|saida|ajuste`

**Porquê:** controlo de entradas/saídas de produtos e saldo actual.

| Método | Rota | Permissão | Esperado |
| --- | --- | --- | --- |
| GET | `/movimentos?produto_id=&tipo=&data_inicio=&data_fim=` | autenticado | `200` array |
| GET | `/stock/:produto_id` | autenticado | `200` resumo calculado (entradas/saídas/ajustes) |
| POST | `/entrada` | `estoque:escrever` | `201` movimento |
| POST | `/saida` | `estoque:escrever` | `201` movimento |
| POST | `/ajuste` | `estoque:escrever` | `201` movimento |

```bash
curl -s -b "$JAR" -X POST "$BASE/entrada" \
  -H 'Content-Type: application/json' \
  -d '{"produto_id":1,"quantidade":10,"motivo":"Compra"}'
# 201 { id, produto_id, tipo, quantidade, ... }

curl -s -b "$JAR" "$BASE/stock/1"
# 200 { stock_minimo, total_entradas, total_saidas, total_ajustes, nota }

curl -s -b "$JAR" "$BASE/movimentos?produto_id=1&tipo=entrada"
# 200 [ ... ]
```

> **Atenção:** a permissão `estoque:escrever` não consta do seed inicial. Sem a conceder
> manualmente, mesmo o Administrador recebe `403`. Saída sem stock suficiente deve ser
> rejeitada (`400`/`409`).
>
> O frontend chama `POST /api/estoque/entrada|saida|ajuste`, que devolve `404`. As rotas
> reais são `POST /api/entrada|saida|ajuste`.

---

## 5. Cenários ponta a ponta

### 5.1. Atendimento → pagamento → comissão → salário

```bash
# 1) criar funcionário (salário 9000, comissão 30%)
FUN=$(curl -s -b "$JAR" -X POST "$BASE/funcionarios" -H 'Content-Type: application/json' \
  -d '{"nome":"Joana Macuacua","salario":9000,"comissao_percentual":30}' | jq -r .id)

# 2) criar cliente
CLI=$(curl -s -b "$JAR" -X POST "$BASE/clientes" -H 'Content-Type: application/json' \
  -d '{"nome":"Ana Costa","telefone":"841111111"}' | jq -r .id)

# 3) criar atendimento (2500)
AT=$(curl -s -b "$JAR" -X POST "$BASE/atendimentos" -H 'Content-Type: application/json' \
  -d "{\"cliente_id\":$CLI,\"servicos\":[{\"servico_id\":1,\"funcionario_id\":$FUN,\"preco_praticado\":2500}]}" \
  | jq -r .id)

# 4) pagar integralmente
curl -s -b "$JAR" -X POST "$BASE/atendimentos/$AT/pagamentos" \
  -H 'Content-Type: application/json' \
  -d '{"parcelas":[{"metodo_pagamento":"Dinheiro","valor":2500}]}'

# 5) confirmar comissão (30% de 2500 = 750)
curl -s -b "$JAR" "$BASE/comissoes?funcionario=$FUN" | jq -c '.[0] | {valor_comissao, estado}'
# {"valor_comissao":750,"estado":"Elegivel"}

# 6) processar salário do mês
PR=$(curl -s -b "$JAR" -X POST "$BASE/salarios/processar" \
  -H 'Content-Type: application/json' -d '{"periodo":"2026-10"}' | jq -r '.[0].id')
curl -s -b "$JAR" "$BASE/salarios/processamentos/$PR" \
  | jq -c '{salario_base, total_comissoes, total_a_pagar, estado}'
# {"salario_base":9000,"total_comissoes":750,"total_a_pagar":9750,"estado":"Preparado"}

# 7) aprovar e pagar
curl -s -b "$JAR" -X PATCH "$BASE/salarios/processamentos/$PR/aprovar"
curl -s -b "$JAR" -X PATCH "$BASE/salarios/processamentos/$PR/pagar"

# 8) comissão passa a Paga
curl -s -b "$JAR" "$BASE/comissoes?funcionario=$FUN" | jq -c '.[0] | {valor_comissao, estado}'
# {"valor_comissao":750,"estado":"Paga"}
```

### 5.2. Caixa de um dia

```bash
# abrir com 1000
curl -s -b "$JAR" -X POST "$BASE/caixa/abrir" -H 'Content-Type: application/json' \
  -d '{"saldo_inicial":1000}'

# atendimento + pagamento em dinheiro (gera Entrada)
# despesa paga pelo caixa (gera Saida)
curl -s -b "$JAR" -X POST "$BASE/despesas" -H 'Content-Type: application/json' -d '{
  "descricao":"Compra de produtos","categoria_id":1,"valor_total":500,"caixa_sessao_id":1
}'

# levantamento
curl -s -b "$JAR" -X POST "$BASE/caixa/levantamento" -H 'Content-Type: application/json' \
  -d '{"valor":200,"descricao":"troco"}'

# conferir esperado
curl -s -b "$JAR" "$BASE/caixa/atual" | jq -c '{saldo_esperado}'
# se pagamento=2500, despesa=500, levantamento=200 e saldo inicial=1000 -> 2800

# fechar
curl -s -b "$JAR" -X POST "$BASE/caixa/fechar" -H 'Content-Type: application/json' \
  -d '{"valor_contado":2800,"observacoes":"sem diferenca"}'
# 200 { valor_esperado:2800, valor_contado:2800, diferenca:0, estado:"Fechada" }
```

### 5.3. Fidelização (5 serviços → 6.º gratuito)

1. Cria um serviço `elegivel_fidelizacao: true` com valor até 200 MT.
2. Regista e liquida 1 atendimento por dia (dias diferentes).
3. Após o 5.º, `GET /clientes/:id/fidelizacao` deve mostrar:
   - `marcas_no_ciclo: 5` e `ciclo_atual` do ciclo completo;
   - `beneficios_disponiveis: 1` e `beneficio_pendente: true`;
   - `limite_beneficio: 200`;
   - histórico com `beneficio_ganho`.
4. Tenta criar o 6.º atendimento com um serviço elegível **sem** a flag gratuita → `409`.
5. Cria o 6.º atendimento com um serviço elegível até 200 MT e
   `usar_beneficio_fidelizacao: true`; mantém o `preco_praticado` original. O backend
   aplica o desconto integral a essa linha.
   - `beneficios_disponiveis: 0` e `beneficio_pendente: false`;
   - `beneficios_utilizados: 1`;
   - não surge `marca` no ciclo seguinte; `marcas_no_ciclo` fica em `0`.
6. Adiciona outros serviços pagos ao atendimento do 6.º serviço e confirma que nenhum
   deles gera marca.
7. Repete com um cliente feminino: o comportamento tem de ser idêntico.
8. Tenta enviar dois itens com `usar_beneficio_fidelizacao: true` no mesmo atendimento →
   `409`.
9. Tenta acrescentar a 6.ª marca manual com o cartão completo → `409`; regista a
   utilização do 6.º serviço pelo endpoint manual e confirma que volta a 0/5.

### 5.4. Auditoria de uma anulação

```bash
curl -s -b "$JAR" -X POST "$BASE/pagamentos/1/anular" \
  -H 'Content-Type: application/json' -d '{"motivo":"Erro de operador"}'

curl -s -b "$JAR" "$BASE/auditoria?entidade=pagamento&operacao=anular" \
  | jq -c '.[0] | {utilizador_nome, tipo_operacao, valores_anteriores,
                   valores_posteriores, motivo}'
# {"utilizador_nome":"Administrador","tipo_operacao":"anular",
#  "valores_anteriores":{"estado":"Liquidado"},
#  "valores_posteriores":{"estado":"Anulado"},"motivo":"Erro de operador"}
```

---

## 6. Checklist rápido de verificação

Copia para o teu caderno de testes:

```text
[ ] Servidor arranca e /api/auth/login devolve cookie
[ ] /auth/me devolve permissoes do perfil
[ ] PATCH /auth/me atualiza nome/telefone com senha_atual correta
[ ] Sem cookie -> 401; com permissao insuficiente -> 403
[ ] CRUD de categorias/servicos/clientes/funcionarios
[ ] Modalidades e aplicacoes de servico
[ ] Servico inativo nao entra no catalogo interno nem no publico
[ ] Alterar preco cria registo em /servicos/:id/historico-precos
[ ] Atendimento com 2 servicos soma totais e desconto
[ ] POST /atendimentos/:id/descontos recalcula totais
[ ] Servico inativo no atendimento -> 409
[ ] Pagamento parcelado (Dinheiro + M-Pesa) -> Liquidado
[ ] Pagar acima do devido -> 400
[ ] Comissao gerada so na liquidacao total
[ ] Anulacao exige motivo e gera auditoria
[ ] Caixa: abrir, entrada, saida, levantamento, saldo, fecho e diferenca
[ ] Despesa com caixa_sessao_id gera movimento Saida
[ ] Fidelizacao: ambos os sexos, servico elegivel <=200 MT, 1 marca/dia, 5 -> 1 gratis, sem marca no ciclo seguinte
[ ] Salario: Preparado -> Aprovado -> Pago; comissoes passam a Paga
[ ] Relatorios devolvem arrays/objetos conforme a tabela
[ ] Relatorio financeiro inclui resumo, comparacao, receitas, despesas e fluxo
[ ] Dashboard devolve resumo, indicadores, serie, tops e recentes
[ ] Stock: entrada, saida, ajuste e saldo por produto (com estoque:escrever concedido)
[ ] Catalogo publico funciona sem cookie e nao expoe campos internos
[ ] Auditoria append-only: UPDATE/DELETE falham na base de dados
[ ] Conta inativa nao faz login (403)
[ ] Senha temporaria: flag deve_alterar_senha e devolvido
```

---

## 7. Limpeza após os testes

Os testes criam dados. A forma mais simples de voltar ao estado limpo é `npm run db:reset`
(apaga e recria a base com o seed). Se preferires limpar só os dados de teste, apaga
primeiro as tabelas dependentes (e desativa temporariamente o trigger da auditoria, porque
é append-only):

```sql
begin;
alter table log_auditoria disable trigger log_auditoria_append_only;
delete from log_auditoria;
alter table log_auditoria enable trigger log_auditoria_append_only;

delete from movimento_fidelizacao;
delete from cartao_fidelizacao;
delete from comissao;
delete from pagamento_parcela;
delete from pagamento;
delete from desconto_atendimento;
delete from atendimento_servico;
delete from atendimento;
delete from horario_funcionario;
delete from assiduidade;
delete from deducao_salarial;
delete from processamento_salarial;
delete from movimento_estoque;
delete from item_produto;
delete from despesa;
delete from movimento_caixa;
delete from caixa_sessao;
delete from funcionario;
delete from servico;
delete from categoria_salao;
delete from cliente;
delete from usuario where id_perfil <> 1;
commit;
```

> As sequências de `identity` **não** são reiniciadas. Os `id` continuam a crescer entre
> execuções; nos testes não assumas que o primeiro registo terá `id = 1` — captura os ids
> das respostas (como nos exemplos com `jq`).

---

## 8. Referências

- [`api.md`](./api.md) — contrato resumido de todos os endpoints.
- [`base-de-dados.md`](./base-de-dados.md) — tabelas, chaves e regras na base de dados.
- [`implementacao-backend.md`](./implementacao-backend.md) — fases, permissões e estado.
- [`documentacao.md`](./documentacao.md) — requisitos RF01–RF25 e regras de negócio.
- [`estado-e-pendencias.md`](./estado-e-pendencias.md) — o que falta e decisões em aberto.
