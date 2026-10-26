# Desenvolvimento

[← Voltar ao índice](./README.md)

## Convenções de código

- **Linguagem:** JavaScript (ES Modules). O backend tem `"type": "module"`; o frontend
  também usa `import`/`export`.
- **Idioma:** nomes de domínio, comentários e textos da interface em **Português**
  (ex.: `funcionario`, `servico`, `categoria_salao`).
- **Estilo:** indentação de 4 espaços no backend; o uso de ponto e vírgula não é
  uniforme. Mantenha o estilo do ficheiro que está a editar.
- **Erros:** em respostas de API, use sempre JSON com o campo `message` (e `field`
  quando aplicável).
- **Valores monetários:** inteiros em Meticais (sem casas decimais) em toda a API.

## Arquitectura do backend

```
routes → controller → service (opcional) → repository → Drizzle → PostgreSQL
```

- **`routes/`** — define o caminho, aplica `authenticate` e
  `authorizePermission('modulo:acao')` e liga ao controller.
- **`controller/`** — valida a entrada, traduz erros e define o código HTTP.
- **`services/`** — regras de negócio que atravessam várias tabelas ou precisam de
  transacção (atendimento, pagamento, caixa, despesa, fidelização, salário, stock,
  auditoria).
- **`repository/`** — acesso a dados com o query builder do Drizzle.

## Fluxo de trabalho (backend, padrão recomendado)

Ao criar um novo recurso CRUD:

1. **Schema** (`src/db/schema/<dominio>.js`) — tabela Drizzle com colunas, FKs, checks e
   índices. Reexportar em `src/db/schema/index.js` se for um ficheiro novo.
2. **Repository** (`src/repository/<recurso>.js`) — funções `findAll`, `findById`,
   `create`, `update`, `delete` com o query builder do Drizzle. Para agregações muito
   específicas (relatórios, `insert ... select`, `lateral`), usar o operador `sql` do
   Drizzle em vez de concatenar strings.
3. **Service** (`src/services/<recurso>.js`) — quando a operação envolve várias tabelas,
   transacção, caixa, comissões ou auditoria.
4. **Controller** (`src/controller/<recurso>.js`) — validação de entrada, chamadas ao
   repositório/serviço, códigos HTTP e tradução de erros do PostgreSQL.
5. **Routes** (`src/routes/<recurso>.js`) — ligação rota → controller, com
   `authenticate`/`authorizePermission`.
6. **Registo da rota** em `src/app.js`:
   ```js
   app.use("/api", recursoRoutes);
   ```

### Autorização

- Autenticação: `authenticate` valida o cookie `token` e preenche `req.user` com o perfil
  e as **permissões efectivas** (perfil + excepções individuais).
- Autorização fina: `authorizePermission('clientes:escrever')`. Basta possuir **uma** das
  permissões indicadas.
- `authorize('Administrador')` existe para compatibilidade, mas o padrão novo é usar
  permissões.
- Ao criar uma rota de escrita, acrescente a permissão correspondente ao catálogo seed em
  `drizzle/0001_seed.sql` e conceda-a aos perfis adequados.
- No frontend, proteja a rota com `RequirePermission permissoes={[...]}` e esconda a
  acção na interface quando o utilizador não tem a permissão.

### Boas práticas observadas

- Importar o `db` de `src/db/client.js` (nunca criar uma pool nova).
- Transações com `db.transaction(async (tx) => { ... })`; passar o `tx` aos repositórios
  que participam na mesma operação.
- `UPDATE` parcial: construir o objecto `set` apenas com os campos enviados
  (`!== undefined && !== null`), mantendo inalterados os restantes.
- Devolver `null` no repositório quando o registo não existe e traduzir em `404` no
  controller.
- Tratar `23503` (violação de chave estrangeira) com mensagens legíveis.
- Registar operações sensíveis com `AuditoriaService.registar({...})` (valores antes/depois
  e motivo quando aplicável). A tabela `log_auditoria` é **append-only**.
