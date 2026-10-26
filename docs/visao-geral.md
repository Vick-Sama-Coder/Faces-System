# Visão Geral

[← Voltar ao índice](./README.md)

## O que é o Faces System

O **Faces System** é uma aplicação web de gestão para salões de beleza/barbearias. O objectivo
é centralizar a operação diária do salão: clientes, serviços, funcionários, atendimentos,
pagamentos, caixa, despesas, stock, fidelização, horários, salários, relatórios e auditoria.

O sistema está dividido em duas aplicações independentes:

- **Backend** (`Backend/`) — API REST que expõe os dados e aplica as regras de negócio e de autorização.
- **Frontend** (`Frontend/`) — aplicação React (SPA/PWA) que consome a API.

A documentação de produto (requisitos e histórias de utilizador) está em
[documentacao.md](./documentacao.md) e
[historias-usuario-salao-beleza.md](./historias-usuario-salao-beleza.md). O estado real da
implementação está em [estado-e-pendencias.md](./estado-e-pendencias.md).

## Módulos

| Módulo | Estado | Descrição |
| --- | --- | --- |
| Autenticação e primeiro acesso | ✅ Implementado | Registo com senha padrão `12345`, login por nome de utilizador, sessão (`/me`), troca obrigatória de senha no primeiro acesso e logout |
| Autorização (RBAC) | ✅ Implementado | Perfis `Administrador`, `Usuario` e `Auditor`; permissões por perfil e exceções por utilizador |
| Gestão de contas e perfis | ✅ Implementado | Criação/edição/estado de contas, reposição de credenciais, perfis e matriz de permissões |
| Categorias de serviço | ✅ Implementado | CRUD completo |
| Serviços e aplicações | ✅ Implementado | CRUD, preços fixos/variáveis, histórico de preços, modalidades e aplicações associadas |
| Funcionários | ✅ Implementado | CRUD, estado, salário, comissão geral/específica, desempenho e ligação opcional a conta |
| Clientes | ✅ Implementado | CRUD, pesquisa, estado, sexo/idade e cartão de fidelização |
| Atendimentos | ✅ Implementado | Serviços/aplicações por atendimento, modalidades, descontos, anulação e totais automáticos |
| Pagamentos | ✅ Implementado | Parcelas, vários métodos, liquidação e anulação |
| Comissões | ✅ Implementado | Geração na liquidação, taxa específica sobre a geral e consulta |
| Caixa | 🟡 Parcial | Abertura, movimentos, levantamentos, fecho e diferença na API; sem página dedicada |
| Despesas | ✅ Implementado | Categorias, itens/produtos, ligação ao caixa e exclusão auditada |
| Stock | 🟡 Parcial | Movimentos de entrada/saída/ajuste e cálculo de stock na API; UI só consulta movimentos e ainda não carrega produtos (ver pendências) |
| Fidelização | ✅ Implementado | Cartão 5/5, 6.º serviço gratuito, marcas automáticas/manuais, correções e histórico |
| Horários e assiduidade | ✅ Implementado | Programação semanal, registo diário, ocorrências e controlo mensal de horas |
| Salários | 🟡 Parcial | Processamento mensal, deduções, aprovação e pagamento na API; sem interface dedicada |
| Relatórios | ✅ Implementado | Relatórios agregados + relatório financeiro consolidado, exportação CSV e impressão/PDF |
| Dashboard | ✅ Implementado | Indicadores, evolução financeira, top serviços/funcionários, fidelização e ações rápidas |
| Catálogo público | ✅ Implementado | Serviços ativos sem autenticação (`/api/public/servicos`) |
| Auditoria | ✅ Implementado | Registo append-only consultável por permissão `auditoria:ler` |
| PWA / offline | 🟡 Parcial | Instalação, cache de assets e aviso de atualização; sincronização offline não implementada |

## Stack tecnológica

> 📌 **Regra de tecnologia:** o sistema é implementado com **React**, **Node.js + Express**
> e **PostgreSQL**, com **CSS puro**. A stack é obrigatória — consulte
> [regras-tecnologia.md](./regras-tecnologia.md) antes de introduzir novas dependências.

### Backend

| Tecnologia | Versão | Para que serve |
| --- | --- | --- |
| Node.js | — | Runtime (usa ES Modules, `"type": "module"`) |
| Express | ^5.2.1 | Servidor HTTP e roteamento |
| PostgreSQL (`pg`) | ^8.23.0 | Driver e pool de conexões da base de dados |
| `drizzle-orm` + `drizzle-kit` | ^0.45.4 / ^0.31.11 | ORM, schema e migrações |
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
| Zustand | ^5.0.14 | Estado global (sessão e tema) |
| Axios | ^1.20.0 | Cliente HTTP |
| AG Grid (React) | ^36.2.0 | Tabelas de dados |
| Recharts | ^3.9.1 | Gráficos do dashboard e relatórios |
| lucide-react | ^1.28.0 | Ícones |
| date-fns | ^4.4.0 | Manipulação de datas |
| localforage | ^1.10.0 | Armazenamento local |
| `vite-plugin-pwa` + `workbox-window` | 2.0.0 / 7.4.1 | Manifest, service worker e aviso de atualização |

### Fontes

As fontes `Inter`, `Manrope` e `Poppins` são carregadas via `@fontsource` em
`Frontend/src/main.jsx`.
