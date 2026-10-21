# Instalação e Execução

[← Voltar ao índice](./README.md)

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+) e **npm**
- **PostgreSQL** 13+ em execução
- **Git**

## 1. Clonar o repositório

```bash
git clone https://github.com/Vick-Sama-Coder/Faces-System.git
cd Faces-System
```

## 2. Base de dados

Crie a base de dados e aplique os scripts da pasta `Backend/Database/schema/` **por ordem
numérica** (ver detalhes em [base-de-dados.md](./base-de-dados.md)).

```bash
# criar a base (ver nota importante sobre o script 000)
createdb SalaoFaces

# aplicar cada script na ordem
for f in Backend/Database/schema/*.sql; do
  psql -d SalaoFaces -f "$f"
done
```

> ⚠️ **Importante:** o script `000_create_database_SalaoFaces.sql` executa
> `drop database`/`create database`, que o PostgreSQL **não** permite dentro de uma
> transacção. Execute-o **isoladamente** com `psql`, ou simplesmente crie a base
> manualmente com `createdb SalaoFaces` e aplique os restantes scripts a partir do `001`.

## 3. Backend

```bash
cd Backend
npm install
```

Crie o ficheiro `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Depois edite `Backend/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=SalaoFaces
DATABASE_USER=postgres
DATABASE_PASSWORD= a_sua_password
PORT=5000
JWT_SECRET= uma_chave_secreta_longa
CLIENT_URL=http://localhost:5173/
```

| Variável | Descrição |
| --- | --- |
| `DATABASE_HOST` | Host do PostgreSQL |
| `DATABASE_PORT` | Porta do PostgreSQL (por omissão `5432`) |
| `DATABASE_NAME` | Nome da base (`SalaoFaces`) |
| `DATABASE_USER` | Utilizador da base |
| `DATABASE_PASSWORD` | Palavra-passe da base |
| `PORT` | Porta do servidor Express (padrão no `.env.example`: `5000`) |
| `JWT_SECRET` | Segredo para assinar/verificar os tokens JWT |
| `CLIENT_URL` | Origem permitida no CORS (o URL do frontend) |

Executar:

```bash
npm run dev     # desenvolvimento (nodemon, reinicia ao guardar)
npm start       # produção
```

O servidor deverá imprimir algo como:

```
Servidor esta escutando na porta: 5000
Database conectada
```

## 4. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Por omissão o Vite serve em `http://localhost:5173`.

### URL da API no frontend

O endereço da API está actualmente **fixo** em `Frontend/src/services/api.js`:

```js
const BASE_API = "http://192.168.0.14:5000/";
```

Para desenvolvimento local, altere para a máquina onde corre o backend, por exemplo:

```js
const BASE_API = "http://localhost:5000/";
```

> O backend permite CORS apenas para a origem definida em `CLIENT_URL`. Se mudar a porta
> do frontend, actualize `CLIENT_URL` no `Backend/.env`.

## Scripts disponíveis

### Backend (`Backend/package.json`)

| Script | Comando | Descrição |
| --- | --- | --- |
| `dev` | `nodemon --watch src src/server.js` | Servidor com auto-reload |
| `start` | `node src/server.js` | Servidor normal |

### Frontend (`Frontend/package.json`)

| Script | Comando | Descrição |
| --- | --- | --- |
| `dev` | `vite` | Servidor de desenvolvimento |
| `build` | `vite build` | Build de produção (pasta `dist/`) |
| `preview` | `vite preview` | Pré-visualizar a build |
| `lint` | `eslint .` | Análise estática |

## Resolução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Erro no CORS` no browser | `CLIENT_URL` diferente da origem do frontend | Ajuste `CLIENT_URL` no `Backend/.env` |
| `Nao autenticado: token em falta` | Cookie não enviado | Confirme `withCredentials: true` no Axios e o CORS com `credentials: true` |
| `A conexao falhou com a base de dados` | Credenciais/host errados | Revise o `.env` e confirme que o PostgreSQL está a correr |
| Login sempre falha | Perfis não semeados na tabela `perfil` | Aplique o script `015_atualiza_perfis.sql` |
