# Funcionalidades

[← Voltar ao índice](./README.md)

Descrição funcional de cada módulo, com o estado actual da implementação.

Legenda: ✅ implementado · 🟡 parcial (API pronta, interface incompleta) · ❌ ausente

---

## Autenticação e conta de utilizador ✅

- **Registo público** (`/register`): nome e telefone. Cria sempre a conta com o perfil
  `Usuario`, a **senha padrão `12345`** e `alteracao_obrigatoria_senha = true`. Não inicia
  sessão; a resposta devolve `senha_padrao` para ser mostrada ao utilizador.
- **Login** (`/login`): **nome de utilizador** + senha. Em caso de sucesso, emite o cookie
  `token` (`httpOnly`) e devolve as permissões efetivas e o flag `deve_alterar_senha`.
- **Primeiro acesso** (`/primeiro-acesso`): quando a conta ainda usa a senha padrão, a
  interface obriga a definir uma nova senha antes de entrar no dashboard.
  > O bloqueio é apenas no frontend; a API continua a aceitar pedidos autenticados
  > enquanto o flag estiver activo (ver [estado-e-pendencias.md](./estado-e-pendencias.md)).
- **Sessão**: a app verifica `GET /api/auth/me` no arranque.
- **Perfil** (`/perfil`): o utilizador actualiza nome/telefone (confirmação com a senha
  actual) e altera a própria senha.
- **Logout**: disponível na sidebar e no cabeçalho; limpa o cookie.

## Dashboard (`/dashboard`) ✅

Painel interno protegido por sessão, alimentado por `GET /api/dashboard`.

- Cartões do **mês actual**: receita, despesas e resultado, com comparação ao mês anterior.
- Indicadores operacionais: atendimentos de hoje/no mês, em andamento, pagos, clientes,
  funcionários e serviços activos, cartões de fidelização.
- Gráficos (Recharts): evolução de receita/despesas dos últimos seis meses, serviços mais
  realizados e profissionais em destaque.
- Lista de atendimentos recentes e resumo de fidelização do mês.

## Atendimentos (`/novoAtendimento`) ✅

- Lista (AG Grid) com filtros por período, estado, cliente e funcionário; detalhe do
  atendimento com serviços, totais, pagamentos e cartão de fidelização.
- **Novo atendimento** (modal): cliente, vários serviços, funcionário por linha, preço
  praticado, desconto e possibilidade de usar o 6.º serviço gratuito.
- Criação transaccional (`POST /api/atendimentos`); o preço fica gravado na linha.
- **Pagamentos** (`POST /api/atendimentos/:id/pagamentos`): várias parcelas e métodos
  (Dinheiro, M-Pesa, e-Mola, Cartão, Transferência, Outro); o pagamento liquidado gera
  comissões.
- **Descontos** (`POST /api/atendimentos/:id/descontos`), usado no modal e no detalhe.
- **Anulação** com motivo obrigatório (`POST /api/atendimentos/:id/anular`), sujeita à
  permissão `atendimentos:anular`.
- Edição do cabeçalho, conclusão e remoção de linhas de serviço.

## Clientes (`/clientes`) ✅

- CRUD completo (criar, editar, activar/desactivar e apagar) com pesquisa por nome,
  apelido ou telefone.
- Telefone único; cliente com atendimentos não pode ser apagado (`409`).
- Cartão de fidelização consultável a partir da lista.

## Serviços (`/servicos`) ✅

- CRUD de serviços (nome, valor, categoria, descrição, público-alvo adulto/criança,
  tipo de preço e elegibilidade para fidelização), com activação/desactivação.
- Histórico de preços e modalidades de preço por serviço.
- Aplicações/variações associadas a um serviço principal.
- Serviço usado em atendimentos não pode ser apagado (`409`).
- Serviços elegíveis para fidelização não podem custar mais de **200 MT**.

## Categorias de serviço (`/categorias`) ✅

- CRUD de categorias (`Cabelo`, `Barba`, `Unhas`, `Estética`, etc.).
- Categoria com serviços associados não pode ser apagada (`409`).

## Funcionários (`/funcionarios`) ✅

- CRUD (nome, salário, telefone, documento, cargo, data de admissão e comissão), com
  activação/desactivação.
- Comissão geral e configuração por serviço.
- Consulta do desempenho e das comissões do período.

## Horários e assiduidade (`/horarios`) ✅

- Programação semanal por funcionário, com vários turnos por dia e validação de
  sobreposição.
- Página de **controlo mensal**: entrada/saída reais por dia, horas trabalhadas, horas
  previstas (base `09:00–19:00`) e percentagem de efectividade.
- Gravação através de `PUT /api/assiduidade/dia` (cria ou actualiza o par
  `funcionario` + `data` sem duplicar) e correcção de ocorrências.
- Acesso à programação de qualquer funcionário requer `horarios:gerir`; a página exige
  `assiduidade:gerir`.

## Despesas (`/despesas`) 🟡

- CRUD de despesas com categoria, data, método de pagamento, comprovativo e itens
  (produto, funcionário, quantidade e preço unitário).
- Despesa associada a uma sessão de caixa gera automaticamente a saída.
- Categorias de despesa (`GET/POST /api/categorias-despesa`).
- **Stock na interface é parcial:** a página consulta os movimentos
  (`GET /api/movimentos`), mas a lista de produtos não é carregada, pelo que o painel de
  stock aparece vazio. A API de stock está completa (ver abaixo).

## Stock (API) 🟡 · interface ❌

