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

function linha(funcionario_id, trabalhadasMin, salario_base = 100_000, diasComRegisto = 31) {
    return {
        funcionario_id,
        funcionario_nome: `Funcionário ${funcionario_id}`,
        salario_base,
        trabalhadas_segundos: trabalhadasMin * 60,
        dias_com_registo: diasComRegisto,
        tem_processamento: true
    };
}

test("desconta proporcionalmente as horas mensais em falta e limita o desconto ao salário base", async () => {
    const executor = criarExecutor([
        linha(1, 300 * 60, 5_000),
        linha(2, 320 * 60, 5_000)
    ]);

    const reducoes = await computarReducoesAssiduidade("2026-10", executor);

    assert.deepEqual(
        reducoes.map(({ trabalhadas, previstas, horasEmFalta, efetividade, reducaoPercentual, valor, tipo }) => ({
            trabalhadas,
            previstas,
            horasEmFalta,
            efetividade,
            reducaoPercentual,
            valor,
            tipo
        })),
        [
            {
                trabalhadas: 18_000,
                previstas: 31 * MINUTOS_PREVISTAS_DIA,
                horasEmFalta: 10,
                efetividade: (300 / 310) * 100,
                reducaoPercentual: (161 / 5_000) * 100,
                valor: 161,
                tipo: TIPO_DEDUCAO_ASSIDUIDADE
            },
            {
                trabalhadas: 19_200,
                previstas: 31 * MINUTOS_PREVISTAS_DIA,
                horasEmFalta: 0,
                efetividade: (320 / 310) * 100,
                reducaoPercentual: 0,
                valor: 0,
                tipo: TIPO_DEDUCAO_ASSIDUIDADE
            }
        ]
    );
});

test("considera ausência de registos como zero horas trabalhadas e desconta o salário base", async () => {
    const executor = criarExecutor([linha(1, 0, 5_000, 0)]);

    const [reducao] = await computarReducoesAssiduidade("2026-10", executor);

    assert.equal(reducao.semRegistos, true);
    assert.equal(reducao.efetividade, 0);
    assert.equal(reducao.horasEmFalta, 310);
    assert.equal(reducao.reducaoPercentual, 100);
    assert.equal(reducao.valor, 5_000);
});

test("ajusta as horas previstas ao número de dias do mês", async () => {
    const executor = criarExecutor([linha(1, 280 * 60, 5_000, 29)]);

    const [reducao] = await computarReducoesAssiduidade("2024-02", executor);

    assert.equal(reducao.previstas, 29 * MINUTOS_PREVISTAS_DIA);
    assert.equal(reducao.horasEmFalta, 10);
    assert.equal(reducao.valor, 172);
});

test("conta faltas e sem_registo como zero horas efetivamente trabalhadas", async () => {
    const executor = criarExecutor([]);

    await computarReducoesAssiduidade("2026-10", executor);

    const consulta = executor.getQuery().sql;
    assert.match(consulta, /'falta_justificada'/);
    assert.match(consulta, /'falta_injustificada'/);
    assert.match(consulta, /'ausencia'/);
    assert.match(consulta, /'sem_registo'/);
    assert.match(consulta, /count\(a\.id\)::int as dias_com_registo/);
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
