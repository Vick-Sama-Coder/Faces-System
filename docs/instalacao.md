# Instalação e Execução

[← Voltar ao índice](./README.md)

## Pré-requisitos

- **Node.js** 20+ e **npm**
- **PostgreSQL** 13+ (local, Neon, Supabase, RDS ou outro serviço compatível)
- **Git**

## 1. Clonar o repositório

```bash
git clone https://github.com/Vick-Sama-Coder/Faces-System.git
cd Faces-System
```

## 2. Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Edite `Backend/.env` (nunca comite este ficheiro):

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=SalaoFaces
DATABASE_USER=postgres
DATABASE_PASSWORD=a_sua_password
DATABASE_MAINTENANCE_DB=postgres
DATABASE_SSL=false
# DATABASE_SSL_REJECT_UNAUTHORIZED=true
PORT=5000
JWT_SECRET=uma_chave_secreta_longa_e_aleatoria
CLIENT_URL=http://localhost:5173/
```

| Variável | Descrição |
| --- | --- |
| `DATABASE_HOST` | Host do PostgreSQL |
| `DATABASE_PORT` | Porta do PostgreSQL (por omissão `5432`) |
| `DATABASE_NAME` | Nome da base (`SalaoFaces`) |
| `DATABASE_USER` | Utilizador da base |
| `DATABASE_PASSWORD` | Palavra-passe da base |
| `DATABASE_MAINTENANCE_DB` | Base usada para criar `DATABASE_NAME` se faltar (por omissão `postgres`) |
| `DATABASE_SSL` | `true`/`false`. Se omitido, usa SSL em hosts remotos e desliga em `localhost` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` desactiva a validação do certificado (só para proxies/certificados próprios); por omissão valida |
| `PORT` | Porta do servidor Express |
| `JWT_SECRET` | Segredo para assinar/verificar os tokens JWT |
| `CLIENT_URL` | Origem permitida no CORS (URL do frontend; o `app.js` normaliza para a origem) |

> O `.env.example` contém apenas **placeholders**. Se estiver a usar um serviço gerido
> (Neon/Supabase/RDS), defina `DATABASE_SSL=true` e as credenciais reais no `.env`.

Executar:

```bash
npm run dev     # desenvolvimento (nodemon, reinicia ao guardar)
npm start       # produção
```

No arranque o backend:

1. liga à base de manutenção e **cria `DATABASE_NAME` se não existir**;
2. garante que existem migrações em `drizzle/` (em desenvolvimento gera a inicial se
   faltar; em produção falha com instrução);
3. aplica as migrações pendentes (incluindo o seed de perfis/permissões).

Saída esperada:

```
[db] Base de dados criada e migracoes aplicadas.
Servidor esta escutando na porta: 5000
Database conectada
```

> A base existente tem de ter o histórico Drizzle (`drizzle.__drizzle_migrations`). Se
> tiver tabelas mas não tiver histórico, o arranque aborta para evitar corrupção — faça
> backup e reconcilie o schema.

### Primeiro administrador

O registo público cria sempre o perfil `Usuario`. Para o primeiro administrador:

1. Registe a conta em `/register` ou via API.
2. Promova-a na base de dados:

```sql
update usuario set id_perfil = 1 where telefone = '821111111';
```

O login seguinte já devolve as permissões de `Administrador`. Não existe utilizador
administrador semeado por omissão.

### Scripts da base de dados

Executar em `Backend/`:

| Comando | Descrição |
| --- | --- |
| `npm run db:generate` | Gera uma migração a partir das alterações ao schema Drizzle |
| `npm run db:migrate` | Cria a base (se faltar) e aplica migrações pendentes |
| `npm run db:push` | Sincroniza o schema com a base (só desenvolvimento) |
| `npm run db:studio` | Abre o Drizzle Studio |
| `npm run db:pull` | Gera o schema a partir da base existente |
| `npm run db:check` | Valida o histórico de migrações |
| `npm run db:reset` | **Apaga e recria** a base com todas as migrações (destrutivo) |

