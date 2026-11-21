import assert from "node:assert/strict";
import test from "node:test";
import { caminhoPermitidoSenhaPendente } from "../src/middlewares/auth.js";

test("permite o fluxo minimo de primeiro acesso", () => {
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/me"), true);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/primeiro-acesso"), true);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/alterar-senha"), true);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/logout"), true);
});

test("ignora query string e barras finais", () => {
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/me?x=1"), true);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/me/"), true);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/primeiro-acesso/"), true);
});

test("bloqueia as restantes rotas autenticadas", () => {
    assert.equal(caminhoPermitidoSenhaPendente("/api/clientes"), false);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/users"), false);
    assert.equal(caminhoPermitidoSenhaPendente("/api/dashboard?de=2026-01-01"), false);
    assert.equal(caminhoPermitidoSenhaPendente("/api/auth/me/extra"), false);
});

test("bloqueia caminhos vazios", () => {
    assert.equal(caminhoPermitidoSenhaPendente(undefined), false);
    assert.equal(caminhoPermitidoSenhaPendente(""), false);
    assert.equal(caminhoPermitidoSenhaPendente("/"), false);
});
