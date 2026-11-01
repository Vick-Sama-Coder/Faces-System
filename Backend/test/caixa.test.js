import assert from "node:assert/strict";
import test from "node:test";
import { agruparParcelasPorMetodo } from "../src/services/pagamento.js";
import { calcularSaldosPorMetodo } from "../src/services/caixa.js";

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
