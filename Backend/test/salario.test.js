import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import {
    computarReducoesAssiduidade,
    MINUTOS_PREVISTAS_DIA,
    TIPO_DEDUCAO_ASSIDUIDADE
} from "../src/services/salario.js";

function criarExecutor(rows) {
    let query;

    return {
        async execute(sql) {
            query = new PgDialect().sqlToQuery(sql);
            return { rows };
        },
        getQuery() {
            return query;
        }
    };
}

function linha(funcionario_id, trabalhadasMin, previstasDias, salario_base = 100_000) {
    return {
        funcionario_id,
        funcionario_nome: `Funcionário ${funcionario_id}`,
        salario_base,
        trabalhadas_segundos: trabalhadasMin * 60,
        previstas_minutos: previstasDias * MINUTOS_PREVISTAS_DIA,
        tem_processamento: true
    };
}

test("calcula escalões de redução e valor em função da efetividade", async () => {
    const executor = criarExecutor([
        linha(1, 570, 1),
        linha(2, 540, 1),
        linha(3, 480, 1),
        linha(4, 479, 1)
    ]);

    const reducoes = await computarReducoesAssiduidade("2026-10", executor);

    assert.deepEqual(
        reducoes.map(({ efetividade, reducaoPercentual, valor, tipo }) => ({
            efetividade,
            reducaoPercentual,
            valor,
            tipo
        })),
        [
            { efetividade: 95, reducaoPercentual: 0, valor: 0, tipo: TIPO_DEDUCAO_ASSIDUIDADE },
            { efetividade: 90, reducaoPercentual: 5, valor: 5_000, tipo: TIPO_DEDUCAO_ASSIDUIDADE },
            { efetividade: 80, reducaoPercentual: 10, valor: 10_000, tipo: TIPO_DEDUCAO_ASSIDUIDADE },
            {
                efetividade: (479 / 600) * 100,
                reducaoPercentual: 15,
                valor: 15_000,
                tipo: TIPO_DEDUCAO_ASSIDUIDADE
            }
        ]
    );
});

test("não aplica redução quando não existem registos elegíveis", async () => {
    const executor = criarExecutor([linha(1, 0, 0)]);

    const [reducao] = await computarReducoesAssiduidade("2026-10", executor);

    assert.equal(reducao.semRegistos, true);
    assert.equal(reducao.efetividade, null);
    assert.equal(reducao.reducaoPercentual, 0);
    assert.equal(reducao.valor, 0);
});

test("inclui falta, ausência e sem_registo na consulta de dias previstos", async () => {
    const executor = criarExecutor([]);

    await computarReducoesAssiduidade("2026-10", executor);

    const consulta = executor.getQuery().sql;
    assert.match(consulta, /'falta_justificada'/);
    assert.match(consulta, /'falta_injustificada'/);
    assert.match(consulta, /'ausencia'/);
    assert.match(consulta, /'sem_registo'/);
});

test("rejeita período inválido antes de consultar a base de dados", async () => {
    let consultado = false;
    const executor = {
        async execute() {
            consultado = true;
            return { rows: [] };
        }
    };

    await assert.rejects(
        computarReducoesAssiduidade("2026-13", executor),
        (error) => error.status === 400
    );
    assert.equal(consultado, false);
});
