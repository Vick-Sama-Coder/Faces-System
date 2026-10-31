# Validações

[← Voltar ao índice](./README.md)

As regras estão duplicadas intencionalmente:

- **Frontend:** `Frontend/src/utils/validacoes.js` (feedback imediato no formulário)
- **Backend:** `Backend/src/utils/validacoes.js` (fonte de verdade / segurança)

Ao alterar uma regra, actualize **os dois ficheiros**.

As funções atómicas devolvem a mensagem de erro ou `null` quando o valor é válido. No
frontend, as validações compostas (`validarRegisto`, `validarLogin`, `validarCliente`,
`validarAtendimento`, `validarUtilizador`) devolvem um objecto `{ campo: mensagem }` apenas
com os campos inválidos.

## Nome

- Obrigatório (não pode ser vazio).
- Entre **3 e 100** caracteres.
- Apenas **letras** (incluindo acentos `À-ÿ`) e **espaços**.

| Situação | Mensagem |
| --- | --- |
| Vazio | `Nome e obrigatorio` |
| Fora do intervalo | `Nome: use de 3 a 100 caracteres` |
| Caracteres inválidos | `Nome: use apenas letras e espacos` |

> Na gestão de contas (`validarUtilizador`), o nome de utilizador só é validado pelo
> tamanho (3–100), porque pode conter números/símbolos. A unicidade é verificada no
> servidor.

## Telefone

Normalização (`limparTelefone`): remove tudo o que não seja dígito e retira o prefixo
`258` (indicativo de Moçambique).

- Obrigatório.
- Deve corresponder a `^8[2-7]\d{7}$` → **9 dígitos**, começando por `82` a `87`.

| Situação | Mensagem |
| --- | --- |
| Vazio | `Telefone e obrigatorio` |
| Formato inválido | `Telefone invalido (ex.: 84 123 4567)` |

Exemplos válidos: `841234567`, `82 123 4567`, `+258 86 123 4567`.

> No registo, um telefone já existente devolve `{ field: "telefone", message: "O usuario ja existe" }`.
> O nome de utilizador também é único (`{ field: "nome", message: "O nome de utilizador ja existe" }`).

## Senha

- Obrigatória.
- Entre **8 e 72** caracteres (72 é o limite do bcrypt).
- Pelo menos **1 letra** e **1 número**.

| Situação | Mensagem |
| --- | --- |
| Vazia | `Senha e obrigatoria` |
| Menos de 8 | `A senha deve ter no minimo 8 caracteres` |
| Mais de 72 | `A senha nao pode ter mais de 72 caracteres` |
| Sem letra | `A senha deve conter pelo menos 1 letra` |
| Sem número | `A senha deve conter pelo menos 1 numero` |

A senha padrão do registo (`12345`) não passa nesta validação de propósito: obriga à troca
no primeiro acesso.

## Confirmação de senha (só frontend)

| Situação | Mensagem |
| --- | --- |
| Vazia | `Confirme a sua senha` |
| Diferente | `As senhas nao coincidem` |

## Sexo

- Opcional; quando preenchido, apenas `M` ou `F`.

| Situação | Mensagem |
| --- | --- |
| Valor diferente de `M`/`F` | `Sexo invalido: use 'M' ou 'F'` |

## Cliente

`validarCliente({ nome, apelido, telefone, sexo })` valida:

- `nome` com `validarNome`;
- `apelido` com `validarNome` (obrigatório na criação);
- `telefone` com `validarTelefone`;
- `sexo` com `validarSexo` (opcional).

## Atendimento

`validarAtendimento({ clientes })` (multi-cliente) ou
`validarAtendimento({ cliente_id, servicos })` (formato legado):

| Situação | Mensagem |
| --- | --- |
| Sem clientes | `Adicione pelo menos um cliente` |
| Grupo sem cliente | `Selecione o cliente` |
| Cliente repetido | `O mesmo cliente nao pode ser adicionado duas vezes` |
| Grupo sem serviços | `Adicione pelo menos um servico` |
| Linha sem serviço/aplicação | `Selecione o servico` / `Selecione a aplicacao` |
| Linha sem funcionário (serviço) | `Selecione o funcionario` |
| Preço inválido (serviço) | `Indique um valor maior que zero` |
| Preço inválido (aplicação) | `Indique um valor valido` |
| Serviço gratuito acima de 200 MT | `O servico gratuito nao pode ultrapassar 200 MT` |
| Mais de um serviço gratuito por cliente | `So e possivel marcar um servico gratis por cliente` |
| Mais de um serviço selecionado para fidelização por cliente | `So e possivel escolher um servico para fidelizacao por cliente` |

Os erros usam o `uid` do grupo/linha (`cliente_<uid>`, `servicos_<uid>`,
`servico_<uid>`, `funcionario_<uid>`, `preco_<uid>`, `fidelizacao_<uid>`).

## Fidelização

Constantes partilhadas entre frontend e backend:

- `META_FIDELIZACAO = 5`
- `LIMITE_FIDELIZACAO = 200`

`servicoContaParaFidelizacao(servico)` devolve `true` apenas quando:

- `elegivel_fidelizacao` está activo;
- o valor é numérico, maior que zero e **até 200 MT**.

`validarElegibilidadeFidelizacao(valor, elegivel_fidelizacao)`:

| Situação | Mensagem |
| --- | --- |
| Valor ≤ 0 | `O valor do servico deve ser maior que zero` |
| Valor > 200 com elegibilidade activa | `Servicos elegiveis para fidelizacao nao podem custar mais de 200 MT` |

## Horários

- `validarDiaSemana(dia)`: inteiro de `0` (Domingo) a `6` (Sábado).
- `validarHora(hora, campo)`: formato `HH:MM` (aceita também `HH:MM:SS` na conversão).
- `horaParaMinutos(hora)`: converte para minutos desde a meia-noite ou devolve `null`.
- `horariosSobrepostos(a, b)`: `true` quando dois turnos do mesmo dia se cruzam. Turnos
  encostados (um termina quando o outro começa) **não** se sobrepõem.

Mensagens:

| Situação | Mensagem |
| --- | --- |
| Dia em falta | `O dia da semana e obrigatorio` |
| Dia fora de 0–6 | `O dia da semana deve estar entre 0 (domingo) e 6 (sabado)` |
| Hora em falta | `O campo <campo> e obrigatorio` |
| Hora inválida | `O campo <campo> deve estar no formato HH:MM` |

## Estrutura das respostas

- **Frontend:** as funções compostas devolvem `{ campo: mensagem }` (só com os campos
  inválidos).
- **Backend:** devolve `400 { "field": "<nome>", "message": "<mensagem>" }` quando a
  falha está associada a um campo, ou `400 { "message": "..." }` para erros genéricos.

O frontend dá prioridade ao erro de validação local e, na sua ausência, mostra o erro do
backend realçando o campo indicado (`errorField`).

> A validação de formato no backend está concentrada sobretudo em `auth` (nome, telefone e
> senha), nos campos de `clientes` (sexo/idade, com normalização do telefone), nos
> preços/benefícios de `atendimentos` e nos horários. Noutros recursos, o backend valida
> sobretudo campos obrigatórios e deixa o formato ao frontend.
