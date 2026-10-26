# Autenticação e Permissões

[← Voltar ao índice](./README.md)

## Como funciona a sessão

1. O utilizador faz `POST /api/auth/login` com **nome de utilizador** e **senha**.
   O `nome` é único (comparação case-insensitive) e serve de identificador de acesso.
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
   carrega o utilizador + perfil + **permissões efetivas** para `req.user`:

   ```js
   const [user] = await db.select({
       id: usuario.id,
       nome: usuario.nome,
       telefone: usuario.telefone,
       id_perfil: usuario.id_perfil,
       estado: usuario.estado,
       alteracao_obrigatoria_senha: usuario.alteracao_obrigatoria_senha,
       ultimo_acesso: usuario.ultimo_acesso,
       data_criacao: usuario.data_criacao,
       perfil: perfil.nome
   })
       .from(usuario)
       .innerJoin(perfil, eq(perfil.id, usuario.id_perfil))
       .where(eq(usuario.id, payload.id))
       .limit(1);

   const permissoes = await Permissao.codigosEfetivos(user.id, user.id_perfil);
   ```

   `req.user` fica com `{ id, nome, telefone, id_perfil, perfil, estado,
   alteracao_obrigatoria_senha, ultimo_acesso, data_criacao, permissoes }`.

5. No arranque, o frontend chama `GET /api/auth/me` para saber se há sessão
   (`authStore.checkAuth`).

> ⚠️ O token expira em **30 dias**, mas o cookie em **10 dias** — na prática, a sessão
> do browser termina primeiro.

## Registo e primeiro acesso

- `POST /api/auth/register` cria sempre uma conta com perfil `Usuario` e a **senha padrão
  `12345`** (devolvida em `senha_padrao`). **Não** inicia sessão.
- A conta fica com `alteracao_obrigatoria_senha = true`.
- No login, o backend devolve `deve_alterar_senha: true`; o frontend redireciona para
  `/primeiro-acesso`, onde `POST /api/auth/primeiro-acesso` guarda a nova senha e limpa o
  flag.
- O registo público **não** aceita `senha`; a definição da senha definitiva é feita no
  primeiro acesso.
- A recuperação de senha por telefone/SMS foi **removida**.

> ⚠️ **Limitação actual:** o bloqueio do primeiro acesso é feito apenas no frontend. O
> backend continua a aceitar chamadas autenticadas com uma conta que ainda tenha
> `alteracao_obrigatoria_senha = true` (exceto o próprio fluxo de primeiro acesso).
> Endurecer isto no servidor é uma pendência registada em
> [estado-e-pendencias.md](./estado-e-pendencias.md).

## Gestão da própria conta

- `GET /api/auth/me` — devolve o utilizador da sessão, incluindo `permissoes`.
- `PATCH /api/auth/me` — atualiza `nome` e/ou `telefone`; exige `senha_atual` e audita a
  alteração.
- `POST /api/auth/alterar-senha` — troca a senha (`senha_atual`, `senha_nova`).
- `POST /api/auth/logout` — limpa o cookie.

## Middlewares

Definidos em `Backend/src/middlewares/auth.js`.

### `authenticate`

- Sem cookie `token` → `401 { "message": "Nao autenticado: token em falta" }`
- Token inválido/expirado → `401 { "message": "Nao autenticado: token invalido ou expirado" }`
- Utilizador não encontrado → `401 { "message": "Nao autenticado: utilizador nao existe" }`
- Conta inativa → `403 { "message": "Conta inativa: contacte o administrador" }`
- Sucesso → define `req.user` (com `permissoes`) e chama `next()`

### `authorize(...perfis)`

Restringe por **nome do perfil** (usado em poucas rotas, ex.: fidelização manual e a rota
legada `/api/auth/users`):

```js
router.post('/clientes/:id/fidelizacao/marcas', authenticate, authorize('Administrador'), controller)
```

- Sem `req.user` → `401 { "message": "Nao autenticado" }`
- Perfil não incluído → `403 { "message": "Acesso negado: perfil sem autorizacao" }`

