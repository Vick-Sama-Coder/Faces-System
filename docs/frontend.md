# Frontend

[← Voltar ao índice](./README.md)

Aplicação **React 19 + Vite**, com React Router 7, Zustand e Axios.

## Arranque

`Frontend/src/main.jsx`:

- Monta `<App/>` dentro de `<BrowserRouter>` e `<StrictMode>`.
- Importa os CSS globais (`Styles/global.css`, `Styles/variables.css`).
- Regista as fontes `Inter`, `Manrope` e `Poppins`.

`Frontend/src/App.jsx`:

- Verifica a sessão uma única vez no arranque (`authStore.checkAuth`).
- Renderiza `<AppRoutes/>`, o aviso de actualização da PWA (`PWAUpdatePrompt`) e o
  `ThemeToggle` flutuante nas rotas de autenticação.
- Reage a mudanças do tema do sistema quando a preferência é “Sistema”.

## Rotas

Definidas em `Frontend/src/routes/AppRoutes.jsx`:

| Caminho | Página | Protecção |
| --- | --- | --- |
| `/` | `DashBoard` | `RequireAuth` |
| `/perfil` | `Perfil` | `RequireAuth` |
| `/login` | `Home` (login) | `RedirectIfAuth` |
| `/register` | `SignUp` | `RedirectIfAuth` |
| `/primeiro-acesso` | `FirstAccess` | `RequireSession` (senha padrão por trocar) |
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
| `/horarios` | `HorarioPage` | `RequirePermission` (`assiduidade:gerir`) |
| `*` | `<h1>Not Found</h1>` (inline, sem componente) | pública |

`RequireAuth` exige sessão iniciada; `RequireSession` exige sessão mas permite a conta em
primeiro acesso; `RequirePermission` exige sessão **e** pelo menos uma das permissões
indicadas; `RedirectIfAuth` impede o login/registo de quem já tem sessão.

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

Acções: `checkAuth`, `login`, `register`, `definirSenhaPrimeiroAcesso`, `logout`,
`updateUser`, `clearError`, `clearSucesso`.

> O `register` **não** autentica; devolve `{ ok, data }` (com `senha_padrao`) e leva o
> utilizador ao `/login`. O `definirSenhaPrimeiroAcesso` só funciona com sessão iniciada e
> `alteracao_obrigatoria_senha = true`.

O tema (claro/escuro/sistema) é gerido à parte em `Frontend/src/store/themeStore.js` e
persistido localmente.

## Camada de API

`Frontend/src/services/api.js`:

- Cria uma instância Axios com `withCredentials: true`.
- `BASE_API` = `VITE_API_URL`; se não existir, usa `http://localhost:5000` em
  desenvolvimento e a mesma origem em produção.
- Helpers: `getApiError(err)` e `getApiErrorField(err)`.
- Funções agrupadas por módulo: autenticação/perfil, categorias, serviços (incluindo
  modalidades e aplicações), funcionários, clientes, atendimentos (pagamentos, descontos,
  anulação), fidelização, utilizadores/perfis/permissões, dashboard, relatórios (incluindo
  o financeiro), despesas, stock, auditoria, horários, assiduidade e salários.

> O backend só aceita CORS da origem definida em `CLIENT_URL`. Se o frontend correr noutra
> porta/domínio, ajuste `CLIENT_URL` e/ou `VITE_API_URL` (ver
> [instalacao.md](./instalacao.md)).

## Componentes

| Componente | Ficheiro | Descrição |
| --- | --- | --- |
| `Sidebar` | `components/sidebar/siderbar.jsx` | Menu lateral com grupos e filtragem por perfil |
| `Headers` | `components/headers/header.jsx` | Cabeçalho com título, menu mobile, sino e utilizador |
| `Card` | `components/card/` | Cartão de conteúdo/indicador |
| `Logo` | `components/Logo/logo.jsx` | Logótipo |
| `DataGrid` | `components/DataGrid/DataGrid.jsx` | Tabela reutilizável (AG Grid) |
| `ConfirmDialog` | `components/ConfirmDialog/ConfirmDialog.jsx` | Diálogo de confirmação |
| `FidelizacaoCard` | `components/FidelizacaoCard/FidelizacaoCard.jsx` | Cartão de fidelização (marcas/benefício) |
| `Modals/*` | `components/Modals/` | Modais de atendimento, cliente, serviço e fidelização |
| `ThemeToggle` | `components/ThemeToggle/ThemeToggle.jsx` | Alternância tema claro/escuro |
| `PWAUpdatePrompt` | `components/PWAUpdatePrompt/` | Aviso de nova versão da PWA |
| `Input` | `components/forms/input/input.jsx` | Campo de formulário com label, ícone e erro |
| `Button` | `components/forms/button/button.jsx` | Botão |
| `Search` | `components/forms/search/search.jsx` | Campo de pesquisa |
| `Title` | `components/title/title.jsx` | Título reutilizável |

