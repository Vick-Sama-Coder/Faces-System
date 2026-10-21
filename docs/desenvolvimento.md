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

1. **Repository** (`src/repository/<recurso>.js`) — funções `findAll`, `findById`,
   `create`, `update`, `delete` com SQL parametrizado.
2. **Controller** (`src/controller/<recurso>.js`) — validação de entrada, chamadas ao
   repositório, códigos HTTP e tradução de erros do PostgreSQL.
3. **Routes** (`src/routes/<recurso>.js`) — ligação rota → controller, com
   `authenticate`/`authorize`.
4. **Registo da rota** em `src/app.js`:
   ```js
   app.use("/api", recursoRoutes);
   ```

### Boas práticas observadas

- SQL sempre parametrizado (`$1`, `$2`, …) — nunca concatenar valores.
- `UPDATE` parcial com `coalesce($n, coluna)` para não apagar campos não enviados.
- Devolver `null` no repositório quando o registo não existe e traduzir em `404` no controller.
- Tratar `23503` (violação de chave estrangeira) com mensagens legíveis.

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
- [ ] A base de dados tem o esquema aplicado e os perfis semeados.
- [ ] O frontend compila (`npm run build` em `Frontend`).
- [ ] As novas rotas estão registadas em `app.js` e protegidas quando necessário.
- [ ] As validações foram espelhadas entre frontend e backend.
- [ ] A documentação em `docs/` foi actualizada, se aplicável.

## Documentação

- Toda a documentação vive nesta pasta `docs/`.
- O índice está em [README.md](./README.md).
- Ao adicionar um documento novo, inclua o link no índice.
