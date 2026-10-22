# Desenvolvimento

[← Voltar ao índice](./README.md)

## Convenções de código

- **Linguagem:** JavaScript (ES Modules). O backend tem `"type": "module"`; o frontend
  também usa `import`/`export`.
- **Idioma:** nomes de domínio, comentários e textos da interface em **Português**
  (ex.: `funcionario`, `servico`, `categoria_salao`).
- **Estilo:** indentação de 4 espaços no backend, sem ponto-e-vírgula consistente
  obrigatório. Mantenha o estilo do ficheiro que está a editar.
- **Erros:** em respostas de API, use sempre JSON com o campo `message` (e `field`
  quando aplicável).

## Fluxo de trabalho (backend, padrão recomendado)

Ao criar um novo recurso CRUD, siga a estrutura já usada em categorias/serviços:

1. **Schema** (`src/db/schema/<dominio>.js`) — tabela Drizzle com colunas, FKs,
   checks e índices. Reexportar em `src/db/schema/index.js` se for um ficheiro novo.
2. **Repository** (`src/repository/<recurso>.js`) — funções `findAll`, `findById`,
   `create`, `update`, `delete` com o query builder do Drizzle. Para agregações muito
   específicas (relatórios, `insert ... select`, `lateral`), usar o operador `sql` do
   Drizzle em vez de concatenar strings.
3. **Controller** (`src/controller/<recurso>.js`) — validação de entrada, chamadas ao
   repositório, códigos HTTP e tradução de erros do PostgreSQL.
4. **Routes** (`src/routes/<recurso>.js`) — ligação rota → controller, com
   `authenticate`/`authorize`.
5. **Registo da rota** em `src/app.js`:
   ```js
   app.use("/api", recursoRoutes);
   ```

### Boas práticas observadas

- Importar o `db` de `src/db/client.js` (nunca criar uma pool nova).
- Transações com `db.transaction(async (tx) => { ... })`; passar o `tx` aos
  repositórios que participam na mesma operação.
- `UPDATE` parcial: construir o objecto `set` apenas com os campos enviados
  (`!== undefined && !== null`), mantendo inalterados os restantes.
- Devolver `null` no repositório quando o registo não existe e traduzir em `404` no controller.
- Tratar `23503` (violação de chave estrangeira) com mensagens legíveis.

### Migrações

- O schema Drizzle é a fonte de verdade. Não editar migrações já aplicadas.
- Alterar o schema → `npm run db:generate` → revisar o SQL em `drizzle/` → `npm run db:migrate`.
- O `npm run dev` aplica as migrações pendentes automaticamente antes de abrir a porta.
- `npm run db:reset` apaga e recria a base; usar apenas em desenvolvimento.

## Frontend

- Cada página vive em `pages/<modulo>/<modulo>.jsx` com o CSS ao lado.
- Componentes reutilizáveis em `components/`.
- Comunicação com a API centralizada em `services/api.js` (adicione novas funções lá).
- Estado de sessão só no `store/authStore.js`.
- Proteja rotas em `routes/AppRoutes.jsx` com `RequireAuth` / `RequireRole`.

## Variáveis de ambiente e segredos

- **Nunca** comite o ficheiro `.env` (já está no `.gitignore`).
- Mantenha `Backend/.env.example` actualizado sempre que adicionar uma variável.
- Use um `JWT_SECRET` forte em produção.

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
- [ ] As migrações Drizzle estão aplicadas e os perfis/seed estão presentes
      (`npm run db:migrate` ou arranque do backend).
- [ ] O frontend compila (`npm run build` em `Frontend`).
- [ ] As novas rotas estão registadas em `app.js` e protegidas quando necessário.
- [ ] As validações foram espelhadas entre frontend e backend.
- [ ] A documentação em `docs/` foi actualizada, se aplicável.

## Documentação

- Toda a documentação vive nesta pasta `docs/`.
- O índice está em [README.md](./README.md).
- Ao adicionar um documento novo, inclua o link no índice.