### Sidebar — grupos e perfis

> Não existe um componente `Layout` global: cada página compõe a sua própria shell com
> `SideBar` + `Headers` + conteúdo.

Os itens são agrupados em `GRUPOS`; `perfis` define quem vê cada item (`[]` = todos).
Actualmente **todos os itens têm `perfis: []`**, pelo que a sidebar é igual para qualquer
utilizador autenticado. O controlo real é feito pelas guardas de rota e pelo backend.
Grupos sem itens visíveis são escondidos automaticamente.

## Páginas

| Página | Caminho | Estado |
| --- | --- | --- |
| `home` (login) | `pages/home.jsx` | ✅ Ligada ao `authStore` (nome de utilizador + senha) |
| `SignUp` (registo) | `pages/auth/Resgister/SignUp.jsx` | ✅ Nome + telefone; senha padrão `12345` |
| `FirstAccess` | `pages/auth/FirstAccess/FirstAccess.jsx` | ✅ Define a nova senha obrigatória no primeiro acesso |
| `dashboard` | `pages/dashboard/dashboard.jsx` | ✅ Dados reais via `/api/dashboard` |
| `novoAtendimento` | `pages/novoAtendimento/novoAtendimento.jsx` | ✅ Lista, detalhe, pagamentos e fidelizacao |
| `categorias` | `pages/categorias/categorias.jsx` | ✅ CRUD de categorias |
| `logs` | `pages/logs/logs.jsx` | ✅ Consulta de auditoria |
| `funcionarios` | `pages/funcionarios/funcionarios.jsx` | ✅ CRUD sem documento/conta de utilizador |
| `GestaoUtilizadores` | `pages/admin/GestaoUtilizadores.jsx` | ✅ Criação/edição/estado de contas e permissões individuais |
| `Permissoes` | `pages/admin/Permissoes.jsx` | ✅ Matriz de permissões por perfil |
| `Perfil` | `pages/perfil/Perfil.jsx` | ✅ Actualiza nome/telefone e altera a senha |
| `HorarioPage` | `pages/horario/HorarioPage.jsx` | ✅ Controlo mensal de assiduidade |
| `clientes` | `pages/clientes/clientes.jsx` | ✅ CRUD, estado, pesquisa e cartão |
| `servicos` | `pages/servicos/servicos.jsx` | ✅ CRUD, estado, modalidades e fidelização |
| `despesas` | `pages/despesas/despesas.jsx` | 🟡 Despesas completas; painel de stock sem produtos |
| `relatorio` | `pages/relatorio/relatorio.jsx` | ✅ Todos os relatórios, CSV e impressão |

## Validações no cliente

`Frontend/src/utils/validacoes.js` **espelha** `Backend/src/utils/validacoes.js`
(`validarNome`, `validarTelefone`, `validarSenha`, `validarSexo`, `limparTelefone`,
constantes de fidelização e helpers de horários) e acrescenta validações compostas
(`validarConfirmacao`, `validarRegisto`, `validarLogin`, `validarCliente`,
`validarAtendimento`, `validarUtilizador`).

Ver [validacoes.md](./validacoes.md).

## Estilos e tema

- `Styles/global.css` e `Styles/variables.css` — base e variáveis (cores, espaçamentos).
- Cada componente/página tem o seu próprio `.css` ao lado do `.jsx`.
- As fontes do texto são definidas em `main.jsx` via `@fontsource`.
- O tema claro/escuro é aplicado por `data-theme` no elemento raiz, com `ThemeToggle` no
  cabeçalho; as variáveis de cor ficam em `variables.css`.

## PWA

- Configurada em `Frontend/vite.config.js` com `vite-plugin-pwa` e Workbox.
- Permite instalar a aplicação e actualizar assets em cache; `PWAUpdatePrompt` avisa
  quando há uma nova versão.
- **Não** implementa operação off-line nem sincronização de dados (RF25).

## Padrão de tabelas (AG Grid)

As listagens usam o componente reutilizável `DataGrid` (AG Grid,
`AllCommunityModule`), por exemplo:

```jsx
<DataGrid
  rowData={rowData}
  columnDefs={columnDefs}
  pagination
  ...
/>
```
