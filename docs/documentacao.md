# DOCUMENTO DE ANÁLISE DE REQUISITOS
## Sistema de Gestão de Salão de Beleza

**Versão:** 1.0 — Documento de análise inicial consolidado  
**Data:** 16 de outubro de 2026  
**Tipo de documento:** Análise funcional, regras de negócio e especificação técnica preliminar  
**Estado:** Requisitos consolidados, com algumas decisões pendentes de validação

> 📌 **Nota de implementação:** este documento descreve os requisitos **esperados** do
> produto. Para o que já está implementado e para as lacunas conhecidas, consulte
> [estado-e-pendencias.md](./estado-e-pendencias.md), [funcionalidades.md](./funcionalidades.md)
> e [api.md](./api.md). Algumas decisões continuam em aberto (ver Fase 16 de
> [implementacao-backend.md](./implementacao-backend.md)).

---

# 1. Introdução

## 1.1. Contextualização

O salão de beleza necessita de um sistema informatizado que centralize a gestão dos seus clientes, funcionários, serviços, pagamentos, caixa, despesas, salários, comissões, assiduidade e cartões de fidelização.

Atualmente, parte das informações é registada manualmente em cadernos, o que dificulta a consulta do histórico dos clientes, o acompanhamento financeiro, o controlo das comissões, a gestão dos horários e a produção de relatórios.

A ausência de centralização também dificulta a verificação dos movimentos financeiros e a identificação dos responsáveis pelas operações realizadas.

O sistema proposto deverá substituir progressivamente os registos manuais, permitindo que as operações do salão sejam registadas num único ambiente, com controlo de acesso, histórico das alterações e mecanismos de recuperação dos dados.

## 1.2. Problema

A gestão baseada em registos manuais apresenta dificuldades relacionadas com:

- Dispersão dos dados dos clientes e dos serviços prestados.
- Dificuldade em consultar o histórico de atendimento de cada cliente.
- Controlo insuficiente dos pagamentos e movimentos de caixa.
- Dificuldade em calcular e verificar as comissões dos funcionários.
- Falta de centralização dos salários e da assiduidade.
- Controlo manual dos cartões e benefícios de fidelização.
- Dificuldade em calcular receitas, despesas e resultados financeiros.
- Ausência de relatórios consolidados.
- Dificuldade em identificar quem alterou ou anulou determinada operação.
- Risco de perda de informações registadas em papel.

## 1.3. Solução proposta

Desenvolver um sistema de gestão para um único salão de beleza, com interface web, base de dados local e possibilidade de sincronização com uma base de dados online.

O sistema deverá permitir a gestão operacional diária do salão, mantendo os dados organizados e protegidos por perfis de acesso e permissões individuais.

A solução deverá funcionar inicialmente com ligação à Internet e evoluir para um modelo em que as operações essenciais possam continuar mesmo sem ligação, sincronizando as alterações quando a Internet regressar.

## 1.4. Objetivo geral

Desenvolver um sistema integrado para automatizar e centralizar a gestão operacional, financeira e administrativa do salão de beleza.

## 1.5. Objetivos específicos

1. Centralizar os dados dos clientes, funcionários e serviços.
2. Registar os serviços realizados e os respetivos pagamentos.
3. Controlar a entrada e saída de dinheiro.
4. Automatizar o cálculo das comissões e apoiar o processamento salarial.
5. Registar a assiduidade e gerir os horários dos funcionários.
6. Implementar o cartão de fidelização para serviços elegíveis até 200 MT, aplicável a ambos os sexos.
7. Registar as despesas com produtos utilizados nos serviços.
8. Produzir relatórios operacionais e financeiros.
9. Controlar os acessos através de perfis e permissões individuais.
10. Manter um histórico auditável das alterações.
11. Permitir o funcionamento offline e a sincronização posterior.
12. Facilitar a migração progressiva dos dados atualmente registados em cadernos.

---

# 2. Caracterização do negócio

## 2.1. Tipo de estabelecimento

O sistema será inicialmente desenvolvido para um único salão de beleza.

Não está prevista, nesta primeira fase, a gestão de múltiplas filiais.

## 2.2. Horário de funcionamento

O salão funciona de segunda-feira a sábado, das 09h00 às 20h00.

O horário geral do estabelecimento não substitui os horários individuais dos funcionários. Cada funcionário poderá ter dias de trabalho, folgas e horários definidos pelo administrador responsável pela programação.

## 2.3. Serviços oferecidos

O catálogo inicial contempla:

- Cortes de cabelo.
- Manicure.
- Pedicure.
- Depilação.
- Tranças.
- Dreads/locs.

Os serviços deverão ser configurados no sistema, com nome, descrição, estado de disponibilidade e informações de preço.

Os preços poderão ser fixos ou variar conforme as características do serviço.

## 2.4. Utilização de produtos

O salão utiliza produtos na realização dos serviços, mas não vende produtos diretamente aos clientes.

Na primeira fase, o sistema deverá registar as despesas relacionadas com a compra desses produtos.

O controlo detalhado do stock, incluindo quantidades, entradas, saídas, consumo, perdas e alertas de reposição, ficará para uma fase posterior.

## 2.5. Utilizadores do negócio

O sistema deverá distinguir dois conceitos:

**Funcionário:** pessoa que trabalha no salão e pode ter horário, assiduidade, salário, comissões e serviços realizados.

**Utilizador do sistema:** pessoa que possui uma conta de acesso à aplicação.

Uma pessoa pode ser simultaneamente funcionário e utilizador. Contudo, poderá existir um utilizador administrador que não seja funcionário e, por isso, não receba salário nem comissão.

---

# 3. Âmbito do sistema

## 3.1. Funcionalidades incluídas na primeira fase

O sistema deverá contemplar:

- Autenticação e gestão de contas.
- Perfis e permissões.
- Gestão de clientes.
- Gestão de funcionários.
- Gestão de serviços.
- Registo de atendimentos e serviços realizados.
- Registo de pagamentos.
- Gestão do caixa.
- Registo de despesas com produtos.
- Gestão de salários e comissões.
- Gestão da assiduidade.
- Programação dos horários dos funcionários.
- Cartões e benefícios de fidelização.
- Relatórios operacionais e financeiros.
- Logs de auditoria.
- Catálogo público de serviços.
- Cópias de segurança.
- Preparação para funcionamento offline e sincronização.
- Migração manual dos dados antigos.

## 3.2. Funcionalidades adiadas

As seguintes funcionalidades não deverão ser consideradas obrigatórias para a primeira versão:

- Gestão completa de stock.
- Venda de produtos a clientes.
- Empréstimos e adiantamentos a funcionários.
- Portal pessoal para clientes.
- Agendamento online de clientes, caso venha a ser necessário.
- Gestão de múltiplas filiais.
- Integração automática com serviços externos de pagamento.
- Metas financeiras avançadas.
- Aplicação móvel nativa.

A arquitetura poderá ser preparada para futuras extensões, sem tornar a primeira versão desnecessariamente complexa.

---

# 4. Perfis de utilizadores e controlo de acesso

## 4.1. Princípio geral

O acesso deverá ser controlado através de perfis e permissões.

O perfil define as permissões padrão de um conjunto de utilizadores. Adicionalmente, o administrador autorizado poderá conceder ou retirar permissões específicas a determinados utilizadores.

A autorização deverá ser verificada no servidor, não apenas através da interface.

## 4.2. Perfil de funcionário

O funcionário comum poderá, conforme as permissões atribuídas:

- Iniciar sessão.
- Consultar os seus dados pessoais profissionais.
- Consultar os seus horários.
- Consultar a sua assiduidade.
- Consultar os serviços que realizou.
- Consultar as suas comissões.
- Consultar as informações salariais a que tiver acesso.
- Registar clientes.
- Registar serviços realizados e pagamentos.
- Consultar informações necessárias ao atendimento.

