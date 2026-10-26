# Arquitectura

[← Voltar ao índice](./README.md)

## Visão geral

```
┌──────────────────────────────┐        HTTP (JSON)        ┌──────────────────────────────┐
│  Frontend (React SPA/PWA)    │  ───────────────────────▶ │  Backend (Express)           │
│  Vite · porta 5173           │  ◀─────────────────────── │  porta 5000 (PORT)           │
│  Cookie httpOnly: token      │        CORS + cookies     │  JWT · bcrypt · RBAC        │
└──────────────────────────────┘                           └───────────────┬──────────────┘
                                                                           │ Drizzle ORM (pool pg)
                                                                           ▼
                                                               ┌──────────────────────────┐
                                                               │  PostgreSQL              │
                                                               │  base: SalaoFaces        │
                                                               │  (local ou Neon)         │
                                                               └──────────────────────────┘
```

- O **frontend** guarda a sessão num **cookie `httpOnly`** (não acede ao token por JavaScript).
- O **backend** valida o token em cada pedido e carrega o utilizador, o perfil e as
  **permissões efetivas** para `req.user`.
- A **base de dados** é acessada através do **Drizzle ORM**, que reutiliza um `Pool` de
  conexões `pg` partilhado (`src/db/client.js`).
- O frontend é instalável como **PWA**: o `vite-plugin-pwa` gera o manifest e o service
  worker, e `PWAUpdatePrompt` avisa quando há uma nova versão.

## Estrutura de pastas

```
Faces-System/
├── Backend/
│   ├── Database/
│   │   └── schema/            # scripts SQL legados (referência histórica)
│   ├── drizzle/               # migrações Drizzle + seed SQL
│   ├── drizzle.config.js      # configuração do drizzle-kit
│   ├── src/
│   │   ├── config/            # pool pg e configuração SSL
│   │   ├── controller/        # lógica de cada recurso (request → resposta)
│   │   ├── db/                # schema Drizzle, cliente e bootstrap/migrações
│   │   ├── middlewares/       # authenticate / authorize / authorizePermission
│   │   ├── repository/        # acesso à base de dados (Drizzle)
│   │   ├── routes/            # definição de rotas Express
│   │   ├── services/          # regras de negócio e transações
│   │   ├── utils/             # token JWT, validações e erros
│   │   ├── app.js             # montagem da app Express
│   │   └── server.js          # arranque do servidor (bootstrap da BD)
│   ├── .env.example           # modelo das variáveis de ambiente
│   └── package.json
├── Frontend/
│   ├── public/                # ícones PWA e favicon
│   ├── src/
│   │   ├── assets/            # imagens (logo)
│   │   ├── components/        # componentes reutilizáveis
│   │   ├── pages/             # uma pasta por página/rota
│   │   ├── routes/            # definição de rotas e guardas de acesso
│   │   ├── services/          # cliente Axios e funções da API
│   │   ├── store/             # estado global Zustand (auth e tema)
│   │   ├── Styles/            # CSS global e variáveis
│   │   ├── utils/             # validações do frontend
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js         # React + PWA
│   ├── vercel.json            # rewrite SPA
│   └── package.json
├── docs/                      # esta documentação
└── package.json               # dependências de topo (partilhadas)
```

## Camadas do backend

O backend segue uma separação por responsabilidades. O fluxo de um pedido é:

```
Rota (routes) → Controlador (controller) → Serviço (services) → Repositório (repository) → Drizzle → PostgreSQL
```

1. **`routes/`** — associa método + caminho a uma função do controlador e aplica
   `authenticate` / `authorize` / `authorizePermission`.
2. **`controller/`** — valida os dados de entrada, chama o serviço/repositório e define o
   código HTTP e o corpo da resposta. Traduz erros específicos do PostgreSQL
   (ex.: violação de chave estrangeira, código `23503`).
3. **`services/`** — concentra as regras de negócio e transações dos módulos complexos:
   atendimentos, pagamentos, caixa, despesas, fidelização, salários, stock e auditoria.
   Os CRUD simples continuam `controller → repository`.
