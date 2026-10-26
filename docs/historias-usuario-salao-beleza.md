# Backlog de Histórias de Usuário — Sistema de Gestão de Salão de Beleza

> 📌 **Nota de implementação:** este backlog descreve o comportamento **esperado**. O
> estado real de cada módulo está em [funcionalidades.md](./funcionalidades.md) e as
> lacunas conhecidas em [estado-e-pendencias.md](./estado-e-pendencias.md). Itens como
> off-line, reservas e exportação PDF gerada no servidor ainda não estão implementados; a
> impressão/PDF pelo browser já existe.

---

## Épico 1: Gestão de Atendimento

### HU-01 — Registro de serviço de cliente no atendimento
**Como** recepcionista/atendente,
**quero** registrar o serviço solicitado por um cliente no momento do atendimento,
**para que** o salão tenha controle de quais serviços estão sendo prestados e a quem.

**Critérios de aceitação:**
- Dado que estou na tela de atendimento, quando seleciono um cliente já cadastrado, então o sistema exibe seus dados básicos (nome, telefone, histórico recente).
- Dado que selecionei um cliente, quando escolho um ou mais serviços do catálogo, então o sistema calcula automaticamente o valor total do atendimento.
- Dado que selecionei os serviços, quando escolho o funcionário responsável, então o sistema associa o atendimento a esse profissional.
- Dado que finalizo o registro, quando confirmo, então o atendimento é salvo com status "Em andamento" ou "Concluído".
- O sistema não permite salvar um atendimento sem cliente, sem serviço e sem funcionário associado.

**Regras de negócio:**
- RN01: Um atendimento deve estar sempre vinculado a um cliente cadastrado.
- RN02: Um atendimento pode conter um ou mais serviços.
- RN03: Cada serviço do atendimento deve ter um funcionário responsável (pode haver funcionários diferentes por serviço).
- RN04: O valor do atendimento é calculado com base na tabela de preços vigente dos serviços selecionados.
- RN05: Atendimentos só podem ser registrados para clientes ativos no sistema.

---

### HU-02 — Registro de pagamento
**Como** recepcionista/caixa,
**quero** registrar o pagamento de um atendimento,
**para que** o salão controle o faturamento e a quitação dos serviços prestados.

**Critérios de aceitação:**
- Dado um atendimento concluído, quando acesso a opção de pagamento, então o sistema exibe o valor total a pagar.
- Dado que informo a forma de pagamento (dinheiro, cartão, pix, etc.), quando confirmo, então o sistema registra o pagamento e atualiza o status do atendimento para "Pago".
- Dado um pagamento parcial, quando registro o valor pago, então o sistema calcula e exibe o saldo restante.
- Dado que o pagamento é concluído, quando confirmo, então o sistema gera um comprovante/recibo.
- O sistema impede registrar pagamento com valor maior que o total devido, salvo quando se tratar de gorjeta/acréscimo explicitamente informado.

**Regras de negócio:**
- RN06: Um pagamento deve estar sempre associado a um atendimento válido.
- RN07: São aceitas múltiplas formas de pagamento em um mesmo atendimento (pagamento misto).
- RN08: Um atendimento com saldo pendente não pode ser marcado como "Finalizado/Pago".
- RN09: Toda transação de pagamento deve gerar registro com data, hora e responsável pelo caixa.
- RN10: O valor da comissão do funcionário (ver HU de comissão) só é considerado "confirmado" após o pagamento ser efetivado.

---

### HU-03 — Consultar estado de cliente
**Como** recepcionista/gerente,
**quero** consultar o estado (situação) de um cliente,
**para que** eu saiba seu histórico de atendimentos, pagamentos pendentes e status geral.

