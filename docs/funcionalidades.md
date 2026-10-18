# Funcionalidades

[← Voltar ao índice](./README.md)

Descrição funcional de cada módulo, com o estado actual da implementação.

Legenda de estado: ✅ pronto · 🟡 parcial · 🚧 placeholder/mock

---

## Autenticação e conta de utilizador ✅

- **Registo** (`/register`): nome, telefone e senha (com confirmação). Cria sempre com perfil
  `Usuario` e não inicia sessão; redireciona para o login com mensagem de sucesso.
- **Login** (`/login`): nome de utilizador + senha. Em caso de sucesso, emite o cookie de sessão.
- **Sessão** (`/`): a app verifica `/api/auth/me` no arranque.
- **Logout**: disponível na sidebar e no cabeçalho; limpa o cookie.
- **Esqueci a senha** (`/forgotpass`): ✅ recuperação por código de 6 dígitos enviado
  por SMS ao telefone registado; o utilizador valida o código e define a nova senha.

## Dashboard (`/`) 🚧

Página inicial (índice) protegida por sessão. Apresenta cartões de indicadores
(Receita Total, Despesas Totais, Lucro Líquido, Serviços Realizados) e áreas reservadas
para gráficos (Faturamento, Serviços mais realizados, Profissionais em destaque,
Atendimentos recentes).

> Os valores são **fixos/mock**; ainda não vêm da API.

## Novo Atendimento (`/novoAtendimento`) 🚧

Tabela (AG Grid) de atendimentos com pesquisa e botão "Novo Atendimento".
Actualmente carrega **dados de exemplo**. Representa o registo de um atendimento
(cliente + serviço + valor + data) na futura tabela `atendimento`/`execucao_servico`.

## Clientes (`/clientes`) 🚧

Placeholder. Prevê CRUD sobre a tabela `cliente` (nome, apelido, telefone).

## Serviços (`/servicos`) 🚧

Placeholder no frontend. O **backend já expõe o CRUD completo** de serviços
(nome, valor, categoria). Falta ligar a interface à API.

## Relatório (`/relatorio`) 🚧

Placeholder. Destino dos gráficos (Recharts) e relatórios financeiros.

## Despesas (`/despesas`) 🚧

Placeholder. Prevê CRUD sobre `despesa` e `item_produto`.

## Funcionários (`/funcionarios`) 🟡

Acesso restrito a `Administrador`. Tabela (AG Grid) com dados **mock/incorrectos** na
componente. O **backend já expõe o CRUD completo** de funcionários (nome, salário,
comissão). Falta ligar a interface à API.

## Gestão de Utilizadores (`/gestao-utilizadores`) ✅

Acesso restrito a `Administrador`. Lista todos os utilizadores
(`GET /api/auth/users`) numa tabela com ID, nome, telefone e perfil.

## Permissões (`/permissoes`) ✅

Acesso restrito a `Administrador`. Mostra uma matriz estática de recursos × perfis
(Administrador/Usuario). É apenas informativa — a decisão real é do backend
(middleware `authorize`).

---

## Recursos de backend prontos (sem interface)

Os seguintes recursos têm API completa, mas ainda não estão ligados ao frontend:

### Categorias de serviço (`categoria_salao`)

- Listar, obter por id, criar, actualizar e apagar.
- Ex.: `Cabelo`, `Barba`, `Unhas`, `Estética`.

### Serviços (`servico`)

- Cada serviço pertence a uma categoria e tem um valor.
- A listagem inclui o nome da categoria (`categoria_nome`).

### Funcionários (`funcionario`)

- Nome, salário e comissão.

> Estes três recursos seguem o mesmo padrão arquitectural
> (`routes → controller → repository`) e podem servir de modelo para os próximos módulos.

## Fluxos-chave

### Entrar no sistema

```
/login → authStore.login() → POST /api/auth/login → cookie token
      → authStore.user preenchido → navega para "/" (Dashboard)
```

### Verificar sessão ao abrir a app

```
RequireAuth → authStore.checkAuth() → GET /api/auth/me
            → user presente: mostra página | ausente: redireciona /login
```

### Gerir um recurso administrativo (ex.: serviço)

```
Administrador → POST /api/servicos
   routes/servico.js (authenticate, authorize) → controller/servico.js
   → repository/servico.js (INSERT) → 201
```
