import assert from "node:assert/strict";
import test from "node:test";
import {
    normalizarAusencias,
    validarAusenciasDoDia
} from "../src/utils/assiduidade.js";

const erro400 = (error) => error.status === 400;

test("normaliza, ordena e calcula os minutos das ausências parciais", () => {
    const ausencias = normalizarAusencias([
        { hora_inicio: "15:00", hora_fim: "16:30", motivo: " Consulta " },
        { hora_inicio: "10:00:00", hora_fim: "11:15:00" }
    ]);

    assert.deepEqual(
        ausencias.map(({ hora_inicio, hora_fim, motivo, inicioMin, fimMin }) => ({
            hora_inicio,
            hora_fim,
            motivo,
            inicioMin,
            fimMin
        })),
        [
            { hora_inicio: "10:00", hora_fim: "11:15", motivo: null, inicioMin: 600, fimMin: 675 },
            { hora_inicio: "15:00", hora_fim: "16:30", motivo: "Consulta", inicioMin: 900, fimMin: 990 }
        ]
    );
});

test("undefined preserva as ausências e null limpa a lista", () => {
    assert.equal(normalizarAusencias(undefined), null);
    assert.deepEqual(normalizarAusencias(null), []);
});

test("rejeita ausências sobrepostas", () => {
    assert.throws(
        () => normalizarAusencias([
            { hora_inicio: "10:00", hora_fim: "12:00" },
            { hora_inicio: "11:30", hora_fim: "13:00" }
        ]),
        erro400
    );
});

test("rejeita intervalos inválidos ou sem horas", () => {
    assert.throws(() => normalizarAusencias([{ hora_inicio: "10:00" }]), erro400);
    assert.throws(
        () => normalizarAusencias([{ hora_inicio: "12:00", hora_fim: "10:00" }]),
        erro400
    );
});

test("exige entrada e saída e mantém as ausências dentro do horário", () => {
    const ausencias = normalizarAusencias([{ hora_inicio: "10:00", hora_fim: "11:00" }]);

    assert.throws(
        () => validarAusenciasDoDia(ausencias, null, "19:00", null),
        erro400
    );
    assert.throws(
        () => validarAusenciasDoDia(ausencias, "09:00", null, null),
        erro400
    );
    assert.throws(
        () => validarAusenciasDoDia(ausencias, "09:00", "10:30", null),
        erro400
    );
    assert.doesNotThrow(
        () => validarAusenciasDoDia(ausencias, "09:00", "19:00", null)
    );
});

test("não permite ausências parciais no mesmo dia de uma falta inteira", () => {
    const ausencias = normalizarAusencias([{ hora_inicio: "10:00", hora_fim: "11:00" }]);

    for (const tipo of ["falta_justificada", "falta_injustificada", "ausencia", "sem_registo"]) {
        assert.throws(
            () => validarAusenciasDoDia(ausencias, "09:00", "19:00", tipo),
            erro400
        );
    }
});
