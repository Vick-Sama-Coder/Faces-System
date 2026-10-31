# Estado do Projecto e Pendências

[← Voltar ao índice](./README.md)

Este documento regista o que **já funciona**, as **limitações conhecidas** e os **próximos
passos**. As páginas do frontend estão todas ligadas à API; já não existem ecrãs com dados
mock. As lacunas abaixo são de implementação ou de decisão de produto.

## O que já funciona de ponta a ponta

- ✅ Registo, login, sessão (`/auth/me`), perfil próprio e logout, com JWT em cookie
  `httpOnly`.
- ✅ Registo com senha padrão `12345` e fluxo de **primeiro acesso** que obriga a definir
  uma nova senha antes de usar o sistema.
- ✅ Autorização por **permissões (RBAC)** no backend e no frontend, com perfis
  `Administrador`, `Usuario` e `Auditor`.
- ✅ Gestão de contas, perfis e permissões (incluindo permissões individuais) e reposição
  de senha.
- ✅ CRUD de **categorias**, **serviços** (com modalidades, aplicações, histórico de preços
  e elegibilidade para fidelização), **funcionários** (com comissões) e **clientes**.
- ✅ **Atendimentos** com um ou vários clientes, serviços e aplicações por cliente,
  fidelização explícita por cliente, totais automáticos e preço gravado por linha.
- ✅ **Pagamentos** com parcelas e vários métodos; comissões geradas na liquidação.
- ✅ **Caixa** único (abertura, movimentos, levantamentos e fecho com diferença), por API.
- ✅ **Despesas** e categorias de despesa, com itens e ligação ao caixa.
- ✅ **Stock** por API (movimentos, saldo por produto, entrada/saída/ajuste).
- ✅ **Fidelização** (ambos os sexos, serviços elegíveis até 200 MT, seleção explícita e
  uma marca por dia por cliente, 5 marcas → 6.º serviço obrigatoriamente gratuito, sem
  acumulação).
- ✅ **Horários** semanais e **controlo mensal de assiduidade** (`/horarios`).
- ✅ **Salários** (processamento mensal, deduções, aprovação e pagamento), por API.
- ✅ **Relatórios** operacionais e financeiros, com exportação CSV e impressão/PDF pelo
  browser.
- ✅ **Dashboard** com indicadores reais do mês, séries de seis meses, tops e atendimentos
  recentes.
- ✅ **Catálogo público** de serviços activos (`/api/public/servicos`), sem autenticação.
- ✅ **Auditoria** append-only, consultável em `/logs`.
- ✅ **PWA offline** com cache de leituras em IndexedDB, fila persistida de escritas,
  sincronização ao reconectar, indicador de estado e `Idempotency-Key` no backend.
  Operações de autenticação, perfil, gestão de utilizadores/perfis, todas as escritas de
  salários e alterações manuais do cartão de fidelização continuam online-only.

## Limitações funcionais conhecidas

Prioridade alta porque afectam dinheiro, segurança ou requisitos explícitos.

1. **Anulação de pagamento não reverte caixa nem comissão (RF09).** O pagamento fica
   `Anulado`, mas o movimento de caixa continua `Ativo` e a comissão continua `Elegivel`.
   O relatório `resumo` também conta pagamentos de atendimentos anulados (a query filtra
   apenas `pagamento.estado <> 'Anulado'`).
2. **Pagamento parcial é aceite (RF08).** O requisito diz que não há crédito nesta fase,
   mas o backend devolve `estado = "Parcial"` quando a soma é inferior ao devido.
3. **Troca de senha obrigatória não bloqueia acessos no servidor (RF01).** O flag
   `alteracao_obrigatoria_senha` é devolvido no login e o frontend redirecciona para
   `/primeiro-acesso`, mas a API continua a aceitar os restantes pedidos autenticados.
4. **Auditoria incompleta de contas (RF02/RF23).** Criar/editar/activar/desactivar contas e
   repor senhas não geram log; não existe “resultado da operação” nem registo de tentativas
   falhadas. As alterações de permissões e do próprio perfil são auditadas.
5. **Fecho de caixa do dia anterior (RF11).** Não há bloqueio de operações no dia seguinte
   nem procedimento administrativo documentado para corrigir um fecho errado.
6. **Permissão `estoque:escrever` em falta no seed.** As rotas de stock exigem essa
   permissão, mas ela não consta de `drizzle/0001_seed.sql`, pelo que nem o
   `Administrador` a recebe automaticamente. É necessário concedê-la manualmente ou
   acrescentá-la ao seed.
7. **Sem CRUD de produtos.** As tabelas de produto existem, mas não há endpoints nem
   interface para criar/editar produtos.

