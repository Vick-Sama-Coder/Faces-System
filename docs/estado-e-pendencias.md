# Estado do Projecto e Pendências

[← Voltar ao índice](./README.md)

Este documento regista o que **já funciona**, o que é apenas **demonstração visual (mock)**
e os **problemas conhecidos** a corrigir.

## O que já funciona de ponta a ponta

- ✅ Registo, login, sessão (`/me`) e logout, com JWT em cookie `httpOnly`.
- ✅ Login por **nome de utilizador** (único) e recuperação de senha por **código enviado
  por SMS ao telefone** registado (`/api/auth/recuperar-senha` e `/api/auth/redefinir-senha`).
- ✅ Autorização por perfil (`Administrador` / `Usuario`) no backend e no frontend.
- ✅ Gestão de utilizadores (listagem) restrita a Administrador.
- ✅ CRUD completo (API) de **categorias de serviço**.
- ✅ CRUD completo (API) de **serviços**.
- ✅ CRUD completo (API) de **funcionários**.
- ✅ Gestão de **contas, perfis e permissões** (RBAC) e alteração de senha.
- ✅ CRUD completo (API) de **clientes** (com pesquisa e estado).
- ✅ **Atendimentos** com serviços realizados (criação transacional, totais automáticos).
- ✅ **Pagamentos** (parcelas, liquidação parcial/total, anulação).
- ✅ **Comissões** geradas na liquidação (taxa específica sobrepõe-se à geral).
- ✅ **Caixa** (abertura, movimentos, levantamentos, fecho com diferença).
- ✅ **Despesas** e categorias de despesa (com produtos, ligação ao caixa).
- ✅ **Fidelização** (marcas por dia, benefício à 5.ª, corte gratuito).
- ✅ **Horários** de funcionários (programação semanal, substituição transacional).
- ✅ **Assiduidade** (registos diários e ocorrências, correção).
- ✅ **Salários** (processamento mensal base + comissões − deduções, aprovação e pagamento).
- ✅ **Relatórios** agregados (resumo financeiro, caixa, serviços, funcionários, assiduidade,
  clientes, fidelização, anulações e movimentos).
- ✅ **Catálogo público** de serviços ativos, sem autenticação (`/api/public/servicos`),
  expondo apenas dados de divulgação.
- ✅ **Auditoria** (`/api/auditoria`): registo append-only das operações relevantes
  (pagamentos, anulações, caixa, despesas, salários, assiduidade, fidelização e permissões),
  consultável por `auditoria:ler`.

## O que é mock / placeholder

| Página | Situação |
| --- | --- |
| Dashboard | Valores fixos, sem ligação à API |
| Novo Atendimento | AG Grid com dados de exemplo (API pronta, UI por ligar) |
| Funcionários | AG Grid com dados de exemplo (campos inconsistentes) |
| Serviços | Placeholder (backend pronto, UI por ligar) |
| Clientes | Placeholder (backend pronto, UI por ligar) |
| Despesas | Placeholder (backend pronto, UI por ligar) |
| Relatório | Placeholder (backend pronto, UI por ligar) |
| Horários / Assiduidade / Salários | Sem UI (backend pronto) |
| Catálogo público | Sem UI (backend pronto) |
| Auditoria | Sem UI (backend pronto) |

## Pendências técnicas

### ✅ Corrigido

As seguintes correções foram aplicadas:

1. ✅ **Perfis semeados.** `015_atualiza_perfis.sql` agora faz `insert ... on conflict do update`
   para os perfis `1` (`Administrador`) e `2` (`Usuario`), garantindo a sua existência.
2. ✅ **Erro de sintaxe em `009_create_categoria_produto.sql`.** Vírgula a mais removida.
3. ✅ **Typo `authotize` em `Backend/src/routes/funcionario.js`.** Corrigido para `authorize`.
4. ✅ **Sintaxe inválida em `000_create_database_SalaoFaces.sql`.** `create database if not exists`
   substituído por `create database` (com nota de execução fora de transacção).
5. ✅ **`Backend/E` (token JWT em texto simples).** Ficheiro removido e adicionado ao
   `Backend/.gitignore` (`E`, `cookies.txt`).
6. ✅ **`.gitignore` da raiz com marcadores de merge.** Ficheiro limpo.

> ⚠️ **Acção pendente de segurança:** como `Backend/E` já estava versionado, o token
> permanece no histórico do Git. É recomendado **rodar o `JWT_SECRET`** (invalidando os
> tokens antigos) e, se necessário, limpar o histórico (`git filter-repo` /
> `BFG Repo-Cleaner`).