O funcionário comum não deverá poder:

- Criar ou administrar contas de outros utilizadores.
- Criar funcionários.
- Alterar o catálogo de serviços sem permissão.
- Registar despesas de compra de produtos sem autorização.
- Efetuar levantamentos de caixa.
- Alterar salários ou comissões calculadas.
- Anular serviços ou pagamentos sem autorização administrativa.
- Consultar informações financeiras restritas a outros funcionários.

## 4.3. Perfil de administrador

Os administradores poderão receber permissões para:

- Gerir clientes.
- Criar e alterar serviços.
- Gerir funcionários.
- Registar despesas com produtos.
- Efetuar levantamentos de caixa.
- Anular registos.
- Consultar relatórios.
- Gerir cartões de fidelização.
- Consultar movimentos financeiros.
- Gerir contas e permissões, quando autorizados.

As permissões efetivas dependerão da configuração do perfil e das exceções individuais.

## 4.4. Administrador principal

O administrador principal será um utilizador com permissões adicionais de gestão e supervisão.

Deverá poder, conforme a configuração aprovada:

- Gerir os perfis e permissões.
- Consultar a informação financeira global.
- Consultar os logs de auditoria.
- Gerir configurações críticas.
- Supervisionar as operações administrativas.

O administrador principal não precisa de ser funcionário do salão.

## 4.5. Administrador responsável pelos horários e salários

Deverá existir um utilizador autorizado para gerir a programação dos funcionários e o processamento salarial.

As suas responsabilidades poderão incluir:

- Definir os horários.
- Registar e rever a assiduidade.
- Consultar comissões.
- Preparar o processamento salarial.
- Rever descontos e deduções.
- Aprovar os valores finais.
- Registar os pagamentos dos salários.

Este utilizador pode acumular outras funções administrativas, dependendo das permissões atribuídas.

## 4.6. Perfil de auditor

O auditor deverá poder consultar:

- Logs de auditoria.
- Relatórios financeiros.
- Movimentos de caixa.
- Informações necessárias à verificação das operações.

O auditor terá acesso de consulta, sem permissão para modificar registos financeiros ou apagar os logs de auditoria.

A sua função será verificar a integridade das operações e identificar alterações, anulações e discrepâncias.

## 4.7. Matriz inicial de permissões

| Operação | Funcionário | Administrador autorizado | Auditor |
|---|---|---|---|
| Consultar os próprios dados | Sim | Sim | Conforme autorização |
| Registar clientes | Sim | Sim | Não, por padrão |
| Registar serviços e pagamentos | Sim | Sim | Não |
| Criar e alterar serviços | Não, por padrão | Sim | Não |
| Criar funcionários | Não | Conforme permissão | Não |
| Configurar horários | Não | Responsável autorizado | Consulta, se autorizado |
| Registar despesas com produtos | Não | Sim | Consulta |
| Efetuar levantamentos | Não | Sim | Consulta |
| Anular registos | Não | Sim | Não |
| Consultar relatórios financeiros | Restrito | Sim | Sim |
| Gerir contas | Não | Conforme permissão | Não |
| Consultar logs | Conforme autorização | Sim | Sim |
| Alterar ou apagar logs | Não | Não | Não |

A matriz é uma configuração inicial proposta. O sistema deverá permitir ajustar as permissões por perfil e por utilizador.

---

# 5. Requisitos funcionais

## RF01 — Autenticação

O sistema deverá permitir o início de sessão através de credenciais individuais.

Cada conta deverá possuir um identificador de utilizador e uma palavra-passe protegida através de hash seguro.

A aplicação deverá:

- Validar as credenciais.
- Impedir o acesso não autorizado.
- Identificar o utilizador autenticado.
- Aplicar as permissões correspondentes.
- Permitir terminar sessão.
- Expirar sessões após um período de inatividade configurável.
- Exigir a alteração da palavra-passe no primeiro acesso, quando a conta for criada com uma credencial temporária.

As contas serão criadas por administradores autorizados. Não haverá registo público de contas administrativas.

Para simplificar o primeiro acesso, as contas novas e as credenciais repostas pelo administrador usam a palavra-passe temporária `12345`, que é mostrada ao utilizador e só é aceite para definir uma nova palavra-passe; o sistema obriga à alteração antes de permitir o uso normal.

## RF02 — Gestão de contas

O sistema deverá permitir, conforme as permissões:

- Criar contas.
- Associar contas a funcionários, quando aplicável.
- Atribuir perfis.
- Configurar permissões individuais.
- Ativar e desativar contas.
- Repor credenciais.
- Consultar a data do último acesso, quando disponível.
- Registar as alterações nos logs.

Uma conta desativada não poderá iniciar novas sessões.

## RF03 — Gestão de clientes

O sistema deverá permitir cadastrar, consultar, editar e desativar clientes.

Os dados previstos são:

- Identificador único.
- Nome completo.
- Número de telefone.
- Localização ou endereço.
- Data de nascimento.
- Data de registo.
- Estado do cliente.
- Informação relativa ao cartão de fidelização.

A data de registo e o histórico deverão ser gerados e mantidos pelo sistema, com persistência na base de dados.

A pesquisa deverá permitir localizar clientes pelo nome completo ou telefone.

Quando existirem clientes com nomes iguais, o telefone deverá ajudar a distingui-los.

O sistema deverá evitar duplicações desnecessárias e apresentar possíveis correspondências antes de criar um novo cliente.

O cliente poderá ser cadastrado durante o registo de um atendimento, sem necessidade de abandonar o processo.

## RF04 — Gestão de serviços

O sistema deverá permitir aos administradores autorizados:

- Criar serviços.
- Alterar nomes e descrições.
- Definir preços de referência.
- Configurar serviços com preços fixos ou variáveis.
- Ativar e desativar serviços.
- Consultar o catálogo.
- Consultar o histórico de preços aplicados.

Os serviços utilizados em transações antigas não deverão ser apagados definitivamente.

Quando um serviço deixar de ser oferecido, deverá ser desativado, mantendo o histórico.

## RF05 — Registo de atendimento

O fluxo operacional atual prevê que o serviço seja realizado antes do seu registo no sistema, normalmente no momento do pagamento.

O sistema deverá permitir registar um atendimento contendo um ou mais serviços.

Para cada serviço registado deverão ser guardados, pelo menos:

- Cliente.
- Serviço realizado.
- Funcionário responsável.
- Data e hora.
- Preço efetivamente praticado.
- Desconto, se existir.
- Valor final.
- Estado do registo.
- Utilizador que efetuou o registo.

Cada serviço individual deverá estar associado ao funcionário que o realizou.

Um atendimento poderá conter vários serviços, incluindo serviços realizados por funcionários diferentes, caso isso aconteça.

O sistema não deverá presumir que existe sempre um único funcionário para todo o atendimento.

## RF06 — Preços variáveis

Para serviços cujo preço depende do comprimento do cabelo, da complexidade ou de outros fatores, o utilizador autorizado deverá introduzir manualmente o preço efetivamente cobrado.

O sistema deverá validar que o valor introduzido é válido e registar o preço aplicado naquela transação.

Uma alteração posterior ao preço de referência do catálogo não deverá modificar o preço de transações antigas.

## RF07 — Descontos comerciais

Os descontos comerciais apenas poderão ser alterados ou concedidos por administradores autorizados, de acordo com as permissões definidas.

O sistema deverá registar:

- Valor original.
- Valor ou percentagem do desconto.
- Valor final.
- Utilizador responsável.
- Data e hora.

O método de desconto — valor fixo, percentagem ou ambos — deverá ser confirmado antes da implementação definitiva.

## RF08 — Pagamentos

O sistema deverá permitir registar pagamentos de serviços concluídos.

Os métodos inicialmente identificados incluem:

