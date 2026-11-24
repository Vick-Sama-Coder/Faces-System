import assert from "node:assert/strict";
import test from "node:test";
import { agruparParcelasPorMetodo } from "../src/services/pagamento.js";
import {
    calcularSaldosPorMetodo,
    decidirAcaoAutomatica,
    validarSessaoDoDia
} from "../src/services/caixa.js";

test("agrupa parcelas de atendimento por método sem misturar os respetivos saldos", () => {
    const parcelas = [
        { metodo_pagamento: "Dinheiro", valor: 300 },
        { metodo_pagamento: "M-Pesa", valor: 250 },
        { metodo_pagamento: "Dinheiro", valor: 150 }
    ];

    assert.deepEqual(agruparParcelasPorMetodo(parcelas), [
        { metodo_pagamento: "Dinheiro", valor: 450 },
        { metodo_pagamento: "M-Pesa", valor: 250 }
    ]);
});

test("devolve lista vazia quando não existem parcelas", () => {
    assert.deepEqual(agruparParcelasPorMetodo([]), []);
});

test("bloqueia operacoes quando a sessao aberta e de um dia anterior", () => {
    assert.throws(
        () => validarSessaoDoDia({ data_abertura: new Date("2020-01-01T10:00:00") }),
        /dia anterior/
    );
});

test("aceita a sessao aberta no dia atual", () => {
    const sessao = { id: 1, data_abertura: new Date() };
    assert.equal(validarSessaoDoDia(sessao), sessao);
});

test("rejeita a ausencia de sessao aberta", () => {
    assert.throws(() => validarSessaoDoDia(null), /Nao existe caixa aberto/);
});

test("fecha automaticamente a sessao aberta de um dia anterior", () => {
    const agora = new Date(2026, 10, 24, 0, 1);
    const sessaoAberta = { data_abertura: new Date(2026, 10, 23, 9, 0) };

    assert.equal(decidirAcaoAutomatica({ agora, sessaoAberta }), "fechar");
});

test("mantem aberta a sessao iniciada no dia atual", () => {
    const agora = new Date(2026, 10, 24, 23, 0);
    const sessaoAberta = { data_abertura: new Date(2026, 10, 24, 8, 0) };

    assert.equal(decidirAcaoAutomatica({ agora, sessaoAberta }), null);
});

test("abre automaticamente a partir das 8h quando ainda nao houve sessao no dia", () => {
    const agora = new Date(2026, 10, 24, 8, 0);

    assert.equal(decidirAcaoAutomatica({ agora }), "abrir");
});

test("nao abre antes das 8h", () => {
    const agora = new Date(2026, 10, 24, 7, 59);

    assert.equal(decidirAcaoAutomatica({ agora }), null);
});

test("nao reabre o caixa depois de uma sessao ja ter existido no dia", () => {
    const agora = new Date(2026, 10, 24, 10, 0);

    assert.equal(decidirAcaoAutomatica({ agora, existeSessaoHoje: true }), null);
});

test("calcula saldos individuais e adiciona o saldo inicial apenas ao Dinheiro", () => {
    const saldos = calcularSaldosPorMetodo([
        { metodo_pagamento: "Dinheiro", saldo: 450 },
        { metodo_pagamento: "M-Pesa", saldo: 250 },
        { metodo_pagamento: "e-Mola", saldo: -100 }
    ], 500);

    assert.deepEqual(saldos, [
        { metodo_pagamento: "Dinheiro", saldo: 950, conferido_no_fecho: true },
        { metodo_pagamento: "M-Pesa", saldo: 250, conferido_no_fecho: false },
        { metodo_pagamento: "e-Mola", saldo: -100, conferido_no_fecho: false },
        { metodo_pagamento: "Cartao", saldo: 0, conferido_no_fecho: false },
        { metodo_pagamento: "Transferencia", saldo: 0, conferido_no_fecho: false },
        { metodo_pagamento: "Outro", saldo: 0, conferido_no_fecho: false }
    ]);
});
