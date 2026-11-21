import assert from "node:assert/strict";
import test from "node:test";
import { lerPaginacao } from "../src/middlewares/paginacao.js";

test("sem limit/offset nao ativa a paginacao", () => {
    assert.equal(lerPaginacao({}), null);
    assert.equal(lerPaginacao({ de: "2026-01-01" }), null);
});

test("normaliza limit e offset", () => {
    assert.deepEqual(lerPaginacao({ limit: "25", offset: "50" }), { limit: 25, offset: 50 });
    assert.deepEqual(lerPaginacao({ limit: "9999" }), { limit: 500, offset: 0 });
    assert.deepEqual(lerPaginacao({ offset: "-5" }), { limit: 100, offset: 0 });
});

test("usa valores seguros quando os parametros sao invalidos", () => {
    assert.deepEqual(lerPaginacao({ limit: "abc", offset: "xyz" }), { limit: 100, offset: 0 });
});