- Dinheiro.
- M-Pesa.
- Outro serviço de pagamento móvel, cuja designação deverá ser confirmada.

Deverá ser possível dividir o pagamento entre vários métodos.

Exemplo:

| Método | Valor |
|---|---:|
| Dinheiro | 300 MT |
| M-Pesa | 200 MT |
| Total pago | 500 MT |

O sistema deverá validar que a soma dos pagamentos corresponde ao montante devido.

Não serão permitidos pagamentos a crédito nesta fase.

O estado do pagamento deverá ser distinguido do estado do serviço. Um serviço poderá estar registado, mas a comissão apenas se torna elegível quando o pagamento estiver integralmente liquidado.

## RF09 — Anulação de serviços e pagamentos

Apenas administradores autorizados poderão anular serviços e pagamentos.

O sistema deverá:

- Solicitar o motivo da anulação.
- Preservar o registo original.
- Registar o utilizador responsável.
- Registar a data e hora.
- Manter o histórico da alteração.
- Recalcular os valores derivados quando necessário.
- Evitar que uma operação anulada continue a ser contabilizada como receita válida.

A anulação de um pagamento deverá considerar o seu impacto no caixa, nas comissões e nos relatórios.

As operações não deverão ser apagadas fisicamente apenas para corrigir um erro operacional.

## RF10 — Gestão do caixa

O sistema deverá possuir um único caixa operacional.

Deverá permitir:

- Registar a abertura do caixa.
- Configurar o saldo inicial.
- Registar as entradas financeiras.
- Registar levantamentos autorizados.
- Registar despesas pagas pelo caixa, quando aplicável.
- Calcular o saldo esperado.
- Registar a contagem física do dinheiro.
- Comparar o valor contado com o valor esperado.
- Registar diferenças.
- Fechar o caixa diariamente.
- Consultar o histórico dos fechos.

O sistema deverá distinguir o saldo calculado do saldo físico contado.

A aplicação não consegue determinar automaticamente a quantidade de dinheiro existente fisicamente. Essa contagem terá de ser realizada por uma pessoa autorizada.

## RF11 — Fecho diário do caixa

O fecho diário será uma operação explícita, através da opção **Fechar caixa**.

O processo deverá permitir:

1. Consultar o saldo esperado.
2. Introduzir o valor contado fisicamente.
3. Calcular a diferença.
4. Registar observações sobre divergências.
5. Confirmar o fecho.
6. Guardar o utilizador responsável e a data e hora.

Se o caixa do dia anterior não tiver sido fechado, o sistema deverá bloquear novas operações no dia seguinte, conforme a regra definida.

O mecanismo deverá prever um procedimento administrativo controlado para corrigir situações excecionais, como falhas técnicas ou encerramentos esquecidos. Esse procedimento não deverá permitir apagar o histórico dos movimentos.

## RF12 — Levantamentos de caixa

Apenas administradores autorizados poderão registar levantamentos.

Cada levantamento deverá incluir:

- Valor.
- Motivo.
- Data e hora.
- Utilizador responsável.
- Caixa associado.
- Estado da operação.

Os levantamentos deverão reduzir o saldo esperado do caixa.

## RF13 — Despesas com produtos

O sistema deverá permitir registar as despesas relacionadas com a compra de produtos utilizados nos serviços.

Cada despesa deverá conter:

- Identificador.
- Descrição do produto ou compra.
- Quantidade e preço, quando disponíveis.
- Valor total.
- Data da compra.
- Responsável pelo registo.
- Método de pagamento.
- Caixa de origem, quando aplicável.
- Comprovativo ou referência, se disponível.

Apenas administradores autorizados poderão registar estas despesas.

O registo de uma despesa deverá refletir-se nos relatórios financeiros e, quando a despesa for paga pelo caixa, nos respetivos movimentos.

O módulo não deverá pressupor que o registo de uma despesa equivale automaticamente a uma entrada ou saída de stock.

## RF14 — Gestão de funcionários

O sistema deverá permitir gerir os dados dos funcionários.

Os campos previstos incluem:

- Identificador.
- Nome completo.
- Contactos.
- Data de admissão.
- Estado do vínculo.
- Salário-base.
- Informações necessárias à gestão profissional.
- Conta de utilizador associada, quando aplicável.

Os campos pessoais e administrativos definitivos deverão ser validados antes da implementação.

A desativação de um funcionário não deverá apagar os seus serviços, pagamentos, horários, salários ou registos históricos.

## RF15 — Gestão de horários

O administrador responsável deverá configurar os horários individuais dos funcionários.

O sistema deverá permitir registar:

- Dias de trabalho.
- Horas previstas de entrada.
- Horas previstas de saída.
- Dias de folga.
- Alterações de horário.
- Períodos de vigência da programação.

Deverá ser possível consultar os horários atuais e o histórico das alterações.

A necessidade de gerir turnos rotativos ou horários semanais variáveis deverá ser contemplada na configuração.

## RF16 — Assiduidade

O sistema deverá registar a assiduidade dos funcionários, incluindo:

- Atraso.
- Falta justificada.
- Falta injustificada.
- Saída antecipada.
- Ausência autorizada.
- Esquecimento de registar a entrada.
- Esquecimento de registar a saída.

Deverá ser possível registar as horas reais de entrada e saída, quando disponíveis, e compará-las com o horário previsto.

O sistema deverá manter o histórico de correções.

A aplicação deverá distinguir a ocorrência de assiduidade do eventual efeito salarial dessa ocorrência.

## RF17 — Salários

O sistema deverá apoiar o processamento salarial mensal.

O cálculo deverá considerar:

- Salário-base.
- Comissões elegíveis.
- Deduções autorizadas.
- Outros ajustes aprovados, se forem definidos.
- Total líquido a pagar.
- Data prevista ou efetiva de pagamento.
- Estado do processamento.

O salário-base poderá variar entre funcionários.

O administrador responsável deverá poder consultar os valores, verificar os cálculos e confirmar o processamento antes de registar o pagamento.

O utilizador administrador que não seja funcionário não deverá receber salário ou comissão apenas por possuir uma conta administrativa.

## RF18 — Comissões

A taxa de comissão definida é de 30%.

A comissão deverá ser calculada com base no valor aplicável do serviço após o desconto comercial.

Exemplo:

- Preço original: 500 MT.
- Desconto comercial: 100 MT.
- Valor elegível: 400 MT.
- Comissão: 30% × 400 MT = 120 MT.

A comissão deverá ser associada ao funcionário que realizou o serviço.

O sistema deverá calcular a comissão apenas quando o pagamento estiver integralmente liquidado.

Serviços gratuitos, pagamentos posteriormente anulados e situações de reembolso exigem regras específicas de tratamento, que deverão ser confirmadas antes da implementação final.

As comissões deverão ser consultáveis por funcionário e por período.

## RF19 — Aprovação salarial

O administrador responsável deverá poder:

1. Consultar a assiduidade do período.
2. Consultar os serviços realizados.
3. Verificar as comissões calculadas.
4. Rever deduções.
5. Conferir o total a pagar.
6. Aprovar o processamento.
7. Registar o pagamento.
8. Consultar o histórico salarial.

O sistema deverá distinguir o processamento preparado, aprovado e pago.

## RF20 — Cartão de fidelização

O cartão de fidelização aplica-se a clientes de **ambos os sexos** e aos serviços
marcados como elegíveis no catálogo. Um serviço elegível não pode custar mais de
**200 MT**.

As regras definidas são:

1. O cliente recebe uma marca por cada dia em que realiza um serviço pago elegível.
2. A regra normal é uma marca por cliente por dia, mesmo que sejam registados vários serviços no mesmo dia.
3. Ao completar cinco marcas, o cartão fica completo (5/5) e o **6.º serviço é obrigatoriamente gratuito**.
4. No sexto serviço, o cliente escolhe **um único** serviço elegível do atendimento, até 200 MT, para ser gratuito.
5. Se o serviço escolhido custar menos de 200 MT, o valor restante não pode ser usado noutro serviço.
6. O direito ao 6.º serviço não pode ser guardado para depois nem acumulado. Enquanto estiver pendente, um atendimento com serviços elegíveis tem de indicar exatamente um deles como gratuito; um atendimento só com serviços não elegíveis não consome o benefício.
7. O serviço gratuito consome o benefício e não gera uma marca; os restantes serviços desse atendimento também não geram marca e o ciclo seguinte começa em zero.
8. O sistema deverá manter o histórico de marcas e benefícios.

O cartão deverá estar associado ao cliente, não ao funcionário.

O sistema deverá permitir consultar o progresso do cartão, o 6.º serviço pendente e os benefícios utilizados.

As correções de marcas e benefícios apenas poderão ser realizadas por utilizadores autorizados, ficando registadas na auditoria.

O administrador poderá preencher manualmente o cartão de clientes que já possuíam um cartão físico antes da entrada em funcionamento do sistema. As marcas manuais entram no ciclo actual e contam individualmente; o 5.º movimento do ciclo deixa o cartão completo, quer seja uma marca manual quer seja uma marca de atendimento. O preenchimento para em 5/5: para acrescentar novas marcas é necessário registar primeiro a utilização do 6.º serviço gratuito. O administrador pode remover marcas do ciclo actual, manuais ou de atendimento, com recálculo do cartão; marcas de ciclos anteriores exigem correção de fidelização.

A implementação deverá distinguir o histórico real dos serviços, as marcas visíveis e o
progresso interno do ciclo de fidelização. O serviço gratuito é registado como utilização
do 6.º serviço, não como marca, e o ciclo seguinte começa em zero marcas.

## RF21 — Relatórios operacionais e financeiros

O sistema deverá disponibilizar relatórios por dia, semana, mês, trimestre e ano.

Os relatórios deverão incluir:

- Receita proveniente dos serviços.
- Entradas e saídas de caixa.
- Saldo esperado do caixa.
- Diferenças entre o saldo esperado e o valor contado.
- Despesas com produtos.
- Resultado financeiro calculado.
- Serviços mais realizados.
- Serviços realizados por funcionário.
- Comissões por funcionário.
- Salários e deduções.
- Assiduidade.
- Clientes mais frequentes.
- Benefícios de fidelização ganhos e utilizados.
- Histórico de anulações.
- Movimentos financeiros.

Os relatórios deverão permitir filtrar por período e, quando aplicável, por funcionário, serviço, método de pagamento e estado da operação.

Deverá existir suporte para impressão e exportação. Os formatos definitivos, como PDF e Excel, deverão ser confirmados.

## RF22 — Catálogo público de serviços

O sistema deverá disponibilizar uma página pública para consulta dos serviços oferecidos pelo salão.

A página não exigirá autenticação.

Os dados deverão ser obtidos do catálogo de serviços, apresentando apenas os serviços ativos e as informações autorizadas para divulgação.

A apresentação dos preços deverá respeitar a natureza fixa ou variável de cada serviço.

## RF23 — Logs de auditoria

O sistema deverá registar as operações relevantes realizadas pelos utilizadores.

Os logs deverão conter, quando aplicável:

- Utilizador responsável.
- Data e hora.
- Tipo de operação.
- Entidade afetada.
- Identificador do registo.
- Valores anteriores.
- Valores posteriores.
- Motivo da alteração ou anulação.
- Resultado da operação.

Os logs deverão ser protegidos contra alteração e eliminação através da aplicação.

A auditoria deverá abranger, pelo menos, alterações financeiras, anulações, alterações de permissões, alterações salariais, correções de assiduidade e operações relacionadas com a fidelização.

## RF24 — Cópias de segurança

O sistema deverá permitir realizar cópias de segurança semanais da base de dados.

As cópias deverão ser armazenadas de forma protegida e separadas, sempre que possível, do dispositivo principal.

Deverá existir um procedimento documentado para restaurar uma cópia de segurança.

A recuperação deverá preservar a consistência entre os registos de serviços, pagamentos, caixa, comissões, salários e auditoria.

## RF25 — Funcionamento offline e sincronização

O sistema deverá evoluir para funcionar sem Internet, utilizando uma base de dados local no dispositivo principal do salão.

As operações realizadas offline deverão ser guardadas localmente.

Quando a ligação regressar, o sistema deverá sincronizar as alterações com a base de dados online.

A sincronização deverá contemplar:

- Identificação única dos registos.
- Registo das operações pendentes.
- Prevenção de duplicações.
- Confirmação das operações sincronizadas.
- Tratamento de falhas de comunicação.
- Deteção de conflitos.
- Repetição segura de operações não concluídas.

Como o caixa e os pagamentos são críticos, a sincronização não deverá duplicar receitas, despesas ou comissões.

O funcionamento offline completo exige mais do que manter a interface aberta no navegador. Será necessário definir como a aplicação será instalada, como os dados serão persistidos localmente e como será executada a sincronização.

---

# 6. Regras de negócio

As seguintes regras deverão ser tratadas como regras centrais da aplicação.

**RN01 — Identificação do cliente:** cada cliente deverá possuir um identificador único. O nome e o telefone serão utilizados para facilitar a pesquisa e distinguir clientes com nomes iguais.

**RN02 — Histórico:** os registos históricos não deverão ser apagados apenas porque um cliente, funcionário ou serviço deixou de estar ativo.

**RN03 — Registo do serviço:** cada serviço realizado deverá ficar associado ao cliente, ao funcionário responsável, à data e ao preço efetivamente cobrado.

**RN04 — Pagamento dividido:** um pagamento poderá ser composto por várias parcelas, cada uma com o seu método e valor.

**RN05 — Pagamento integral:** não deverá ser gerada comissão elegível enquanto o pagamento do serviço não estiver integralmente liquidado.

**RN06 — Comissão:** a taxa padrão definida é de 30% sobre o valor elegível do serviço após o desconto comercial.

**RN07 — Descontos:** apenas administradores autorizados poderão conceder ou alterar descontos comerciais.

**RN08 — Anulações:** apenas administradores autorizados poderão anular registos, preservando o histórico e o motivo.

**RN09 — Caixa único:** as operações financeiras deverão estar associadas ao caixa operacional do salão.

**RN10 — Fecho diário:** o caixa deverá ser fechado diariamente. A ausência de fecho impedirá novas operações no dia seguinte.

**RN11 — Saldo físico:** o valor físico do dinheiro deverá ser contado e introduzido por um utilizador autorizado.

**RN12 — Levantamentos:** apenas administradores autorizados poderão registar levantamentos de caixa.

**RN13 — Despesas:** as despesas de compra de produtos deverão ser registadas separadamente das receitas dos serviços.

**RN14 — Salários:** o processamento salarial será mensal, com revisão e aprovação pelo administrador responsável.

**RN15 — Assiduidade:** o sistema deverá distinguir o registo da ocorrência e o cálculo de qualquer dedução salarial.

**RN16 — Fidelização:** o cartão aplica-se a clientes de ambos os sexos e apenas a serviços marcados como elegíveis, com valor até 200 MT.

**RN17 — Marca diária:** a regra normal é uma marca por cliente por dia, mesmo que existam vários serviços registados no mesmo dia.

**RN18 — Sexto serviço gratuito:** ao completar cinco marcas, o cartão fica completo (5/5) e o 6.º serviço é obrigatoriamente gratuito, escolhido entre os serviços elegíveis do atendimento até 200 MT.

**RN19 — Sem acumulação:** o direito ao 6.º serviço não pode ser guardado para depois nem acumulado. Enquanto estiver pendente, o próximo atendimento com serviços elegíveis tem de indicar exatamente um deles como gratuito. Cada utilização cobre apenas um serviço.