### 🔴 Crítico (restante)

_Nenhum ponto crítico em aberto._

### 🟡 Importante

7. **Rotas públicas no frontend.** Várias rotas de operação não estão envolvidas em
   `RequireAuth`, apesar de a API exigir autenticação. Um utilizador não autenticado
   consegue abrir `/clientes`, `/servicos`, `/despesas`, `/relatorio`, `/novoAtendimento`,
   mas as chamadas à API devolverão `401`.

8. **`BASE_API` fixo** em `Frontend/src/services/api.js`
   (`http://192.168.0.14:5000/`). Idealmente usar variável de ambiente do Vite
   (`import.meta.env.VITE_API_URL`).

9. **Duração da sessão inconsistente.** JWT expira em 30 dias, cookie em 10 dias.

10. **Sem controladores para produtos.** As tabelas de produto existem na base de dados;
    falta a camada de API. (Atendimentos, pagamentos, comissões, caixa, despesas,
    fidelização, horários, assiduidade, salários e relatórios já têm API.)

11. **`Backend` tem `.env` comitável?** Confirme que o `.env` real nunca é comitado;
    só o `.env.example` deve estar no repositório.

### 🟢 Melhorias

12. Adicionar um CRUD de categorias/serviços/funcionários no **frontend**.
13. Substituir dados mock do Dashboard por indicadores reais.
14. ✅ **Recuperação de senha implementada** (`/forgotpass`): código de 6 dígitos por SMS
    ao telefone, com validade (10 min), uso único e limite de tentativas. O envio é feito
    por `Backend/src/utils/sms.js` — sem provedor configurado (`SMS_API_URL`), o código é
    escrito no console e devolvido na resposta fora de produção, para testes.
15. Adicionar um `README.md` na raiz do repositório (ou apontar para `docs/README.md`).
16. Uniformizar logs (`console.error` vs `console.log`) e mensagens em português.
17. Paginação nas listagens maiores (atendimentos, pagamentos) quando o volume o justificar.
    (Por decisão de projeto, as listagens devolvem arrays simples nesta fase.)
18. Adicionar testes automatizados (backend e frontend).
19. Centralizar a URL da API e as variáveis de ambiente do frontend.
20. **Fechar as decisões pendentes da análise.** Catorze questões (§16 de `documentacao.md`)
    ainda sem decisão de produto; estão consolidadas na **Fase 16** de
    `implementacao-backend.md` para resolução pelo utilizador. Sem elas, algumas regras
    (descontos, comissões em casos-limite, preço no catálogo, exportação de relatórios)
    ficam implementadas por interpretação.

### 🔴 Funcional (encontrado na verificação dos requisitos)

Levantado em [`testes-endpoints.md`](./testes-endpoints.md) §3; prioridade alta porque
afeta dinheiro ou segurança:

21. **Anulação de pagamento não reverte caixa nem comissão (RF09).** O pagamento fica
    `Anulado`, mas o movimento de caixa continua `Ativo` e a comissão continua `Elegivel`.
    O relatório `resumo` também conta pagamentos de atendimentos anulados.
22. **Pagamento parcial é aceite (RF08).** O requisito diz que não há crédito nesta fase,
    mas o backend devolve `estado = "Parcial"` quando a soma é inferior ao devido.
23. **Troca de senha obrigatória não bloqueia acessos (RF01).** O flag
    `alteracao_obrigatoria_senha` é devolvido no login, mas as rotas continuam acessíveis.
24. **Auditoria incompleta (RF02/RF23).** Criar/editar/desativar contas e repor senhas não
    geram log; não existe “resultado da operação” nem registo de tentativas falhadas.
25. **Fecho de caixa do dia anterior (RF11).** Não há bloqueio de operações no dia seguinte
    nem procedimento administrativo documentado para corrigir um fecho errado.

## Sugestões de próximos passos

1. Ligar as páginas **Serviços** e **Funcionários** aos endpoints já existentes.
2. Ligar a página **Novo Atendimento** aos endpoints de atendimentos/pagamentos.
3. Ligar as páginas **Despesas** e **Caixa** aos endpoints já existentes.
4. Popular o **Dashboard** com dados reais (usar `/api/relatorios/resumo`).
5. Ligar a página **Relatório** aos endpoints de `/api/relatorios/*` e às páginas de
   horários/assiduidade/salários.
