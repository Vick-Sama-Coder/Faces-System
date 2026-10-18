# Autenticação e Permissões

[← Voltar ao índice](./README.md)

## Como funciona a sessão

1. O utilizador faz `POST /api/auth/login` com **nome de utilizador** e **senha**.
   O `nome` é único (comparação case-insensitive) e serve de identificador de acesso.

> **Recuperação de senha:** em caso de esquecimento, `POST /api/auth/recuperar-senha`
> gera um código de 6 dígitos válido por 10 minutos e envia-o por SMS ao **telefone**
> registado; `POST /api/auth/redefinir-senha` valida o código (uso único, máx. 5
> tentativas) e define a nova senha.
2. O backend confirma a senha com `bcrypt.compare` e gera um **JWT** que contém apenas o `id`:
   ```js
   jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
   ```
3. O token é enviado num cookie **`httpOnly`**:

   | Opção do cookie | Valor |
   | --- | --- |
   | `httpOnly` | `true` (JavaScript não consegue ler) |
   | `secure` | `true` apenas se `NODE_ENV === 'production'` |
   | `sameSite` | `'lax'` |
   | `maxAge` | 10 dias |

4. Em cada pedido, o middleware `authenticate` lê `req.cookies.token`, verifica o JWT e
   carrega o utilizador + perfil da base de dados para `req.user`:

   ```sql
   select u.id, u.nome, u.telefone, u.id_perfil, p.nome as perfil
   from usuario u join perfil p on p.id = u.id_perfil
   where u.id = $1
   ```

5. No arranque, o frontend chama `GET /api/auth/me` para saber se há sessão
   (`authStore.checkAuth`).

> ⚠️ O token expira em **30 dias**, mas o cookie em **10 dias** — na prática, a sessão
> do browser termina primeiro.

## Middlewares

Definidos em `Backend/src/middlewares/auth.js`.

### `authenticate`

- Sem cookie `token` → `401 { "message": "Nao autenticado: token em falta" }`
- Token inválido/expirado → `401 { "message": "Nao autenticado: token invalido ou expirado" }`
- Utilizador não encontrado → `401 { "message": "Nao autenticado: utilizador nao existe" }`
- Sucesso → define `req.user = { id, nome, telefone, id_perfil, perfil }` e chama `next()`

### `authorize(...perfis)`

Fábrica de middleware para restringir por perfil (nome vindo de `perfil.nome`):

```js
router.post('/servicos', authenticate, authorize('Administrador'), controller)
```

- Sem `req.user` → `401 { "message": "Nao autenticado" }`
- Perfil não incluído → `403 { "message": "Acesso negado: perfil sem autorizacao" }`

## Perfis

| `id_perfil` | Nome | Descrição |
| --- | --- | --- |
| `1` | `Administrador` | Acesso total, incluindo escrita e gestão de utilizadores |
| `2` | `Usuario` | Perfil atribuído automaticamente no registo |

## Matriz de permissões

| Recurso | Administrador | Usuario |
| --- | :---: | :---: |
| Dashboard | ✅ | ✅ |
| Novo Atendimento | ✅ | ✅ |
| Clientes | ✅ | ✅ |
| Serviços | ✅ | ✅ |
| Relatório | ✅ | ✅ |
| Despesas | ✅ | ✅ |
| Funcionários | ✅ | ❌ |
| Gestão de Utilizadores | ✅ | ❌ |
| Permissões | ✅ | ❌ |

### Escrita (criar/editar/apagar via API)

| Recurso | Administrador | Usuario |
| --- | :---: | :---: |
| Funcionários | ✅ | ❌ |
| Serviços | ✅ | ❌ |
| Categorias | ✅ | ❌ |
| Utilizadores (listagem) | ✅ | ❌ |

### Leitura (via API)

Funcionários, Serviços e Categorias podem ser **lidos** por qualquer utilizador
autenticado (`authenticate` sem `authorize`).

## Autorização no frontend

- `Frontend/src/routes/RequireAuth.jsx`:
  - `RequireAuth` — exige sessão; sem sessão redireciona para `/login`.
  - `RequireRole perfis={[...]}` — exige um dos perfis; caso contrário volta a `/`.
  - `RedirectIfAuth` — usado em `/login` e `/register`; se já autenticado redirige para `/`.
- A **sidebar** filtra automaticamente os itens pelo perfil do utilizador
  (`Frontend/src/components/sidebar/siderbar.jsx`).

> A autorização do frontend é apenas de conveniência de interface; a **fonte de verdade**
> é sempre o backend, que valida o token e o perfil em cada pedido.

## Notas de segurança

- As senhas são guardadas com **hash bcrypt** (custo `10`); nunca em texto simples.
- O mesmo telefone não pode ser registado duas vezes.
- Como o cookie é `httpOnly`, não há exposição do token a XSS via `localStorage`.
- Em produção (`NODE_ENV=production`) o cookie passa a `secure` (só HTTPS) e o handler de
  erros deixa de devolver detalhes internos.