**RN20 — Ciclo seguinte:** o serviço gratuito consome o benefício e não conta como marca. Os restantes serviços desse atendimento também não contam; o ciclo seguinte começa em zero marcas.

**RN21 — Auditoria:** as operações relevantes deverão deixar um histórico protegido contra alterações e eliminações pela aplicação.

**RN22 — Catálogo público:** apenas os serviços ativos e os dados destinados à divulgação pública deverão ser apresentados no catálogo.

**RN23 — Offline:** as operações realizadas sem Internet deverão ser guardadas localmente e sincronizadas quando a ligação regressar.

**RN24 — Dados antigos:** a migração inicial dos cadernos será realizada manualmente.

**RN25 — Stock:** o controlo completo de stock não faz parte da primeira fase.

---

# 7. Modelo conceptual de dados

O modelo deverá separar os dados operacionais, financeiros, administrativos e de auditoria. A proposta seguinte constitui uma base para a modelação relacional em PostgreSQL.

## 7.1. Utilizadores e permissões

### Utilizador

Representa uma conta de acesso ao sistema.

Atributos principais:

- id_utilizador
- nome_utilizador
- hash_palavra_passe
- estado
- alteracao_obrigatoria_palavra_passe
- ultimo_acesso
- data_criacao

### Perfil

Representa um conjunto de permissões.

Atributos principais:

- id_perfil
- nome
- descricao
- estado

### Permissao

Representa uma ação autorizável no sistema.

Atributos principais:

- id_permissao
- codigo
- descricao
- modulo

### UtilizadorPerfil

Associa utilizadores a perfis.

Atributos principais:

- id_utilizador
- id_perfil

### PerfilPermissao

Define as permissões padrão de cada perfil.

Atributos principais:

- id_perfil
- id_permissao

### UtilizadorPermissao

Define exceções individuais às permissões do perfil.

Atributos principais:

- id_utilizador
- id_permissao
- efeito

O campo `efeito` deverá permitir representar uma concessão ou uma restrição individual, de acordo com a política de autorização adotada.

## 7.2. Funcionários e assiduidade

### Funcionario

Representa uma pessoa que trabalha no salão.

Atributos principais:

- id_funcionario
- nome_completo
- telefone
- data_admissao
- salario_base
- estado
- id_utilizador, quando existir associação a uma conta

A relação com o utilizador poderá ser opcional, porque nem todo o funcionário precisa necessariamente de uma conta.

### HorarioFuncionario

Representa a programação de um funcionário.

Atributos principais:

- id_horario
- id_funcionario
- dia_semana
- hora_entrada_prevista
- hora_saida_prevista
- data_inicio_vigencia
- data_fim_vigencia
- estado

### Assiduidade

Representa os registos de presença e as ocorrências.

Atributos principais:

- id_assiduidade
- id_funcionario
- data
- hora_entrada_real
- hora_saida_real
- tipo_ocorrencia
- justificacao
- estado
- registado_por

A estrutura deverá permitir distinguir a ausência completa de uma falta de registo de entrada ou saída.

## 7.3. Clientes e serviços

### Cliente

Atributos principais:

- id_cliente
- nome_completo
- telefone
- endereco
- data_nascimento
- data_registo
- estado

### Servico

Atributos principais:

- id_servico
- nome
- descricao
- preco_referencia
- tipo_preco
- estado
- data_criacao

O tipo de preço deverá distinguir serviços com preço fixo daqueles em que o preço é introduzido manualmente.

### Atendimento

Representa a visita ou operação de atendimento registada.

Atributos principais:

- id_atendimento
- id_cliente
- data_hora
- estado
- registado_por

### AtendimentoServico

Representa cada serviço realizado dentro de um atendimento.

Atributos principais:

- id_atendimento_servico
- id_atendimento
- id_servico
- id_funcionario
- preco_original
- valor_desconto
- valor_final
- estado

Esta entidade permite que um atendimento contenha vários serviços, cada um com o seu funcionário e preço efetivo.

O preço praticado deverá ser guardado no registo da transação, não sendo obtido dinamicamente do preço atual do catálogo.

## 7.4. Pagamentos

### Pagamento

Representa o pagamento associado a um atendimento ou aos valores devidos.

Atributos principais:

- id_pagamento
- id_atendimento
- valor_total
- estado
- data_hora
- registado_por

### PagamentoParcela

Representa cada parcela de um pagamento dividido.

Atributos principais:

- id_parcela
- id_pagamento
- metodo_pagamento
- valor
- referencia, quando aplicável

A soma das parcelas válidas deverá corresponder ao total liquidado.

A implementação deverá definir como serão tratados pagamentos parciais decorrentes de erros, anulações ou falhas operacionais, uma vez que o crédito não é permitido.

## 7.5. Caixa e despesas

### Caixa

Representa o caixa operacional.

Atributos principais:

- id_caixa
- designacao
- estado

### CaixaSessao

Representa o período entre a abertura e o fecho do caixa.

Atributos principais:

- id_sessao
- id_caixa
- data_abertura
- saldo_inicial
- aberto_por
- data_fecho
- valor_esperado
- valor_contado
- diferenca
- fechado_por
- estado

### MovimentoCaixa

Representa entradas, saídas e outros movimentos financeiros do caixa.

Atributos principais:

- id_movimento
- id_sessao
- tipo_movimento
- valor
- descricao
- data_hora
- origem
- registado_por
- estado

### DespesaProduto

Representa a compra de produtos utilizados no salão.

Atributos principais:

- id_despesa
- descricao
- data_compra
- valor_total
- metodo_pagamento
- registado_por
- estado

Quando uma despesa for paga pelo caixa, deverá existir uma associação inequívoca entre a despesa e o respetivo movimento de saída, evitando que a mesma despesa seja contabilizada duas vezes.

## 7.6. Salários e comissões

### ProcessamentoSalarial

Representa o processamento de um funcionário num período.

Atributos principais:

- id_processamento
- id_funcionario
- periodo_inicio
- periodo_fim
- salario_base
- total_comissoes
- total_deducoes
- total_a_pagar
- estado
- aprovado_por
- data_aprovacao
- data_pagamento

### Comissao

Representa uma comissão elegível.

Atributos principais:

- id_comissao
- id_atendimento_servico
- id_funcionario
- taxa
- base_calculo
- valor_comissao
- estado

A comissão deverá estar ligada ao serviço individual e ao funcionário responsável.

### DeducaoSalarial

Representa uma dedução aprovada.

Atributos principais:

- id_deducao
- id_processamento
- tipo
- descricao
- valor
- motivo
- aprovado_por

O modelo deverá permitir identificar separadamente salário-base, comissão, deduções e total final.

## 7.7. Fidelização

### CartaoFidelizacao

Representa o cartão de um cliente.

Atributos principais:

- id_cartao
- id_cliente
- data_ativacao
- estado

### MovimentoFidelizacao

Representa os acontecimentos do cartão.

Atributos principais:

- id_movimento_fidelizacao
- id_cartao
- id_atendimento_servico, quando aplicável
- tipo_movimento
- data_hora
- ciclo
- registado_por
- observacao_tecnica

Os tipos de movimento deverão permitir distinguir:

- Marca obtida.
- Benefício ganho.
- Benefício utilizado.
- Correção autorizada.

O progresso do ciclo deverá ser calculado de forma consistente a partir dos movimentos registados, evitando que a mesma operação gere marcas ou benefícios duplicados.

O serviço gratuito utilizado deverá consumir o benefício sem produzir uma marca; os
restantes serviços do mesmo atendimento também não produzem marca, deixando o ciclo
seguinte em zero marcas.

## 7.8. Auditoria

### LogAuditoria

Atributos principais:

- id_log
- id_utilizador
- data_hora
- entidade
- id_registo_afetado
- tipo_operacao
- valores_anteriores
- valores_posteriores
- motivo
- identificador_operacao

