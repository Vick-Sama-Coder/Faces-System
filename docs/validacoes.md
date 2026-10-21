# Validações

[← Voltar ao índice](./README.md)

As regras estão duplicadas intencionalmente:

- **Frontend:** `Frontend/src/utils/validacoes.js` (feedback imediato no formulário)
- **Backend:** `Backend/src/utils/validacoes.js` (fonte de verdade / segurança)

Ao alterar uma regra, actualize **os dois ficheiros**.

## Nome

- Obrigatório (não pode ser vazio).
- Entre **3 e 100** caracteres.
- Apenas **letras** (incluindo acentos `À-ÿ`) e **espaços**.

| Situação | Mensagem |
| --- | --- |
| Vazio | `Nome e obrigatorio` |
| Fora do intervalo | `Nome: use de 3 a 100 caracteres` |
| Caracteres inválidos | `Nome: use apenas letras e espacos` |

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

## Confirmação de senha (só frontend)

| Situação | Mensagem |
| --- | --- |
| Vazia | `Confirme a sua senha` |
| Diferente | `As senhas nao coincidem` |

## Estrutura das respostas

- **Frontend:** as funções `validarRegisto` e `validarLogin` devolvem
  `{ campo: mensagem }` (só com os campos inválidos).
- **Backend:** devolve `400 { "field": "<nome>", "message": "<mensagem>" }` quando a
  falha está associada a um campo, ou `400 { "message": "..." }` para erros genéricos.

O frontend dá prioridade ao erro de validação local e, na sua ausência, mostra o erro do
backend realçando o campo indicado (`errorField`).