**Critérios de aceitação:**
- Dado que pesquiso por nome, telefone ou código do cliente, quando o sistema encontra o registro, então exibe seus dados e estado atual (ativo/inativo, pendências).
- Dado um cliente com pagamentos em aberto, quando consulto seu estado, então o sistema destaca o valor pendente.
- Dado um cliente sem atendimentos, quando consulto, então o sistema informa "sem histórico de atendimentos".
- A consulta deve permitir filtrar por período (últimos atendimentos).

**Regras de negócio:**
- RN11: O estado do cliente é composto por: status cadastral (ativo/inativo), histórico de atendimentos e situação financeira (pendências).
- RN12: Clientes com pendência financeira acima de um limite configurável podem ser sinalizados como "restrição" para novos atendimentos a crédito.

---

## Épico 2: Gestão de Serviço

### HU-04 — Registro de serviço
**Como** administrador/gerente,
**quero** cadastrar novos serviços oferecidos pelo salão,
**para que** eles fiquem disponíveis para seleção nos atendimentos.

**Critérios de aceitação:**
- Dado que informo nome, descrição, preço, duração e categoria do serviço, quando confirmo, então o serviço é salvo e disponibilizado no catálogo.
- O sistema não permite cadastrar serviço sem nome ou sem preço.
- O sistema não permite dois serviços ativos com nome idêntico.

**Regras de negócio:**
- RN13: Todo serviço deve ter preço maior que zero.
- RN14: Serviços podem ser categorizados (ex.: cabelo, unhas, estética) para facilitar a busca.
- RN15: Alterações de preço não afetam atendimentos já registrados anteriormente (histórico preserva o preço praticado na época).

---

### HU-05 — Consultar registro (de serviço)
**Como** funcionário/gerente,
**quero** consultar os serviços cadastrados,
**para que** eu possa verificar informações como preço, duração e disponibilidade.

**Critérios de aceitação:**
- Dado que acesso a lista de serviços, quando aplico filtros (nome, categoria, status), então o sistema exibe os resultados correspondentes.
- Dado que seleciono um serviço, quando visualizo o detalhe, então o sistema mostra todas as informações cadastradas.

**Regras de negócio:**
- RN16: Apenas serviços ativos aparecem por padrão nas telas de seleção de atendimento; serviços inativos só aparecem em consultas administrativas.

---

### HU-06 — Eliminar registro (de serviço)
**Como** administrador,
**quero** excluir ou inativar um serviço,
**para que** serviços descontinuados não fiquem disponíveis para novos atendimentos.

**Critérios de aceitação:**
- Dado um serviço sem vínculo com atendimentos, quando solicito exclusão, então o sistema remove definitivamente o registro.
- Dado um serviço já utilizado em atendimentos anteriores, quando solicito exclusão, então o sistema impede a exclusão física e oferece a opção de inativação.
- O sistema solicita confirmação antes de excluir/inativar.

**Regras de negócio:**
- RN17: Serviços com histórico de uso não podem ser fisicamente excluídos, apenas inativados (para preservar integridade dos relatórios).
- RN18: Serviço inativado não pode ser selecionado em novos atendimentos.

---

### HU-07 — Editar serviço
**Como** administrador,
**quero** editar as informações de um serviço existente,
**para que** os dados (preço, duração, descrição) estejam sempre atualizados.

**Critérios de aceitação:**
- Dado um serviço existente, quando altero seus dados e confirmo, então o sistema salva as alterações e mantém um registro da data da mudança.
- Dado que altero o preço, quando salvo, então a alteração só vale para atendimentos futuros.

**Regras de negócio:**
- RN19: Todo serviço deve manter no mínimo nome e preço preenchidos após a edição.
- RN20: O histórico de alterações de preço deve ser mantido para fins de auditoria.

---

## Épico 3: Gestão de Pessoas

### HU-08 — Registro de funcionário
**Como** administrador,
**quero** cadastrar um novo funcionário,
**para que** ele possa ser associado a atendimentos e comissões.

