# Arquitetura

[← Voltar ao índice](./README.md)

## Visão geral

```
┌────────────────────────┐        HTTP (JSON)        ┌────────────────────────┐
│  Frontend (React SPA)  │  ───────────────────────▶ │  Backend (Express)     │
│  Vite · porta 5173     │  ◀─────────────────────── │  porta 5000/5001       │
│  Cookie httpOnly: token│        CORS + cookies     │  JWT · bcrypt          │
└────────────────────────┘                           └───────────┬────────────┘
                                                                 │ Drizzle ORM (pool pg)
                                                                 ▼
                                                     ┌────────────────────────┐
                                                     │  PostgreSQL            │
                                                     │  base: SalaoFaces      │
                                                     └────────────────────────┘
```

- O **frontend** guarda a sessão num **cookie `httpOnly`** (não acede ao token por JavaScript).
- O **backend** valida o token em cada pedido autenticado e carrega o utilizador + perfil.
- A **base de dados** é acessada através do **Drizzle ORM**, que reutiliza um `Pool` de
  conexões `pg` partilhado (`src/db/client.js`).

## Estrutura de pastas

```
Faces-System/
├── Backend/
│   ├── Database/
│   │   └── schema/            # scripts SQL legados (referência histórica)
│   ├── drizzle/               # migrações geradas + seed SQL
│   ├── drizzle.config.js      # configuração do drizzle-kit
│   ├── src/
│   │   ├── config/            # ligação à base de dados (pool pg)
│   │   ├── controller/        # lógica de cada recurso (request → resposta)
│   │   ├── db/                # schema Drizzle, cliente e bootstrap
│   │   ├── middlewares/       # authenticate / authorize
│   │   ├── repository/        # acesso à base de dados (Drizzle)
│   │   ├── routes/            # definição de rotas Express
│   │   ├── utils/             # token JWT e validações
│   │   ├── app.js             # montagem da app Express
│   │   └── server.js          # arranque do servidor (bootstrap da BD)
│   ├── .env.example           # modelo das variáveis de ambiente
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── assets/            # imagens (logo)
│   │   ├── components/        # componentes reutilizáveis (forms, sidebar, header…)
│   │   ├── pages/             # uma pasta por página/rota
│   │   ├── routes/            # definição de rotas e guardas de acesso
│   │   ├── services/          # cliente Axios e funções da API
│   │   ├── store/             # estado global Zustand
│   │   ├── Styles/            # CSS global e variáveis
│   │   ├── utils/             # validações do frontend
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── docs/                      # esta documentação
└── package.json               # dependências de topo (partilhadas)
```

## Camadas do backend

O backend segue uma separação por responsabilidades. O fluxo de um pedido é:

```
Rota (routes) → Controlador (controller) → Repositório (repository) → Drizzle → PostgreSQL
```

1. **`routes/`** — associa método + caminho a uma função do controlador e aplica
   `authenticate`/`authorize` quando necessário.
2. **`controller/`** — valida os dados de entrada, chama o repositório e define o
   código HTTP e o corpo da resposta. Trata erros específicos do PostgreSQL
   (ex.: violação de chave estrangeira, código `23503`).
3. **`repository/`** — usa o query builder do Drizzle (`db.select`, `db.insert`,
   `db.update`, `db.delete`); não conhece HTTP. Devolve linhas da base de dados ou `null`.
4. **`db/schema/`** — definição declarativa das 33 tabelas, colunas, FKs, checks e
   índices; é a fonte de verdade do esquema.
5. **`db/client.js`** — exporta a instância `db` do Drizzle sobre o `Pool` do `pg`
   configurado a partir do `.env`.
6. **`db/bootstrap.js`** — no arranque, cria a base se não existir, verifica se há
   migrações pendentes e aplica-as antes de o servidor aceitar pedidos.

> Nem todos os recursos têm controlador/repositório: **autenticação** e **utilizadores**
> estão implementados directamente em `routes/auth.js`.

### Excepções e convenções

- Erros de base de dados como `23503` (foreign key) são traduzidos em respostas
  `400`/`409` legíveis no controlador.
- O `UPDATE` parcial é feito construindo o objecto `set` apenas com os campos
  enviados (campos `null`/`undefined` mantêm o valor actual).
- As transações usam `db.transaction(async (tx) => { ... })` e passam o `tx` aos
  repositórios que participam na mesma operação.
- O handler global de erros em `app.js` devolve JSON (sem stack trace) e um `404`
  JSON para rotas inexistentes.

## Padrões do frontend

- **Componentes de apresentação** em `components/` (Input, Button, Search, Header, Sidebar, Logo).
- **Páginas** em `pages/`, uma pasta por módulo, com o respectivo CSS ao lado.
- **Rotas protegidas** em `routes/RequireAuth.jsx` (`RequireAuth`, `RequireRole`, `RedirectIfAuth`).
- **Estado da sessão** centralizado no Zustand (`store/authStore.js`).
- **Comunicação com a API** isolada em `services/api.js` (instância Axios + helpers de erro).

Detalhes em [frontend.md](./frontend.md).