### `authorizePermission(...codigos)`

Autorização fina por **permissões**; basta possuir **uma** das indicadas:

```js
router.post('/clientes', authenticate, authorizePermission('clientes:escrever'), controller)
```

- Sem `req.user` → `401 { "message": "Nao autenticado" }`
- Nenhuma permissão → `403 { "message": "Acesso negado: permissao insuficiente" }`

## Perfis

| `id_perfil` | Nome | Descrição |
| --- | --- | --- |
| `1` | `Administrador` | Acesso total; recebe todas as permissões semeadas |
| `2` | `Usuario` | Operação diária (recepção/atendimento); perfil atribuído no registo |
| `4` | `Auditor` | Consulta de relatórios e auditoria |

> O perfil `3` (`Financeiro`) foi descontinuado. Perfis adicionais podem ser criados em
> `/api/perfis`, mas o registo público usa sempre o perfil `2`.

## Catálogo de permissões

O seed (`drizzle/0001_seed.sql`) cria 22 permissões:

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
| `fidelizacao:corrigir` | ✅ | — | — |
| `horarios:gerir` | ✅ | — | — |
| `assiduidade:gerir` | ✅ | — | — |
| `salarios:gerir` | ✅ | — | — |
| `salarios:aprovar` | ✅ | — | — |
| `relatorios:ler` | ✅ | — | ✅ |
| `contas:gerir` | ✅ | — | — |
| `auditoria:ler` | ✅ | — | ✅ |

> ⚠️ As rotas de stock exigem `estoque:escrever`, mas essa permissão ainda **não** está no
> seed. Enquanto não for adicionada, ninguém consegue escrever movimentos de stock (a
> leitura está aberta a qualquer utilizador autenticado).

### Leitura aberta a qualquer sessão

Várias listagens/consultas usam apenas `authenticate` (sem permissão específica):
dashboard, funcionários, serviços, categorias, clientes, atendimentos, pagamentos,
comissões por funcionário, despesas, categorias de despesa, fidelização, horários do
próprio funcionário, stock e catálogo. A escrita é que exige a permissão indicada em
[api.md](./api.md).

## Autorização no frontend

- `Frontend/src/routes/RequireAuth.jsx`:
  - `RequireAuth` — exige sessão; sem sessão redireciona para `/login`; se a conta ainda
    precisa de trocar a senha, redireciona para `/primeiro-acesso`.
  - `RequirePermission permissoes={[...]}` — exige pelo menos uma permissão efetiva;
    caso contrário volta a `/dashboard`.
  - `RequireRole perfis={[...]}` — mantido para compatibilidade, mas já não é usado nas
    rotas actuais.
  - `RequireSession` — exige apenas sessão (usado em `/primeiro-acesso`).
  - `RedirectIfAuth` — usado em `/login` e `/register`; se já autenticado, segue para
    `/dashboard` ou `/primeiro-acesso`.
- A **sidebar** tem grupos com a propriedade `perfis`; actualmente todos os itens têm
  `perfis: []`, pelo que são mostrados a qualquer utilizador autenticado. O controlo real
  de acesso é feito pelas guardas de rota e pelo backend.

> A autorização do frontend é apenas conveniência de interface; a **fonte de verdade** é
> sempre o backend, que valida o token, o estado da conta e as permissões em cada pedido.

## Notas de segurança

- As senhas são guardadas com **hash bcrypt** (custo `10`); nunca em texto simples.
- O mesmo telefone e o mesmo nome de utilizador não podem ser registados duas vezes.
- Como o cookie é `httpOnly`, não há exposição do token a XSS via `localStorage`.
- Em produção (`NODE_ENV=production`) o cookie passa a `secure` (só HTTPS) e o handler de
  erros deixa de devolver detalhes internos.
- Repor a credencial de uma conta (`POST /api/usuarios/:id/repor-senha`) coloca a senha
  padrão `12345` e volta a exigir a troca no próximo acesso.
- A auditoria registada inclui alterações de permissões, mas ainda não cobre todas as
  operações de contas (criação/edição/estado/reposição de senha).