Os valores anteriores e posteriores deverão permitir reconstruir o contexto de uma alteração relevante.

Os logs deverão ser protegidos contra modificações realizadas através das operações normais da aplicação.

## 7.9. Sincronização

### OperacaoSincronizacao

Representa uma operação local que precisa de ser sincronizada.

Atributos principais:

- id_operacao
- identificador_unico
- tipo_entidade
- id_registo
- tipo_operacao
- data_criacao
- estado_sincronizacao
- tentativas
- ultima_tentativa
- erro, quando aplicável

A estrutura definitiva dependerá da estratégia de sincronização escolhida. O objetivo é permitir retomar operações pendentes sem duplicar registos.

---

# 8. Relacionamentos principais

A estrutura conceptual deverá respeitar os seguintes relacionamentos:

- Um cliente pode possuir um cartão de fidelização.
- Um cliente pode ter vários atendimentos.
- Um atendimento pode conter vários serviços.
- Cada serviço realizado pertence a um atendimento.
- Cada serviço realizado está associado a um funcionário.
- Um atendimento pode ter um ou mais registos de pagamento, conforme a política de implementação.
- Um pagamento pode conter várias parcelas.
- Uma sessão de caixa pode conter vários movimentos.
- Um funcionário pode ter vários registos de assiduidade.
- Um funcionário pode ter vários horários ao longo do tempo.
- Um funcionário pode ter vários processamentos salariais.
- Um serviço realizado pode originar uma comissão elegível.
- Um utilizador pode possuir um ou mais perfis, caso essa flexibilidade seja aprovada.
- Um perfil pode conter várias permissões.
- Um utilizador pode ter permissões individuais adicionais ou restritivas.
- Um utilizador pode realizar várias operações registadas na auditoria.
- As operações locais pendentes podem ser associadas a registos que aguardam sincronização.

As chaves primárias deverão ser identificadores estáveis. As chaves estrangeiras deverão garantir a integridade referencial.

---

# 9. Processos operacionais principais

## 9.1. Registo de um atendimento

1. O funcionário inicia sessão.
2. Procura o cliente pelo nome ou telefone.
3. Se o cliente não existir, cria o registo.
4. Seleciona os serviços realizados.
5. Associa cada serviço ao funcionário que o executou.
6. Introduz os preços aplicáveis.
7. Regista os descontos autorizados, se existirem.
8. O sistema calcula os valores finais.
9. O utilizador regista o pagamento.
10. O sistema valida a liquidação.
11. O pagamento é refletido no caixa.
12. O sistema verifica a elegibilidade para comissão.
13. O sistema atualiza o histórico de fidelização, quando aplicável.
14. O sistema regista a operação na auditoria.

## 9.2. Pagamento dividido

1. O utilizador consulta o total devido.
2. Introduz a primeira parcela e o respetivo método.
3. Introduz as restantes parcelas, quando necessário.
4. O sistema calcula a soma.
5. O pagamento só é considerado integralmente liquidado quando o montante válido corresponde ao valor devido.
6. Os movimentos são refletidos no caixa de acordo com o método de pagamento e as regras contabilísticas definidas.

## 9.3. Fecho de caixa

1. O utilizador autorizado consulta o saldo esperado.
2. Realiza a contagem física.
3. Introduz o valor contado.
4. O sistema calcula a diferença.
5. O utilizador regista o motivo da diferença, se existir.
6. Confirma o fecho.
7. O sistema preserva o resultado e a identidade do responsável.
8. O caixa passa ao estado fechado.
9. O sistema bloqueia novas operações até existir uma nova sessão de caixa válida.

## 9.4. Processamento salarial

1. O administrador responsável seleciona o período.
2. O sistema apresenta os funcionários elegíveis.
3. Consulta a assiduidade.
4. Apresenta as comissões elegíveis.
5. Calcula os valores de acordo com as regras configuradas.
6. O administrador revê as deduções.
7. O processamento é aprovado.
8. O pagamento é registado.
9. O histórico salarial é atualizado.
10. As alterações relevantes ficam registadas na auditoria.

## 9.5. Utilização do cartão de fidelização

1. O utilizador identifica o cliente.
2. O sistema consulta o cartão e verifica se o 6.º serviço está pendente.
3. Se o cartão estiver completo (5/5), o atendimento com serviços elegíveis tem de marcar
   **um único** serviço elegível, até 200 MT, como gratuito. O 6.º serviço não pode ser
   registado como pago e o direito não pode ser guardado para depois.
4. O sistema valida a elegibilidade e o limite de preço do serviço.
5. O serviço é registado com desconto integral na linha escolhida.
6. O sistema atualiza o ciclo e o histórico de fidelização.
7. O benefício utilizado é marcado como consumido e não gera marca; os restantes serviços
   do atendimento também não geram marca.
8. A operação fica registada na auditoria, quando aplicável.

A lógica de fidelização deverá ser implementada de modo transacional para impedir que operações repetidas, erros ou sincronizações duplicadas produzam benefícios indevidos.

---

# 10. Requisitos não funcionais

## RNF01 — Segurança

O sistema deverá utilizar autenticação individual, controlo de permissões no servidor, armazenamento seguro de palavras-passe e proteção das sessões.

As operações administrativas e financeiras deverão exigir autorização apropriada.

## RNF02 — Integridade dos dados

A base de dados deverá utilizar chaves primárias, chaves estrangeiras, restrições e transações para impedir estados inconsistentes.

As operações financeiras e de fidelização deverão ser tratadas de forma atómica sempre que necessário.

## RNF03 — Auditabilidade

As alterações relevantes deverão permitir identificar o utilizador responsável, a data, a operação e os valores alterados.

Os logs de auditoria deverão ser protegidos contra alterações e eliminações pela aplicação.

## RNF04 — Disponibilidade offline

A aplicação deverá evoluir para permitir a execução das operações essenciais sem Internet, usando armazenamento local persistente.

A implementação deverá definir claramente quais as operações que podem ser realizadas offline e como os conflitos serão resolvidos.

## RNF05 — Sincronização

A sincronização deverá ser tolerante a falhas, evitar duplicações e permitir retomar operações pendentes.

As operações financeiras deverão utilizar identificadores idempotentes para que o mesmo pedido não seja contabilizado várias vezes.

## RNF06 — Cópias de segurança

Deverão ser realizadas cópias de segurança semanais, com proteção contra perda ou acesso não autorizado.

A recuperação deverá ser testada periodicamente.

## RNF07 — Usabilidade

A interface deverá ser clara, adequada à utilização diária e compatível com o dispositivo escolhido para o salão.

As operações frequentes, como registar serviços e pagamentos, deverão exigir poucos passos, sem comprometer a validação dos dados.

## RNF08 — Manutenibilidade

O código deverá ser organizado por módulos, com separação entre interface, lógica de negócio e acesso à base de dados.

As regras financeiras e de fidelização não deverão ficar dispersas pela interface.

## RNF09 — Portabilidade

A aplicação deverá funcionar no ambiente definido para o salão e permitir futura evolução para outros dispositivos, respeitando as limitações da estratégia offline.

## RNF10 — Consistência financeira

As receitas, despesas, movimentos de caixa e resultados financeiros deverão ser calculados segundo regras documentadas e sem dupla contabilização.

## RNF11 — Privacidade

O sistema deverá limitar o acesso aos dados pessoais e salariais ao estritamente necessário para cada função.

Os dados dos clientes e funcionários não deverão ser expostos no catálogo público.

---

# 11. Arquitetura técnica proposta

## 11.1. Tecnologias definidas

A stack identificada para o projeto é:

- **Frontend:** React.
- **Estilização:** CSS puro.
- **Backend:** Node.js com Express.
- **Base de dados:** PostgreSQL.
- **Acesso à base de dados:** **Drizzle ORM** sobre o driver `pg`, com schema e migrações
  versionadas (sem SQL concatenado).