## Limitações de interface

8. **Stock parcial em `/despesas`.** A página consulta `GET /api/movimentos`, mas nunca
   carrega a lista de produtos (`produtosStock` fica vazia), pelo que o painel de stock
   aparece sempre vazio. As URLs de escrita de stock já foram alinhadas com o backend
   (`POST /api/entrada|saida|ajuste`), mas continua a faltar um CRUD/listagem de produtos.
9. **Sem página dedicada de caixa.** As operações existem por API e são usadas por
   atendimentos/despesas, mas não há ecrã próprio de abertura/fecho/levantamentos.
10. **Sem interface de salários.** Processamento, deduções, aprovação e pagamento só por
    API.
11. **Sem página de catálogo público.** A API pública existe; não há vista pública no
    frontend.
12. **Modalidades/aplicações de serviços** têm API; a interface cobre o essencial do CRUD
    de serviços, mas não expõe toda a gestão avançada.

## Limitações técnicas

13. **Sem testes automatizados.** Não existe suite de testes no backend nem no frontend;
    a verificação é manual, através de [testes-endpoints.md](./testes-endpoints.md).
14. **Offline depende de dados pré-carregados.** O modo offline cobre o app shell, as
    leituras já visitadas/pré-carregadas e as escritas não sensíveis. Ainda não existe
    resolução automática de conflitos entre dispositivos (as escritas são
    last-write-wins) nem sincronização em background quando a app está completamente
    fechada; a fila é sincronizada quando a aplicação volta a estar aberta e com rede.
    Erros definitivos (400/404/409) ficam marcados como falhados sem bloquear as
    restantes operações; erros transitórios (rede/5xx/429) são repetidos. Operações de
    autenticação, perfil, contas e **todas as escritas de salários** são online-only por
    segurança. O cache expira ao fim de 30 dias (10 dias para a sessão).
15. **Sem cópias de segurança (RF24).** Não há script de backup/restauro documentado.
16. **Duração da sessão inconsistente.** O JWT expira em 30 dias e o cookie em 10 dias.
17. **Paginação ausente.** As listagens devolvem arrays simples; não há paginação
    server-side (por decisão de projecto nesta fase).
18. **Logs heterogéneos.** Uso misto de `console.log`/`console.error`; nem todas as
    mensagens estão normalizadas.
19. **Histórico de horários não guardado.** A substituição da programação apaga as linhas
    anteriores; não há versão histórica (turnos rotativos continuam em decisão).

## Pendências de produto (Fase 16)

Das catorze decisões da análise de requisitos, treze continuam sem resposta (a
fidelização já ficou resolvida) e estão consolidadas na **Fase 16** de
[implementacao-backend.md](./implementacao-backend.md). Sem elas, algumas regras ficam
implementadas por interpretação:

- métodos de pagamento (2.º serviço móvel além de M-Pesa);
- adiantamentos/crédito do cliente (saldo, uso como meio de pagamento e devoluções);
- descontos (valor fixo, percentagem ou ambos);
- deduções salariais (automáticas ou manuais);
- âmbito das anulações (todos os administradores ou restrito por módulo);
- comissões em casos-limite (serviço gratuito, descontos, anulações);
- caixa (valor inicial, abertura e correção de um fecho incorreto);
- horários (turnos rotativos e horários excecionais);
- preço no catálogo público (fixo, inicial ou “variável”);
- formatos de exportação dos relatórios;
- migração de dados históricos;
- reservas de clientes;
- âmbito detalhado do stock.

## Segurança — acção recomendada

- O antigo ficheiro de cookies `Backend/E` (gerado por `curl`) continha um token JWT e já
  esteve versionado. O ficheiro foi removido, mas o token permanece no histórico do Git:
  **rode o `JWT_SECRET`** e, se necessário, limpe o histórico (`git filter-repo` / BFG).
- O `Backend/.env.example` continha credenciais reais de uma base Neon. Foi sanitizado para
  placeholders; **rode a palavra-passe dessa base** e confirme que o `.env` real nunca é
  comitado.

## Próximos passos sugeridos

1. Corrigir a anulação de pagamentos (caixa, comissão e relatórios).
2. Bloquear no servidor as rotas enquanto `alteracao_obrigatoria_senha = true`.
3. Acrescentar `estoque:escrever` ao seed e completar o painel de stock (carregar produtos
   e permitir entrada/saída/ajuste).
4. Auditar criação/edição/estado/reposição de senha de contas.
5. Criar CRUD de produtos e uma página de caixa.
6. Decidir as questões da Fase 16 e actualizar os requisitos.
7. Adicionar testes automatizados e scripts de backup/restauro.
