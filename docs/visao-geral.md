# Visão Geral

[← Voltar ao índice](./README.md)

## O que é o Faces System

O **Faces System** é uma aplicação web de gestão para salões de beleza/barbearias. O objectivo
é centralizar a operação diária do salão: serviços prestados, funcionários, clientes,
atendimentos, receitas, despesas e relatórios.

O sistema está dividido em duas aplicações independentes:

- **Backend** (`Backend/`) — API REST que expõe os dados e aplica as regras de negócio e de autorização.
- **Frontend** (`Frontend/`) — aplicação React (SPA) que consome a API.

## Funcionalidades previstas

| Módulo | Estado | Descrição |
| --- | --- | --- |
| Autenticação | ✅ Implementado | Registo, login, sessão (`/me`), logout |
| Autorização por perfil | ✅ Implementado | Perfis `Administrador` e `Usuario` |
| Gestão de utilizadores | ✅ Implementado | Listagem de utilizadores (só Administrador) |
| Categorias de serviço | ✅ Backend pronto | CRUD completo de categorias |
| Serviços | ✅ Backend pronto | CRUD completo de serviços |
| Funcionários | ✅ Backend pronto | CRUD completo de funcionários |
| Clientes | 🚧 Em curso | Rota de frontend criada, sem CRUD na API |
| Atendimentos | 🚧 Em curso | Página com dados de exemplo (mock) |
| Despesas | 🚧 Em curso | Página vazia (placeholder) |
| Relatórios | 🚧 Em curso | Página vazia (placeholder) |
| Dashboard | 🚧 Em curso | Cartões com valores de exemplo (mock) |

> Consulte [estado-e-pendencias.md](./estado-e-pendencias.md) para o detalhe do que é real
> (vindo da API) e do que é apenas demonstração visual.

## Stack tecnológica

> 📌 **Regra de tecnologia:** o sistema é implementado com **React**, **Node.js + Express**
> e **PostgreSQL**, com **CSS puro**. A stack é obrigatória — consulte
> [regras-tecnologia.md](./regras-tecnologia.md) antes de introduzir novas dependências.

### Backend

| Tecnologia | Versão | Para que serve |
| --- | --- | --- |
| Node.js | — | Runtime (usa ES Modules, `"type": "module"`) |
| Express | ^5.2.1 | Servidor HTTP e roteamento |
| PostgreSQL (`pg`) | ^8.23.0 | Base de dados relacional |
| `jsonwebtoken` | ^9.0.3 | Geração/verificação do token JWT |
| `bcrypt` | ^6.0.0 | Hash das palavras-passe |
| `cookie-parser` | ^1.4.7 | Leitura de cookies (token) |
| `cors` | ^2.8.6 | Controlo de origem cruzada |
| `dotenv` | ^17.4.2 | Variáveis de ambiente |
| `nodemon` | ^3.1.14 | Recarregamento automático em desenvolvimento |

### Frontend

| Tecnologia | Versão | Para que serve |
| --- | --- | --- |
| React | ^19.2.7 | Biblioteca de UI |
| Vite | ^8.1.1 | Bundler/dev server |
| React Router | ^7.11.0 | Navegação e rotas protegidas |
| Zustand | ^5.0.14 | Estado global (sessão/autenticação) |
| Axios | ^1.20.0 | Cliente HTTP |
| AG Grid (React) | ^36.2.0 | Tabelas de dados |
| Recharts | ^3.9.1 | Gráficos (reservado para relatórios) |
| lucide-react | ^1.28.0 | Ícones |
| date-fns | ^4.4.0 | Manipulação de datas |
| localforage | ^1.10.0 | Armazenamento local |

### Fontes

As fontes `Inter`, `Manrope` e `Poppins` são carregadas via `@fontsource` em `Frontend/src/main.jsx`.