> Em produção, inclua a pasta `Backend/drizzle/` no deploy. O arranque aplica migrações
> pendentes, mas nunca gera migrações.
>
> `drizzle/0005_stock_controlo.sql` é legado/manual e não faz parte do `_journal.json`;
> não é aplicado pelo migrador.

## 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Por omissão o Vite serve em `http://localhost:5173` (com `--host 0.0.0.0`, acessível na
rede local).

### URL da API

A URL é resolvida em `Frontend/src/services/api.js`:

1. `VITE_API_URL`, se definida;
2. `http://localhost:5000` em desenvolvimento;
3. a mesma origem em produção (útil quando o frontend e a API são servidos pelo mesmo
   domínio/reverse proxy).

Para apontar para outra API, crie `Frontend/.env` (ou `.env.production`):

```env
VITE_API_URL=https://api.exemplo.com
```

> As variáveis `VITE_*` são embutidas no build; é preciso reconstruir o frontend depois de
> as alterar. O backend só aceita CORS da origem definida em `CLIENT_URL`.

## 4. Build e deploy

### Frontend

```bash
cd Frontend
npm run build     # gera dist/
npm run preview   # pré-visualiza a build localmente
```

- Sirva `Frontend/dist/` com Nginx, Caddy, Vercel, Netlify ou equivalente.
- A app é uma **PWA** (manifesto + service worker via Workbox). É preciso servir por
  **HTTPS** (ou `localhost`) para a instalação e o service worker funcionarem.
- O service worker faz cache de assets e tem fallback para `index.html`, excepto rotas
  `/api/*`.
- Configure `VITE_API_URL` antes do build se a API estiver noutro domínio; garanta que
  esse domínio está em `CLIENT_URL` no backend.

### Backend

- Execute `npm start` (ou um process manager como PM2/systemd) com as variáveis de
  ambiente de produção.
- Inclua `Backend/drizzle/` no artefacto de deploy.
- Use `JWT_SECRET` forte, `DATABASE_SSL=true` em serviços geridos e `CLIENT_URL` com a
  origem real do frontend.
- Se usar cookies em domínios diferentes, o cookie é `SameSite=Lax` e `Secure` apenas com
  `NODE_ENV=production`; prefira servir API e frontend na mesma origem.

## Scripts disponíveis

### Backend (`Backend/package.json`)

| Script | Comando | Descrição |
| --- | --- | --- |
| `dev` | `nodemon --watch src src/server.js` | Servidor com auto-reload |
| `dev:full` | `sudo systemctl start postgresql && npm run dev` | Conveniência local (Linux) |
| `start` | `node src/server.js` | Servidor normal |

### Frontend (`Frontend/package.json`)

| Script | Comando | Descrição |
| --- | --- | --- |
| `dev` | `vite --host 0.0.0.0` | Servidor de desenvolvimento |
| `build` | `vite build` | Build de produção (pasta `dist/`) |
| `preview` | `vite preview` | Pré-visualizar a build |
| `lint` | `eslint .` | Análise estática |

## Resolução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Erro no CORS` no browser | `CLIENT_URL` diferente da origem do frontend | Ajuste `CLIENT_URL` no `Backend/.env` |
| `Nao autenticado: token em falta` | Cookie não enviado | Confirme `withCredentials: true` no Axios e CORS com `credentials: true` |
| `A conexao falhou com a base de dados` | Credenciais/host errados ou SSL mal configurado | Revise o `.env`; em serviços geridos use `DATABASE_SSL=true` |
| `connection is insecure` | Host remoto sem SSL | Defina `DATABASE_SSL=true` |
| `A base de dados tem tabelas mas nao tem historico` | Base criada fora do Drizzle | Faça backup e reconcilie as migrações |
| Login falha com conta acabada de registar | Senha padrão por trocar | Use `12345` e conclua o primeiro acesso |
| Erro 403 em rotas de escrita | Falta a permissão no perfil | Verifique `perfil_permissao` / `/permissoes` |
| Pedidos de stock devolvem 403 | `estoque:escrever` não existe no seed | Conceda a permissão manualmente ou acrescente-a ao seed |
| PWA não instala | Sem HTTPS ou service worker bloqueado | Sirva por HTTPS e confirme o build de produção |