**Critérios de aceitação:**
- Dado que informo nome, cargo, contato e dados de comissão, quando confirmo, então o funcionário é cadastrado com status "Ativo".
- O sistema não permite cadastro duplicado (mesmo CPF/documento).
- Campos obrigatórios: nome, documento de identificação, cargo.

**Regras de negócio:**
- RN21: O documento de identificação do funcionário deve ser único no sistema.
- RN22: Um funcionário recém-cadastrado entra com status "Ativo" por padrão.

---

### HU-09 — Editar funcionário
**Como** administrador,
**quero** editar os dados de um funcionário,
**para que** as informações cadastrais permaneçam corretas e atualizadas.

**Critérios de aceitação:**
- Dado um funcionário existente, quando altero seus dados e confirmo, então o sistema salva as alterações.
- O sistema impede deixar campos obrigatórios (nome, documento) em branco.

**Regras de negócio:**
- RN23: O documento de identificação não pode ser alterado para um valor já existente em outro funcionário.

---

### HU-10 — Eliminar funcionário
**Como** administrador,
**quero** remover ou inativar um funcionário,
**para que** ele deixe de ser associado a novos atendimentos.

**Critérios de aceitação:**
- Dado um funcionário sem atendimentos vinculados, quando solicito exclusão, então o sistema remove o registro definitivamente.
- Dado um funcionário com histórico de atendimentos, quando solicito exclusão, então o sistema impede exclusão física e oferece inativação.

**Regras de negócio:**
- RN24: Funcionário com histórico não pode ser excluído fisicamente, apenas inativado.
- RN25: Funcionário inativo não pode ser selecionado em novos atendimentos, mas seu histórico permanece visível em relatórios.

---

### HU-11 — Consultar funcionário
**Como** administrador/gerente,
**quero** consultar os dados e desempenho de um funcionário,
**para que** eu possa acompanhar produtividade e comissões.

**Critérios de aceitação:**
- Dado que pesquiso por nome ou cargo, quando o sistema encontra resultados, então exibe a lista de funcionários correspondentes.
- Dado que seleciono um funcionário, quando visualizo o detalhe, então o sistema mostra dados cadastrais, serviços realizados e comissões acumuladas.

**Regras de negócio:**
- RN26: Relatórios de desempenho devem considerar apenas atendimentos com pagamento confirmado.

---

### HU-12 — Definir comissão de funcionário
**Como** administrador,
**quero** definir a comissão de cada funcionário,
**para que** o pagamento por serviço prestado seja calculado corretamente.

**Critérios de aceitação:**
- Dado um funcionário cadastrado, quando defino um percentual ou valor fixo de comissão (geral ou por tipo de serviço), então o sistema salva essa configuração.
- Dado um atendimento pago, quando o sistema calcula a comissão, então utiliza o percentual/valor vigente na data do atendimento.
- O sistema não permite comissão negativa ou superior a 100% (quando percentual).

**Regras de negócio:**
- RN27: A comissão pode ser definida de forma geral (por funcionário) ou específica (por funcionário + tipo de serviço), prevalecendo a regra mais específica.
- RN28: Comissões só são calculadas sobre atendimentos com pagamento confirmado.
- RN29: Alterações na comissão não afetam atendimentos já pagos anteriormente.

---

### HU-13 — Registrar cliente
**Como** recepcionista,
**quero** cadastrar um novo cliente,
**para que** ele possa ser atendido e ter seu histórico registrado.

**Critérios de aceitação:**
- Dado que informo nome, telefone e (opcionalmente) e-mail/data de nascimento, quando confirmo, então o cliente é cadastrado com status "Ativo".
- O sistema não permite cadastro duplicado com o mesmo telefone.

**Regras de negócio:**
- RN30: Nome e telefone são campos obrigatórios no cadastro do cliente.
- RN31: Telefone é utilizado como identificador único do cliente.

---

### HU-14 — Consultar cliente
**Como** recepcionista/gerente,
**quero** consultar os dados de um cliente,
**para que** eu tenha acesso rápido às informações de contato e histórico.