- Aplicar validações de domínio com os helpers de `src/utils/validacoes.js`.
- Garantir idempotência em efeitos de caixa/comissão/fidelização (por `referencia_id` ou
  `atendimento_servico_id`).

### Migrações

- O schema Drizzle é a fonte de verdade. Não editar migrações já aplicadas.
- Alterar o schema → `npm run db:generate` → revisar o SQL em `drizzle/` → `npm run db:migrate`.
- O arranque do backend aplica as migrações pendentes automaticamente antes de abrir a
  porta.
- `npm run db:reset` apaga e recria a base (com o seed); usar apenas em desenvolvimento.
- `drizzle/0005_stock_controlo.sql` é legado/manual e não faz parte do `_journal.json`;
  não o trate como migração activa.

## Frontend

- Cada página vive em `pages/<modulo>/<modulo>.jsx` com o CSS ao lado.
- Componentes reutilizáveis em `components/` (incluindo `DataGrid`, `Modals`,
  `ConfirmDialog`, `FidelizacaoCard`, `ThemeToggle` e `PWAUpdatePrompt`).
- Comunicação com a API centralizada em `services/api.js` (adicione novas funções lá).
- Estado de sessão só no `store/authStore.js`.
- Proteja rotas em `routes/AppRoutes.jsx` com `RequireAuth`, `RequireSession` ou
  `RequirePermission`.
- A URL da API vem de `VITE_API_URL`; em desenvolvimento, sem essa variável, usa
  `http://localhost:5000`; em produção, sem variável, usa a mesma origem.
- Tema claro/escuro gerido por `data-theme` + `variables.css`; a app é instalável como
  **PWA** (`vite-plugin-pwa` + Workbox).
- Não há dados mock: as páginas consomem a API real.

## Variáveis de ambiente e segredos

- **Nunca** comite o ficheiro `.env` (já está no `.gitignore`).
- Mantenha `Backend/.env.example` actualizado com **placeholders**, nunca com credenciais
  reais.
- Use um `JWT_SECRET` forte em produção.
- No frontend, defina `VITE_API_URL` no build de produção quando a API não estiver na
  mesma origem.

## Testes

- Não existe suite automatizada (backend ou frontend). Antes de abrir um PR, execute os
  fluxos de [testes-endpoints.md](./testes-endpoints.md) e o `npm run build` do frontend.
- Se introduzir testes, use as ferramentas já disponíveis no ecossistema (Node test runner
  ou Vitest) sem alterar a stack obrigatória sem aprovação.

## Git

- Mensagens de commit claras, em Português ou Inglês (o histórico mistura ambos).
- Exemplos de prefixos usados no repositório:
  - `Feat:` — nova funcionalidade
  - `Fix:` — correcção
  - `Merge ...` — integração de branches
- Verifique `git status` antes de commitar; há ficheiros gerados (`dist/`,
  `node_modules/`) que não devem entrar no repositório.

## Checklist antes de abrir um Pull Request

- [ ] O backend arranca sem erros (`npm run dev` em `Backend`).
- [ ] As migrações Drizzle estão aplicadas e o seed está presente
      (`npm run db:migrate` ou arranque do backend).
- [ ] O frontend compila (`npm run build` em `Frontend`).
- [ ] As novas rotas estão registadas em `app.js` e protegidas pela permissão adequada.
- [ ] A permissão nova foi acrescentada ao seed e concedida aos perfis.
- [ ] As validações foram espelhadas entre frontend e backend.
- [ ] Operações sensíveis geram auditoria.
- [ ] A documentação em `docs/` foi actualizada, se aplicável.

## Documentação

- Toda a documentação vive nesta pasta `docs/`.
- O índice está em [README.md](./README.md).
- Ao adicionar um documento novo, inclua o link no índice.