4. **`repository/`** — usa o query builder do Drizzle (`db.select`, `db.insert`,
   `db.update`, `db.delete`); não conhece HTTP. Devolve linhas da base de dados ou `null`.
5. **`db/schema/`** — definição declarativa das **37 tabelas**, colunas, FKs, checks e
   índices; é a fonte de verdade do esquema.
6. **`db/client.js`** — exporta a instância `db` do Drizzle sobre o `Pool` do `pg`
   configurado a partir do `.env`.
7. **`db/bootstrap.js`** — no arranque, cria a base se não existir, verifica se há
   migrações pendentes e aplica-as antes de o servidor aceitar pedidos.

> Nem todos os recursos têm controlador/repositório: **autenticação** está implementada
> directamente em `routes/auth.js`, e o **stock** tem rotas + serviço + repositório, mas
> ainda não tem controlador próprio.

### Excepções e convenções

- Erros de base de dados como `23503` (foreign key) são traduzidos em respostas
  `400`/`409` legíveis no controlador ou no handler global.
- O `UPDATE` parcial é feito construindo o objecto `set` apenas com os campos
  enviados (campos `null`/`undefined` mantêm o valor actual, salvo quando o contrato
  permite limpar explicitamente).
- As transações usam `db.transaction(async (tx) => { ... })` e passam o `tx` aos
  repositórios que participam na mesma operação.
- O handler global de erros em `app.js` traduz códigos PostgreSQL (`22P02`, `23502`,
  `23503`, `23505`, `23514`) e devolve JSON (sem stack trace), incluindo um `404` JSON
  para rotas inexistentes.
- A autorização fina usa permissões `modulo:acao` (ex.: `clientes:escrever`), não apenas
  o nome do perfil. Ver [autenticacao-permissoes.md](./autenticacao-permissoes.md).

## Mapa dos módulos do backend

| Domínio | Rotas/serviços |
| --- | --- |
| Autenticação | `routes/auth.js` |
| Contas, perfis e permissões | `routes/usuario.js`, `routes/perfil.js` |
| Catálogo | `routes/categoria.js`, `routes/servico.js` (serviços, modalidades e aplicações) |
| Clientes | `routes/cliente.js` |
| Atendimentos, descontos e fidelização | `routes/atendimento.js`, `routes/fidelizacao.js`, `services/atendimento.js`, `services/fidelizacao.js` |
| Pagamentos e comissões | `routes/pagamento.js`, `routes/comissao.js`, `services/pagamento.js` |
| Caixa | `routes/caixa.js`, `services/caixa.js` |
| Despesas e stock | `routes/despesa.js`, `routes/movimento_estoque.js`, `services/despesa.js`, `services/movimento_estoque.js` |
| RH | `routes/funcionario.js`, `routes/horario.js`, `routes/assiduidade.js`, `routes/salario.js` |
| Relatórios e dashboard | `routes/relatorio.js`, `routes/dashboard.js`, `repository/relatorio.js`, `repository/dashboard.js` |
| Catálogo público e auditoria | `routes/publico.js`, `routes/auditoria.js`, `services/auditoria.js` |

## Padrões do frontend

- **Componentes de apresentação** em `components/`: Input, Button, Search, Header, Sidebar,
  Logo, Title, Card, DataGrid, ConfirmDialog, FidelizacaoCard, modais, ThemeToggle e
  PWAUpdatePrompt.
- **Páginas** em `pages/`, uma pasta por módulo, com o respectivo CSS ao lado. Cada página
  compõe a sua própria shell (`SideBar` + `Headers` + conteúdo); não existe um componente
  `Layout` global.
- **Rotas protegidas** em `routes/RequireAuth.jsx` (`RequireAuth`, `RequirePermission`,
  `RequireRole`, `RequireSession`, `RedirectIfAuth`).
- **Estado da sessão** centralizado no Zustand (`store/authStore.js`); o tema fica em
  `store/themeStore.js`.
- **Comunicação com a API** isolada em `services/api.js` (instância Axios + helpers de erro).
- **URL da API** definida por `VITE_API_URL` (ou `http://localhost:5000` em desenvolvimento).

Detalhes em [frontend.md](./frontend.md).
