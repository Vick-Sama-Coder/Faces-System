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

## Funcionários — `/api`

- `GET /api/funcionarios` 🔒 — lista (ordenada por nome). `200` → `[{ id, nome, salario, comissao }]`
- `POST /api/funcionario` 🔒👑 — cria. Corpo: `{ nome, salario, comissao }`. `201` → objecto criado
- `PUT /api/funcionario/:id` 🔒👑 — actualiza (parcial). `200` → objecto actualizado
- `DELETE /api/funcionario/:id` 🔒👑 — remove. `204`

> O corpo enviado/retornado usa os nomes `nome`, `salario`, `comissao`.

## Serviços — `/api`

- `GET /api/servicos` 🔒 — lista com o nome da categoria:
  `[{ id, nome, valor, categoria_id, categoria_nome }]`
- `GET /api/servicos/:id` 🔒 — um serviço (`200`) ou `404`
- `POST /api/servicos` 🔒👑 — corpo: `{ nome, valor, categoria_id }`. `201`
  - `400` se faltar campo; `400` `{ "message": "Categoria nao encontrada" }` se FK inválida
- `PUT /api/servicos/:id` 🔒👑 — actualização parcial. `200` / `404` / `400`
- `DELETE /api/servicos/:id` 🔒👑 — `204` / `404`
  - `409` se existirem atendimentos que usam o serviço

## Categorias de serviço — `/api`

- `GET /api/categorias` 🔒 — `[{ id, nome }]`
- `GET /api/categorias/:id` 🔒 — `200` / `404`
- `POST /api/categorias` 🔒👑 — corpo: `{ nome }`. `201`
- `PUT /api/categorias/:id` 🔒👑 — corpo: `{ nome }`. `200` / `404`
- `DELETE /api/categorias/:id` 🔒👑 — `204` / `404`
  - `409` se existirem serviços nesta categoria

Legenda: 🔒 requer sessão · 👑 só `Administrador`.

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