- **Interface:** aplicação web adaptada ao dispositivo utilizado no salão.

A arquitetura deverá separar a interface, a API, a persistência dos dados e os serviços de negócio.

## 11.2. Camadas da aplicação

### Apresentação

Responsável por:

- Interfaces de gestão.
- Formulários.
- Listagens.
- Pesquisa.
- Validação visual.
- Apresentação de relatórios.
- Catálogo público.

### API e lógica de negócio

Responsável por:

- Autenticação.
- Autorização.
- Validação dos dados.
- Gestão de clientes e funcionários.
- Cálculo de pagamentos e comissões.
- Controlo do caixa.
- Fidelização.
- Processamento salarial.
- Auditoria.
- Sincronização.

### Persistência

Responsável por guardar:

- Dados operacionais.
- Dados financeiros.
- Histórico de operações.
- Permissões.
- Logs de auditoria.
- Informações de sincronização.

## 11.3. Considerações sobre o funcionamento offline

A stack inicial, por si só, não garante funcionamento offline.

Será necessário escolher uma estratégia concreta de instalação e persistência local. Uma possibilidade é executar o backend e o PostgreSQL no dispositivo principal do salão, disponibilizando a interface na rede local.

Para a sincronização com a base de dados online, deverá existir um serviço responsável por enviar as alterações locais e processar as respostas do servidor.

A estratégia deverá considerar que o PostgreSQL local e o PostgreSQL online não se sincronizam automaticamente. Será necessária lógica explícita de sincronização, incluindo identificação de alterações, tratamento de conflitos e prevenção de duplicações.

Antes de implementar esta parte, deverá ser decidido se o dispositivo principal será um computador permanentemente ligado, um equipamento dedicado ou outra solução.

---

# 12. Organização funcional da interface

A interface deverá ser dividida em módulos coerentes.

## 12.1. Painel principal

Deverá apresentar indicadores úteis, conforme as permissões do utilizador:

- Serviços registados.
- Receita do período.
- Estado do caixa.
- Alertas de fecho.
- Despesas recentes.
- Resumo de assiduidade.
- Atalhos para operações frequentes.

Os indicadores financeiros deverão ficar ocultos para utilizadores sem autorização.

## 12.2. Clientes

Deverá incluir:

- Lista de clientes.
- Pesquisa.
- Cadastro.
- Edição.
- Histórico de atendimentos.
- Cartão de fidelização.
- 6.º serviço pendente.

## 12.3. Serviços

Deverá incluir:

- Catálogo.
- Cadastro e edição.
- Preços de referência.
- Estado ativo ou inativo.
- Histórico de preços, quando necessário.

## 12.4. Atendimento e pagamentos

Deverá incluir:

- Seleção do cliente.
- Seleção dos serviços.
- Associação dos funcionários.
- Introdução de preços.
- Aplicação de descontos autorizados.
- Registo do pagamento.
- Pagamento dividido.
- Consulta do estado da liquidação.

## 12.5. Caixa

Deverá incluir:

- Abertura.
- Movimentos.
- Levantamentos.
- Despesas pagas pelo caixa.
- Saldo esperado.
- Contagem física.
- Fecho.
- Histórico dos fechos.

## 12.6. Funcionários

Deverá incluir:

- Lista de funcionários.
- Cadastro e edição.
- Horários.
- Assiduidade.
- Serviços realizados.
- Comissões.
- Salários, conforme as permissões.

## 12.7. Salários e comissões

Deverá incluir:

- Processamentos mensais.
- Detalhe do salário-base.
- Comissões.
- Deduções.
- Total a pagar.
- Aprovação.
- Registo do pagamento.
- Histórico.

## 12.8. Despesas

Deverá incluir:

- Registo de compras de produtos.
- Pesquisa por período.
- Consulta dos valores.
- Associação ao método de pagamento.
- Histórico de alterações.

## 12.9. Relatórios

Deverá incluir filtros por período, funcionário, serviço, método de pagamento e outros critérios pertinentes.

Os relatórios financeiros deverão estar sujeitos às permissões definidas.

## 12.10. Administração

Deverá incluir:

- Utilizadores.
- Perfis.
- Permissões.
- Configurações.
- Horários.
- Logs de auditoria.
- Cópias de segurança, conforme a implementação.

## 12.11. Catálogo público

Deverá apresentar os serviços ativos e as respetivas informações públicas, sem expor dados internos do salão.

---

# 13. Plano de desenvolvimento por fases

A implementação deverá começar pelas entidades e funcionalidades isoladas, avançando depois para processos mais complexos e integrados.

## Fase 1 — Fundação e entidades principais

Objetivos:

- Configurar o projeto.
- Criar a base de dados.
- Definir convenções de código.
- Implementar a autenticação básica.
- Criar clientes.
- Criar funcionários.
- Criar serviços.
- Criar perfis e permissões.
- Implementar validações e logs básicos.

Resultado esperado: estrutura inicial funcional e dados principais persistidos corretamente.

## Fase 2 — Atendimento e pagamentos

Objetivos:

- Implementar atendimentos.
- Associar serviços a funcionários.
- Registar preços variáveis.
- Implementar descontos autorizados.
- Registar pagamentos.
- Permitir pagamentos divididos.
- Calcular o estado de liquidação.
- Registar as operações no histórico.

Resultado esperado: o salão consegue registar os serviços realizados e os pagamentos correspondentes.

## Fase 3 — Caixa e despesas

Objetivos:

- Implementar abertura do caixa.
- Registar movimentos.
- Registar despesas com produtos.
- Implementar levantamentos.
- Calcular o saldo esperado.
- Implementar contagem física.
- Implementar fecho diário.
- Bloquear operações quando o caixa anterior não estiver fechado.

Resultado esperado: controlo diário do dinheiro e das despesas registadas.

## Fase 4 — Fidelização

Objetivos:

- Criar cartões.
- Implementar marcas.
- Calcular o 6.º serviço gratuito sem acumulação.
- Registar utilizações.
- Implementar o ciclo seguinte.
- Preservar o histórico.

Resultado esperado: o cartão de fidelização funciona de acordo com as regras definidas.

## Fase 5 — Assiduidade, horários e salários

Objetivos:

- Configurar horários.
- Registar ocorrências.
- Consultar serviços realizados.
- Calcular comissões.
- Preparar processamentos mensais.
- Implementar revisão e aprovação.
- Registar pagamentos salariais.

Resultado esperado: gestão integrada da assiduidade, comissões e salários.

## Fase 6 — Relatórios e auditoria avançada

Objetivos:

- Implementar relatórios operacionais.
- Implementar relatórios financeiros.
- Disponibilizar filtros.
- Preparar impressão e exportação.
- Consolidar os logs.
- Implementar a consulta de auditoria.
- Validar a consistência dos indicadores.

Resultado esperado: acompanhamento administrativo e financeiro com rastreabilidade.

## Fase 7 — Catálogo público

Objetivos:

- Criar a página pública.
- Consultar os serviços ativos.
- Apresentar descrições e informações de preço.
- Garantir que os dados internos não são expostos.

Resultado esperado: consulta pública dos serviços do salão.

## Fase 8 — Operação offline e sincronização

Objetivos:

- Definir a instalação local.
- Persistir dados sem Internet.
- Implementar uma fila de sincronização.
- Evitar duplicações.
- Tratar falhas.
- Resolver conflitos.
- Testar a recuperação de dados.

Resultado esperado: funcionamento offline das operações acordadas e sincronização segura quando a ligação regressar.

## Fase 9 — Migração e entrada em produção

Objetivos:

- Preparar os dados dos cadernos.
- Introduzir clientes.
- Introduzir cartões e progresso de fidelização.
- Introduzir serviços e outros dados históricos selecionados.
- Validar os dados introduzidos.
- Treinar os utilizadores.
- Realizar cópias de segurança.
- Executar testes finais.
- Colocar o sistema em utilização.

A migração deverá ser acompanhada de verificações para evitar clientes duplicados, marcas incorretas e diferenças nos valores históricos.

---

# 14. Critérios de aceitação

A primeira versão deverá ser considerada funcional quando os seguintes cenários forem satisfeitos.

## Clientes e serviços

- É possível cadastrar um cliente com os campos definidos.
- É possível pesquisar por nome e telefone.
- É possível registar um serviço realizado.
- Cada serviço fica associado ao funcionário responsável.
- O preço efetivamente cobrado permanece inalterado no histórico.

## Pagamentos

- É possível pagar por um único método.
- É possível dividir o pagamento entre métodos.
- O sistema valida a soma das parcelas.
- Um pagamento não integralmente liquidado não gera comissão elegível.
- Uma anulação administrativa preserva o histórico.

## Caixa

- O saldo esperado é calculado a partir dos movimentos válidos.
- A contagem física pode ser registada.
- O sistema calcula a diferença entre o valor esperado e o valor contado.
- O fecho fica associado ao utilizador responsável.
- Não é possível iniciar novas operações no dia seguinte sem fechar o caixa anterior.

## Comissões e salários

- A comissão corresponde a 30% da base elegível definida.
- Os descontos comerciais são refletidos no cálculo.
- As comissões ficam associadas ao funcionário correto.
- O processamento salarial apresenta salário-base, comissões, deduções e total.
- O pagamento salarial fica registado no histórico.

## Fidelização

- O cartão aplica-se a clientes de ambos os sexos.
- Apenas serviços elegíveis com valor até 200 MT contam.
- A marca diária respeita a regra de uma marca por cliente por dia.
- O quinto serviço elegível deixa o cartão completo (5/5).
- No sexto serviço, o cliente escolhe um único serviço elegível, até 200 MT, que é
  obrigatoriamente gratuito.
- O 6.º serviço não pode ser pago nem guardado para depois; não há acumulação.
- O serviço gratuito não gera marca; os restantes serviços desse atendimento também não, e
  o ciclo seguinte começa em zero.
- Uma operação repetida não cria benefícios duplicados.

## Permissões e auditoria

- Um funcionário não consegue executar operações administrativas sem autorização.
- Um administrador autorizado pode anular registos.
- O auditor consegue consultar os logs e os relatórios financeiros.
- O auditor não consegue modificar registos financeiros nem apagar logs.
- As operações relevantes deixam um histórico verificável.

## Offline e recuperação

- As operações offline ficam guardadas localmente.
- Uma falha de Internet não elimina operações já registadas.
- A sincronização não duplica pagamentos ou movimentos.
- Uma cópia de segurança pode ser restaurada com consistência.

---

# 15. Riscos e medidas de prevenção

## 15.1. Perda de dados

**Risco:** avaria do dispositivo principal.

**Medidas:** cópias de segurança semanais, armazenamento protegido e testes de recuperação.

## 15.2. Divergências de caixa

**Risco:** diferença entre o dinheiro esperado e o dinheiro contado.

**Medidas:** fecho diário, registo da contagem física, histórico dos movimentos e relatório de diferenças.

## 15.3. Erros nos cálculos de comissão

**Risco:** atribuição de comissão a serviços não pagos integralmente ou cálculo sobre uma base incorreta.

**Medidas:** regras centralizadas no backend, testes automatizados e associação entre serviço, pagamento e comissão.

## 15.4. Abuso de permissões

**Risco:** utilizadores executarem operações fora das suas funções.

**Medidas:** autorização no servidor, permissões individuais e auditoria.

## 15.5. Duplicação durante a sincronização

**Risco:** uma operação offline ser enviada mais de uma vez.

**Medidas:** identificadores únicos, processamento idempotente e controlo das operações pendentes.

## 15.6. Corrupção do histórico de fidelização

**Risco:** marcas ou benefícios incorretos.

**Medidas:** registo histórico de movimentos, controlo do ciclo e prevenção de operações duplicadas.

## 15.7. Migração incorreta

**Risco:** introdução de clientes duplicados ou saldos históricos incorretos.

**Medidas:** preparação dos dados, validação manual e conferência dos totais.

---

# 16. Decisões ainda pendentes

As seguintes questões deverão ser confirmadas antes de fechar o desenho técnico e a implementação.

1. **Métodos de pagamento:** confirmar o nome do serviço de pagamento móvel adicional ao M-Pesa.
2. **Descontos:** definir se serão aceites valores fixos, percentagens ou ambos.
3. **Deduções salariais:** definir se serão calculadas automaticamente ou introduzidas e aprovadas manualmente.
4. **Anulações:** confirmar se todos os administradores podem anular todos os tipos de registo ou se haverá restrições por módulo.
5. **Comissões:** definir o tratamento de serviços gratuitos, pagamentos anulados, reembolsos e eventuais correções posteriores.
6. **Caixa:** definir o valor inicial, a forma de abertura e o procedimento para corrigir um fecho incorreto.
7. **Horários:** confirmar se os turnos poderão variar semanalmente e como serão tratados os horários excecionais.
8. **Catálogo público:** decidir se mostrará preços fixos, preços iniciais ou indicação de preço variável.
9. **Relatórios:** confirmar os formatos de exportação necessários, nomeadamente PDF e Excel.
10. **Migração:** definir quais os dados históricos dos cadernos que serão recuperados, para além dos clientes e cartões.
11. **Offline:** definir o dispositivo principal, a instalação local e a estratégia de sincronização com a base de dados online.
12. **Fidelização:** ~~validar os casos excecionais de vários cortes no mesmo dia e a forma exata de apresentar o progresso interno do ciclo.~~ **Resolvido:** mantém-se uma marca por cliente por dia; o cartão fica 5/5 e o 6.º serviço é obrigatoriamente gratuito, sem acumulação; o serviço gratuito não gera marca e o ciclo seguinte começa em zero.
13. **Reservas de clientes:** confirmar se o agendamento de clientes será introduzido numa fase futura, dado que o fluxo atual regista o serviço depois de realizado.
14. **Controlo de stock:** definir os requisitos detalhados quando o módulo de stock for desenvolvido.

Estas questões não impedem a implementação das entidades e funcionalidades já definidas, mas deverão ser resolvidas antes de implementar as regras que delas dependem.

---

# 17. Conclusão

O sistema proposto deverá centralizar a gestão operacional, administrativa e financeira do salão, substituindo progressivamente os registos manuais e permitindo uma gestão mais consistente dos clientes, serviços, caixa, salários, comissões, assiduidade e fidelização.

A arquitetura proposta, baseada em React, CSS puro, Node.js, Express e PostgreSQL, deverá privilegiar a separação das responsabilidades, a integridade dos dados, a segurança, a auditabilidade e a capacidade de evolução.

O desenvolvimento deverá começar pelas entidades e funcionalidades isoladas, avançando gradualmente para os processos que dependem da integração entre módulos.

A gestão financeira e a fidelização exigirão especial cuidado, porque dependem de regras consistentes para pagamentos, anulações, comissões, fecho de caixa e controlo do 6.º serviço gratuito.

O funcionamento offline deverá ser tratado como uma capacidade arquitetural específica, e não como uma simples característica da interface web. A persistência local, a sincronização e a recuperação dos dados terão de ser desenhadas e testadas.

Por fim, a introdução dos dados antigos deverá ser realizada de forma controlada, preservando os registos relevantes e conferindo a informação antes de o sistema passar a ser utilizado como ferramenta principal do salão.

**Resultado esperado:** um sistema modular, seguro, auditável e preparado para crescer, que permita ao salão controlar as suas operações diárias com maior precisão e reduzir a dependência de registos manuais.