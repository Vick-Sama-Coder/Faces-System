# Controlo Mensal de Horários — Fase 1

> 📌 **Nota:** este resumo descreve apenas a entrega do controlo mensal de horários. Para
> o estado geral do projecto, consulte [docs/estado-e-pendencias.md](./docs/estado-e-pendencias.md)
> e [docs/funcionalidades.md](./docs/funcionalidades.md).

## Estado

- Página `/horarios` transformada em **controlo mensal de entrada/saída**.
- Base diária fixa: **09:00–19:00 = 10 horas**, em todos os dias do mês.
- Dias sem entrada e saída **não entram** nas horas previstas (mesma regra da folha Excel).
- Sem desconto de intervalo de almoço.
- Frontend buildado e ESLint sem erros nos ficheiros alterados.
- API validada com **29 verificações E2E** numa base de dados temporária.
- Backend de produção reiniciado na porta `5000` com as novas rotas.

## Frontend

- `HorarioPage` com seletor de mês e de funcionário.
- Tabela diária com todos os dias do mês (`28`, `29`, `30` ou `31`), incluindo:
  - entrada e saída reais;
  - horas trabalhadas;
  - horas não trabalhadas (diferença para as 10h);
  - horas previstas;
  - estado do registo.
- Totais mensais e percentagem de efetividade.
- Cartões de resumo: horas trabalhadas, não trabalhadas, previstas e efetividade.
- Resumo da equipa por funcionário, com seleção direta da linha.
- Alterações locais marcadas como “Por guardar”; botão **Guardar alterações**.
- Confirmação antes de mudar de mês/funcionário com alterações por guardar.
- Aviso do browser ao sair com alterações por guardar.
- Validação de horas no cliente e estados de carregamento, erro, sucesso e vazio.
- Rota `/horarios` protegida por `assiduidade:gerir`.

## Backend

- `PUT /api/assiduidade/dia` — cria ou atualiza o par `(funcionario_id, data)` sem duplicar.
  - `201` ao criar; `200` ao atualizar.
  - Aceita registo parcial (apenas entrada ou apenas saída).
  - `null` limpa a hora correspondente.
  - Preserva `tipo_ocorrencia` e `justificacao` existentes.
  - Valida data ISO real, formato `HH:MM` e saída posterior à entrada.
  - Auditoria com valores antes/depois.
- `GET /api/assiduidade?de=&ate=` devolve o mês para todos os funcionários; a data é
  formatada como `AAAA-MM-DD`.
- `PUT /api/assiduidade/:id` continua disponível para correções pontuais e agora aceita
  `null` para limpar horas.
- Erros de chave estrangeira do Drizzle são traduzidos para `400 Funcionario nao encontrado`.
- O modelo semanal `horario_funcionario` e as respetivas rotas mantêm-se disponíveis para
  RF15, mas a página mensal não depende deles.

## Testes executados

- 29 verificações E2E: autenticação, permissões, validação de corpo/data/horas, criação,
  atualização idempotente, limpeza de horas, registo parcial, filtros por mês/funcionário,
  preservação de ocorrências, duplicado no `POST` (`409`) e endpoint legado por ID.
- `npm run build` no Frontend.
- ESLint sem erros nos ficheiros alterados.
- Auditoria confirmada na base temporária: 3 operações `criar` e 5 `atualizar`.

## Pendente para fase 2

- Configuração de horário base por funcionário e dias de folga.
- Vigência/histórico de horários e vista semanal/calendário.
- Interface para ocorrências de assiduidade (atrasos, faltas, saídas antecipadas).
- Turnos que atravessam a meia-noite.
- Configuração de intervalo de almoço e exportação do controlo mensal.
- Integração explícita com o processamento salarial.
