# Regras de Tecnologia

[← Voltar ao índice](./README.md)

Este documento define a **stack obrigatória** do Faces System e as regras de implementação
que devem ser respeitadas em qualquer contribuição. Alterações a estas regras devem ser
discutidas e aprovadas antes de serem aplicadas.

## Stack oficial

> **Regra:** o sistema é implementado com **React**, **Node.js + Express** e **PostgreSQL**,
> com **CSS puro** e **React**.

| Camada | Tecnologia obrigatória |
| --- | --- |
| Frontend | **React** (JavaScript) |
| Estilização | **CSS puro** (ficheiros `.css` próprios) |
| Backend | **Node.js + Express** |
| Base de dados | **PostgreSQL** |

## Frontend — regras

- **React** é a única biblioteca de UI. Não introduzir outros frameworks
  (Vue, Angular, Svelte, etc.).
- **CSS puro** é a única forma de estilização. É proibido introduzir:
  - Tailwind CSS
  - Bootstrap / Material UI / Chakra / Ant Design / Mantine
  - CSS-in-JS (styled-components, Emotion, Stitches)
  - Pré-processadores adicionais (Sass/Less) sem aprovação
- Cada componente/página tem o **seu próprio ficheiro `.css`** ao lado do `.jsx`
  (padrão já seguido no projecto), importado no topo do componente.
- Variáveis de tema (cores, espaçamentos) ficam em `Frontend/src/Styles/variables.css`
  e os estilos globais em `Frontend/src/Styles/global.css`.
- Escrever em **JavaScript** (ES Modules). Não migrar para TypeScript sem aprovação.
- Bibliotecas já adoptadas e permitidas:
  React Router, Zustand, Axios, AG Grid (React), Recharts, lucide-react, date-fns,
  localforage e `@fontsource/*`.

## Backend — regras

- **Node.js + Express** é o servidor. Não introduzir frameworks alternativos
  (Nest, Fastify, Koa) sem aprovação.
- Manter a **arquitectura em camadas**:
  `routes → controller → repository → PostgreSQL`.
- Acesso à base de dados com o driver **`pg`** e **SQL parametrizado**
  (`$1`, `$2`, …). Não introduzir ORM (Prisma, Sequelize, TypeORM) sem aprovação.
- Autenticação com **JWT** (`jsonwebtoken`) em cookie **`httpOnly`** e palavras-passe
  com **hash bcrypt**.
- Configuração sensível apenas via variáveis de ambiente (`dotenv`), nunca no código.
- Módulos ES Modules (`"type": "module"`).

## Base de dados — regras

- **PostgreSQL** é o único SGBD.
- Alterações ao esquema devem ser feitas através de novos scripts numerados em
  `Backend/Database/schema/` (nunca editar scripts já aplicados em produção).
- Respeitar a integridade referencial (chaves estrangeiras) definida no esquema.

## O que evitar

| ❌ Não usar | ✅ Usar em vez disso |
| --- | --- |
| Tailwind / Bootstrap / MUI | CSS puro em `.css` por componente |
| styled-components / Emotion | CSS puro |
| Prisma / TypeORM / Sequelize | `pg` com SQL parametrizado |
| Nest / Fastify / Koa | Express |
| TypeScript (sem aprovação) | JavaScript (ES Modules) |
| Outro SGBD (MySQL, SQLite, Mongo) | PostgreSQL |

## Justificação

Manter uma stack única e simples reduz a curva de aprendizagem, evita dependências
desnecessárias e mantém o código consistente entre todos os módulos do sistema. O uso de
**CSS puro** garante controlo total do estilo sem dependência de utilitários externos.

> Ao propor uma nova dependência, verifique primeiro se o problema não se resolve com o
> que já existe na stack.