**Critérios de aceitação:**
- Dado que pesquiso por nome, telefone ou código, quando o sistema encontra correspondência, então exibe os dados do cliente.
- Dado que seleciono um cliente, quando acesso o detalhe, então o sistema exibe histórico de atendimentos e pagamentos.

**Regras de negócio:**
- RN32: A busca deve funcionar mesmo com correspondência parcial do nome ou telefone.

---

### HU-15 — Editar cliente
**Como** recepcionista,
**quero** editar os dados de um cliente,
**para que** as informações de contato estejam sempre atualizadas.

**Critérios de aceitação:**
- Dado um cliente existente, quando altero seus dados e confirmo, então o sistema salva as alterações.
- O sistema impede salvar sem nome ou telefone preenchidos.

**Regras de negócio:**
- RN33: O telefone não pode ser alterado para um valor já cadastrado em outro cliente ativo.

---

### HU-16 — Eliminar cliente
**Como** administrador,
**quero** remover ou inativar um cliente,
**para que** clientes que não frequentam mais o salão não apareçam nas buscas ativas.

**Critérios de aceitação:**
- Dado um cliente sem atendimentos vinculados, quando solicito exclusão, então o sistema remove o registro definitivamente.
- Dado um cliente com histórico de atendimentos, quando solicito exclusão, então o sistema impede exclusão física e oferece inativação.

**Regras de negócio:**
- RN34: Cliente com histórico não pode ser excluído fisicamente, apenas inativado, para preservar o histórico de atendimentos e faturamento.

---

## Épico 4: Gestão de Despesas

### HU-17 — Registrar empréstimo
**Como** administrador/financeiro,
**quero** registrar um empréstimo contraído (ou concedido) pelo salão,
**para que** eu tenha controle das obrigações financeiras e do fluxo de caixa.

**Critérios de aceitação:**
- Dado que informo valor, data, credor/devedor, taxa (se houver) e condições de pagamento, quando confirmo, então o empréstimo é registrado com status "Em aberto".
- Dado um empréstimo registrado, quando registro uma parcela paga, então o sistema atualiza o saldo devedor.
- Dado que o saldo devedor chega a zero, quando o sistema verifica, então altera automaticamente o status para "Quitado".

**Regras de negócio:**
- RN35: Todo empréstimo deve ter valor maior que zero e data de registro.
- RN36: O sistema deve calcular e exibir o saldo devedor atualizado a cada pagamento de parcela.
- RN37: Empréstimos quitados não podem receber novos pagamentos.

---

### HU-18 — Registrar despesa
**Como** administrador/financeiro,
**quero** registrar as despesas do salão (aluguel, produtos, contas, etc.),
**para que** eu tenha controle dos custos operacionais.

**Critérios de aceitação:**
- Dado que informo descrição, categoria, valor e data da despesa, quando confirmo, então a despesa é registrada.
- Dado que a despesa é recorrente (ex.: aluguel mensal), quando marco essa opção, então o sistema pode gerar lançamentos futuros automaticamente.
- O sistema não permite registrar despesa com valor zero ou negativo.

**Regras de negócio:**
- RN38: Toda despesa deve ser associada a uma categoria (ex.: fixa, variável, produtos, salários).
- RN39: Despesas registradas entram no cálculo do balanço financeiro do período (receitas de atendimentos − despesas − empréstimos).
- RN40: Apenas usuários com perfil administrativo/financeiro podem registrar ou editar despesas.

---

## Observações gerais (transversais a todos os épicos)
- Todas as operações de cadastro/edição/exclusão devem registrar usuário responsável e data/hora (log de auditoria).
- Exclusões físicas só são permitidas quando não há vínculo com outros registros (atendimentos, pagamentos, comissões); caso contrário, aplica-se inativação lógica.
- Todos os campos monetários devem aceitar apenas valores numéricos positivos, com validação antes de salvar.
