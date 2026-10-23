# Frontend

[← Voltar ao índice](./README.md)

Aplicação **React 19 + Vite**, com React Router 7, Zustand e Axios.

## Arranque

`Frontend/src/main.jsx`:

- Monta `<App/>` dentro de `<BrowserRouter>` e `<StrictMode>`.
- Importa os CSS globais (`Styles/global.css`, `Styles/variables.css`).
- Regista as fontes `Inter`, `Manrope` e `Poppins`.

`Frontend/src/App.jsx` renderiza apenas `<AppRoutes/>`.

## Rotas

Definidas em `Frontend/src/routes/AppRoutes.jsx`:

| Caminho | Página | Protecção |
| --- | --- | --- |
| `/` | `DashBoard` | `RequireAuth` |
| `/login` | `Home` (login) | `RedirectIfAuth` |
| `/register` | `SignUp` | `RedirectIfAuth` |
| `/forgotpass` | `ForgotPassword` | pública |
| `/clientes` | `Clientes` | `RequirePermission` (`clientes:ler`/`clientes:escrever`) |
| `/novoAtendimento` | `NovoAtendimento` | `RequirePermission` (`atendimentos:escrever`) |
| `/servicos` | `Servicos` | `RequirePermission` (`servicos:ler`/`servicos:escrever`) |
| `/categorias` | `Categorias` | `RequirePermission` (`servicos:escrever`) |
| `/relatorio` | `Relatorio` | `RequirePermission` (`relatorios:ler`) |
| `/despesas` | `Despesas` | `RequirePermission` (`despesas:escrever`) |
| `/funcionarios` | `Funcionarios` | `RequirePermission` (`funcionarios:ler`/`funcionarios:escrever`) |
| `/gestao-utilizadores` | `GestaoUtilizadores` | `RequirePermission` (`contas:gerir`) |
| `/permissoes` | `Permissoes` | `RequirePermission` (`contas:gerir`) |
| `/logs` | `Logs` | `RequirePermission` (`auditoria:ler`) |
| `*` | `NotFound` (`<h1>Not Found</h1>`) | pública |

## Estado global (Zustand)

`Frontend/src/store/authStore.js` mantém:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `user` | object \| null | Utilizador autenticado |
| `loading` | boolean | Pedido em curso |
| `initialized` | boolean | Se a sessão já foi verificada |
| `error` | string \| null | Mensagem de erro do backend |
| `errorField` | string \| null | Campo associado ao erro |
| `sucesso` | string \| null | Mensagem de sucesso |

Acções: `checkAuth`, `login`, `register`, `logout`, `clearError`, `clearSucesso`.

> O `register` **não** autentica; após sucesso o utilizador é levado ao `/login`.

## Camada de API

`Frontend/src/services/api.js`:

- Cria uma instância Axios com `baseURL` fixo e `withCredentials: true`.
- Helpers: `getApiError(err)` e `getApiErrorField(err)`.
- Funções: `loginUser`, `registerUser`, `getMe`, `logoutUser`, `getUsers`.

> 🔧 O `BASE_API` está actualmente `http://192.168.0.14:5000/` (endereço de rede local).
> Ajuste conforme o ambiente (ver [instalacao.md](./instalacao.md)).

## Componentes

| Componente | Ficheiro | Descrição |
| --- | --- | --- |
| `Sidebar` | `components/sidebar/siderbar.jsx` | Menu lateral com grupos e filtragem por perfil |
| `Headers` | `components/headers/header.jsx` | Cabeçalho com título, menu mobile, sino e utilizador |
| `Layout` | `components/Layout/Layout.jsx` | Envolve `Sidebar` + `Headers` + conteúdo |
| `Logo` | `components/Logo/logo.jsx` | Logótipo |
| `Input` | `components/forms/input/input.jsx` | Campo de formulário com label, ícone e erro |
| `Button` | `components/forms/button/button.jsx` | Botão |
| `Search` | `components/forms/search/search.jsx` | Campo de pesquisa |
| `Title` | `components/title/title.jsx` | Título reutilizável |

### Sidebar — grupos e perfis

Os itens são agrupados em `GRUPOS`; cada item tem `perfis`/`permissao` e é mostrado
apenas quando o utilizador tem acesso ao módulo:

- **Operação:** Dashboard, Novo Atendimento, Clientes, Serviços, Categorias
- **Financeiro:** Relatório, Despesas
- **Administração:** Funcionários, Gestão de Utilizadores, Permissões, Logs

Grupos sem itens visíveis são escondidos automaticamente.

## Páginas

| Página | Caminho | Estado |
| --- | --- | --- |
| `home` (login) | `pages/home.jsx` | ✅ Ligada ao `authStore` (nome de utilizador + senha) |
| `SignUp` (registo) | `pages/auth/Resgister/SignUp.jsx` | ✅ Ligada ao `authStore` |
| `ForgotPassword` | `pages/auth/ForgotPassword/forgotPass.jsx` | ✅ Recuperação por código SMS ao telefone |
| `dashboard` | `pages/dashboard/dashboard.jsx` | ✅ Dados reais via `/api/dashboard` |
| `novoAtendimento` | `pages/novoAtendimento/novoAtendimento.jsx` | ✅ Lista, detalhe, pagamentos e fidelizacao |
| `categorias` | `pages/categorias/categorias.jsx` | ✅ CRUD de categorias |
| `logs` | `pages/logs/logs.jsx` | ✅ Consulta de auditoria |
| `funcionarios` | `pages/funcionarios/funcionarios.jsx` | ✅ CRUD sem documento/conta de utilizador |
| `GestaoUtilizadores` | `pages/admin/GestaoUtilizadores.jsx` | ✅ `GET /api/usuarios` |
| `Permissoes` | `pages/admin/Permissoes.jsx` | ✅ Matriz por perfil |
| `clientes`, `despesas`, `relatorio`, `servicos` | respectivas pastas | ✅ Ligados à API |

## Validações no cliente

`Frontend/src/utils/validacoes.js` **espelha** `Backend/src/utils/validacoes.js`
(`validarNome`, `validarTelefone`, `validarSenha`, `validarCodigo`, `limparTelefone`) e
acrescenta `validarConfirmacao`, `validarRegisto` e `validarLogin`.

Ver [validacoes.md](./validacoes.md).

## Estilos

- `Styles/global.css` e `Styles/variables.css` — base e variáveis (cores, espaçamentos).
- Cada componente/página tem o seu próprio `.css` ao lado do `.jsx`.
- As fontes do texto são definidas em `main.jsx` via `@fontsource`.

## Padrão de tabelas (AG Grid)

As páginas `NovoAtendimento` e `Funcionarios` usam AG Grid (`AllCommunityModule`):

```jsx
<AgGridProvider modules={modules}>
  <div className="ag-theme-quartz new-table">
    <AgGridReact rowData={rowData} columnDefs={columnDefs} pagination ... />
  </div>
</AgGridProvider>
```
