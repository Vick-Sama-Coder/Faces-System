# Documentação — Faces System

Bem-vindo à documentação do **Faces System**, um sistema de gestão para salão de beleza
(cadastro de serviços, funcionários, clientes, atendimentos, despesas e relatórios).

Esta pasta reúne toda a documentação necessária para **instalar, entender, usar e evoluir**
o sistema.

## Índice

| Documento | Conteúdo |
| --- | --- |
| [visao-geral.md](./visao-geral.md) | Objetivo do sistema, funcionalidades e stack tecnológica |
| [regras-tecnologia.md](./regras-tecnologia.md) | **Stack obrigatória e regras de implementação** (React, Node/Express, PostgreSQL, CSS puro) |
| [arquitetura.md](./arquitetura.md) | Arquitetura, camadas do backend e estrutura de pastas |
| [instalacao.md](./instalacao.md) | Pré-requisitos, configuração do `.env`, base de dados e como executar |
| [base-de-dados.md](./base-de-dados.md) | Modelo de dados, tabelas, relações e scripts de migração |
| [api.md](./api.md) | Referência de todos os endpoints HTTP da API |
| [testes-endpoints.md](./testes-endpoints.md) | **Guia de teste da API**: como testar cada endpoint, resultado esperado e verificação dos requisitos RF01–RF25 |
| [autenticacao-permissoes.md](./autenticacao-permissoes.md) | Login, JWT/cookie, perfis e controlo de acesso |
| [frontend.md](./frontend.md) | Rotas, estado global, componentes e páginas do frontend |
| [funcionalidades.md](./funcionalidades.md) | Descrição funcional de cada módulo do sistema |
| [validacoes.md](./validacoes.md) | Regras de validação de nome, telefone e senha |
| [desenvolvimento.md](./desenvolvimento.md) | Convenções de código, fluxo de trabalho e Git |
| [estado-e-pendencias.md](./estado-e-pendencias.md) | O que já está pronto, o que é mock e problemas conhecidos |
| [implementacao-backend.md](./implementacao-backend.md) | **Plano de implementação do backend por fases** (migrações, endpoints, regras e critérios) |

### Produto / requisitos

| Documento | Conteúdo |
| --- | --- |
| [historias-usuario-salao-beleza.md](./historias-usuario-salao-beleza.md) | Backlog de histórias de utilizador, épicos, critérios de aceitação e regras de negócio |

> O backlog de histórias de utilizador descreve o comportamento **esperado** do produto
> (inclui módulos ainda não implementados). Compare-o com
> [estado-e-pendencias.md](./estado-e-pendencias.md) para ver o que falta construir.

## Resumo rápido

- **Backend:** Node.js + Express 5 + PostgreSQL (`pg`), autenticação com JWT em cookie `httpOnly`.
- **Frontend:** React 19 + Vite + React Router 7 + Zustand + Axios + AG Grid.
- **Perfis:** `Administrador` e `Usuario`.
- **Idioma do projeto:** Português (código, comentários e interface).

> Para começar a correr o projeto, vá directamente para [instalacao.md](./instalacao.md).