- `GET /api/movimentos` — movimentos com filtros por produto, tipo e datas.
- `GET /api/stock/:produto_id` — resumo calculado a partir dos movimentos (entradas,
  saídas e ajustes) e stock mínimo do produto.
- `POST /api/entrada` · `POST /api/saida` · `POST /api/ajuste` — requerem
  `estoque:escrever`.
  > A permissão `estoque:escrever` **não consta** do seed `0001_seed.sql`; é necessário
  > concedê-la manualmente (ver pendências).
  > O `services/api.js` do frontend aponta para `/api/estoque/*`, que **não existe** no
  > backend; as acções de stock falham com `404` até a URL ser corrigida.
- Não existe CRUD de produtos na API/interface (as tabelas de produto existem na base de
  dados).

## Caixa 🟡 · API completa, sem página própria

- Caixa único (`Caixa Principal`), abertura com saldo inicial, consulta do saldo esperado,
  levantamentos, movimentos e fecho com contagem/diferença.
- Pagamentos geram entradas; despesas pagas pelo caixa geram saídas (idempotentes por
  `referencia_id`).
- Operações sujeitas a `caixa:operar`, `caixa:levantar` e `caixa:fechar`.
  > Não existe página dedicada de caixa; as operações estão disponíveis por API e são
  > usadas pelos módulos de atendimentos/despesas.

## Fidelização ✅

- Cartão de 5 marcas para clientes de ambos os sexos.
- Só contam serviços marcados como elegíveis e com valor até **200 MT**.
- Uma marca por dia por atendimento; marcas manuais (cartões físicos) entram no mesmo ciclo.
- Ao completar 5/5, o **6.º serviço é obrigatoriamente gratuito** e o ciclo reinicia em 0/5.
- Benefício não acumula; enquanto pendente, o próximo atendimento com serviços elegíveis
  tem de indicar exactamente um deles como gratuito.
- Correcção de fidelização auditada e preenchimento/remoção manual restritos ao
  `Administrador` (`GET/POST/DELETE` em `/api/clientes/:id/fidelizacao/...`).

## Salários 🟡 · API completa, sem interface própria

- Processamento mensal (`AAAA-MM`) de todos os funcionários activos:
  `salário base + comissões − deduções`.
- Deduções configuráveis, aprovação (`salarios:aprovar`) e pagamento; ao pagar, as
  comissões do período passam a `Paga`.
- Sem interface dedicada; operações disponíveis por API.

## Relatórios (`/relatorio`) ✅

- Página com filtro de período, resumo executivo, gráficos (Recharts), tabelas e
  **exportação CSV** e **impressão/PDF pelo browser**.
- Endpoints: `resumo`, `financeiro`, `caixa`, `servicos`, `funcionarios`, `assiduidade`,
  `clientes`, `fidelizacao`, `anulacoes` e `movimentos` (todos com `de`/`ate` opcionais).
- O relatório **financeiro** agrega receitas, despesas, fluxo e comparação com o período
  anterior.

## Gestão de utilizadores (`/gestao-utilizadores`) ✅

- Restrita a `contas:gerir` (por omissão, `Administrador`).
- Lista, cria, edita e activa/desactiva contas; repõe a senha para o valor padrão `12345`.
- Criação sem `senha` usa também `12345` e obriga à troca no próximo acesso.
- Gestão de permissões individuais (conceder/revogar) além das do perfil.

## Permissões (`/permissoes`) ✅

- Restrita a `contas:gerir`.
- Mostra o catálogo de permissões e a matriz por perfil, permitindo editar as permissões
  de cada perfil (`PUT /api/perfis/:id/permissoes`).
- A decisão real de acesso é sempre do backend (`authorize` / `authorizePermission`).

## Auditoria (`/logs`) ✅

- Restrita a `auditoria:ler` (`Administrador` e `Auditor`).
- Consulta com filtros por entidade, utilizador, perfil, operação e período.
- Registo **append-only** (trigger na base de dados bloqueia `UPDATE`/`DELETE`).

## Catálogo público (API) ✅ · interface ❌

- `GET /api/public/servicos` e `GET /api/public/servicos/:id`, sem autenticação.
- Expõe apenas serviços activos e campos de divulgação (nome, descrição, valor, duração,
  tipo de preço e categoria); nunca dados de clientes/funcionários/custos.
- Não existe página pública no frontend.

## Cópias de segurança e modo offline ❌

- Não existem scripts de backup/restauro nem suporte offline/sincronização.
  Estão previstos na análise de requisitos (RF24/RF25), mas não implementados.

---

## Fluxos-chave

### Entrar no sistema

```
/register → POST /api/auth/register → conta criada com senha 12345
/login    → authStore.login() → POST /api/auth/login → cookie token
          → deve_alterar_senha? /primeiro-acesso : /
```

### Verificar sessão ao abrir a app

```
RequireAuth → authStore.checkAuth() → GET /api/auth/me
            → user presente: mostra página | ausente: redireciona /login
```

### Registar e pagar um atendimento

```
Novo Atendimento → POST /api/atendimentos (transacção)
                 → POST /api/atendimentos/:id/pagamentos
                 → pagamento Liquidado → atendimento Pago → comissões geradas
                 → movimentos de caixa e marcas de fidelização
```

### Gerir um recurso administrativo (ex.: serviço)

```
utilizador com servicos:escrever → POST /api/servicos
   routes/servico.js (authenticate, authorizePermission) → controller
   → repository/service → 201
```
