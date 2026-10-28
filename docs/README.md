# Documentação — Faces System

Bem-vindo à documentação do **Faces System**, um sistema de gestão para salão de beleza
(clientes, catálogo de serviços, funcionários, atendimentos, pagamentos, caixa, despesas,
stock, fidelização, horários, salários, relatórios e auditoria).

Esta pasta reúne toda a documentação necessária para **instalar, entender, usar e evoluir**
o sistema.

## Índice

| Documento | Conteúdo |
| --- | --- |
| [visao-geral.md](./visao-geral.md) | Objetivo do sistema, módulos e stack tecnológica |
| [regras-tecnologia.md](./regras-tecnologia.md) | **Stack obrigatória e regras de implementação** (React, Node/Express, PostgreSQL + Drizzle, CSS puro) |
| [arquitetura.md](./arquitetura.md) | Arquitetura, camadas do backend e estrutura de pastas |
| [instalacao.md](./instalacao.md) | Pré-requisitos, configuração do `.env`, base de dados, execução e deploy |
| [base-de-dados.md](./base-de-dados.md) | Modelo de dados, tabelas, relações, permissões e migrações Drizzle |
| [api.md](./api.md) | Referência de todos os endpoints HTTP da API |
| [testes-endpoints.md](./testes-endpoints.md) | **Guia de teste da API**: como testar cada endpoint, resultado esperado e verificação dos requisitos RF01–RF25 |
| [autenticacao-permissoes.md](./autenticacao-permissoes.md) | Login, primeiro acesso, JWT/cookie, perfis e controlo de acesso (RBAC) |
| [frontend.md](./frontend.md) | Rotas, estado global, componentes, páginas, tema e PWA |
| [offline.md](./offline.md) | Modo offline: cache, fila de escritas, sincronização, limitações e checklist de teste |
| [funcionalidades.md](./funcionalidades.md) | Descrição funcional de cada módulo do sistema |
| [validacoes.md](./validacoes.md) | Regras de validação de nome, telefone, senha, horários e fidelização |
| [desenvolvimento.md](./desenvolvimento.md) | Convenções de código, fluxo de trabalho e Git |
| [estado-e-pendencias.md](./estado-e-pendencias.md) | O que está pronto, limitações conhecidas e próximos passos |
| [implementacao-backend.md](./implementacao-backend.md) | **Plano de implementação do backend por fases** (migrações, endpoints, regras e critérios) |

### Produto / requisitos

| Documento | Conteúdo |
| --- | --- |
| [documentacao.md](./documentacao.md) | Análise de requisitos (RF, RN, RNF), modelo conceptual e decisões de produto |
| [historias-usuario-salao-beleza.md](./historias-usuario-salao-beleza.md) | Backlog de histórias de utilizador, épicos, critérios de aceitação e regras de negócio |

> O backlog e a análise de requisitos descrevem o comportamento **esperado** do produto,
> incluindo funcionalidades ainda não implementadas (offline, reservas, exportação PDF
> gerada no servidor). Compare-os com [estado-e-pendencias.md](./estado-e-pendencias.md)
> para ver o que falta construir.

## Resumo rápido

- **Backend:** Node.js + Express 5 + PostgreSQL com **Drizzle ORM**, autenticação com JWT
  em cookie `httpOnly` e autorização por **permissões (RBAC)**.
- **Frontend:** React 19 + Vite + React Router 7 + Zustand + Axios + AG Grid + Recharts,
  instalável como **PWA**.
- **Perfis base:** `Administrador`, `Usuario` e `Auditor` (as permissões são configuráveis
  por perfil e por utilizador).
- **Base de dados:** 37 tabelas (33 na migração inicial + 4 acrescentadas nas migrações
  seguintes).
- **Idioma do projeto:** Português (código, comentários e interface).

> Para começar a correr o projeto, vá directamente para [instalacao.md](./instalacao.md).
