import db from '../db/client.js';
import Salario from '../repository/salario.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';
import { sql } from 'drizzle-orm';

//derivar o intervalo aqui evita que cada cliente envie datas de inicio/fim inconsistentes
function periodoMensal(periodo) {
    const match = /^(\d{4})-(\d{2})$/.exec(periodo || "");

    if (!match) {
        throw criarErro(400, "O periodo deve estar no formato AAAA-MM");
    }

    const mes = Number(match[2]);
    if (mes < 1 || mes > 12) {
        throw criarErro(400, "Mes invalido");
    }

    const ultimoDia = new Date(Number(match[1]), mes, 0).getDate();
    return {
        inicio: `${match[1]}-${match[2]}-01`,
        fim: `${match[1]}-${match[2]}-${String(ultimoDia).padStart(2, "0")}`
    };
}

//so funcionarios ativos entram: um administrador sem vinculo nao recebe salario nem comissao (RF17)
const processar = async (periodo, registado_por) => {
    const { inicio, fim } = periodoMensal(periodo);

    return db.transaction(async (tx) => {
        const funcionarios = await Salario.findFuncionariosAtivos(tx);
        const criados = [];

        for (const funcionario of funcionarios) {
            const comissoes = await Salario.somaComissoes(tx, funcionario.id, inicio, fim);
            const base = funcionario.salario;

            const id = await Salario.inserirProcessamento(tx, {
                funcionario_id: funcionario.id,
                periodo_inicio: inicio,
                periodo_fim: fim,
                salario_base: base,
                total_comissoes: comissoes,
                total_deducoes: 0,
                total_a_pagar: base + comissoes
            });

            if (id) {
                criados.push(id);
                await AuditoriaService.registar({
                    id_utilizador: registado_por,
                    entidade: "processamento_salarial",
                    id_registo: id,
                    operacao: "criar",
                    depois: { funcionario_id: funcionario.id, periodo_inicio: inicio, periodo_fim: fim, salario_base: base, total_comissoes: comissoes, total_a_pagar: base + comissoes }
                }, tx);
            }
        }

        const processamentos = await Salario.findProcessamentos({ periodo }, tx);
        const reducoes = await computarReducoesAssiduidade(periodo, tx);
        await aplicarReducoesNosProcessamentos(
            tx,
            periodo,
            registado_por,
            processamentos,
            reducoes
        );

        return criados;
    });
};

//so em Preparado: depois de aprovado o salario deixa de poder mudar (RF19)
const atualizarDeducoes = async (processamento_id, deducoes, registado_por) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Preparado") {
        throw criarErro(409, "So processamentos em Preparado podem ser alterados");
    }

    await db.transaction(async (tx) => {
        await Salario.substituirDeducoes(tx, processamento_id, deducoes, registado_por);
        await Salario.recalcular(tx, processamento_id);

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "processamento_salarial",
            id_registo: processamento_id,
            operacao: "atualizar_deducoes",
            depois: { deducoes: deducoes.length, total: deducoes.reduce((s, d) => s + Number(d.valor), 0) }
        }, tx);
    });

    return Salario.findProcessamentoById(processamento_id);
};

//Preparado -> Aprovado (RF19; requer salarios:aprovar)
const aprovar = async (processamento_id, aprovado_por) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Preparado") {
        throw criarErro(409, "So processamentos em Preparado podem ser aprovados");
    }

    await db.transaction(async (tx) => {
        await Salario.aprovar(processamento_id, aprovado_por, tx);

        await AuditoriaService.registar({
            id_utilizador: aprovado_por,
            entidade: "processamento_salarial",
            id_registo: processamento_id,
            operacao: "aprovar",
            antes: { estado: processamento.estado },
            depois: { estado: "Aprovado" }
        }, tx);
    });

    return Salario.findProcessamentoById(processamento_id);
};

//ao pagar, as comissoes do periodo passam a pagas para nao voltarem a ser contadas
const pagar = async (processamento_id, registado_por) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Aprovado") {
        throw criarErro(409, "So processamentos aprovados podem ser pagos");
    }

    await db.transaction(async (tx) => {
        await Salario.pagar(processamento_id, tx);
        await Salario.marcarComissoesPagas(
            tx,
            processamento.funcionario_id,
            processamento.periodo_inicio,
            processamento.periodo_fim
        );

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "processamento_salarial",
            id_registo: processamento_id,
            operacao: "pagar",
            antes: { estado: processamento.estado },
            depois: { estado: "Pago", total_a_pagar: processamento.total_a_pagar }
        }, tx);
    });

    return Salario.findProcessamentoById(processamento_id);
};


//Regra de reducao por assiduidade. Efetividade = trabalhadas / previstas * 100
//(calculo definido em HorarioPage, onde as horas previstas por dia sao 10h).
//As horas previstas sao somadas em minutos para nao depender de fracoes de hora.
export const MINUTOS_PREVISTAS_DIA = 10 * 60;
export const TIPO_DEDUCAO_ASSIDUIDADE = 'reducao_assiduidade';

// (tabela do enunciado: >=95% -> 0%, 90-94.9% -> 5%, 80-89.9% -> 10%, <80% -> 15%)
const REDUCAO_POR_ASSIDUIDADE = [
    { minEfetividade: 95, reducao: 0 },
    { minEfetividade: 90, reducao: 0.05 },
    { minEfetividade: 80, reducao: 0.10 },
    { minEfetividade: 0,  reducao: 0.15 },
];

function obterTaxaReducao(efetividade) {
    return REDUCAO_POR_ASSIDUIDADE.find((r) => efetividade >= r.minEfetividade)?.reducao ?? 0;
}

//Calcula, para cada funcionario ativo, a efetividade a partir do registo diario de
//assiduidade e a reducao de salario que resulta, sem gravar nada.
//Devolve todos os funcionarios (mesmo com reducao 0) para o relatorio poder mostrar
//a efetividade; quem aplica decide o que fazer com valor 0.
export const computarReducoesAssiduidade = async (periodo, executor = db) => {
    const { inicio, fim } = periodoMensal(periodo);
    const resultado = await executor.execute(sql`
        select
            f.id as funcionario_id,
            f.nome as funcionario_nome,
            f.salario as salario_base,
            coalesce(sum(
                case
                    when (
                        a.tipo_ocorrencia is null
                        or a.tipo_ocorrencia not in (
                            'falta_justificada',
                            'falta_injustificada',
                            'ausencia',
                            'sem_registo'
                        )
                    )
                    and a.hora_entrada_real is not null
                    and a.hora_saida_real is not null
                    and a.hora_saida_real > a.hora_entrada_real
                    then (
                        extract(epoch from a.hora_saida_real)
                        - extract(epoch from a.hora_entrada_real)
                    )::int
                    else 0
                end
            ), 0)::int as trabalhadas_segundos,
            count(*) filter (
                where (
                    a.tipo_ocorrencia in (
                        'falta_justificada',
                        'falta_injustificada',
                        'ausencia',
                        'sem_registo'
                    )
                    or (
                        a.hora_entrada_real is not null
                        and a.hora_saida_real is not null
                        and a.hora_saida_real > a.hora_entrada_real
                    )
                )
            ) * ${MINUTOS_PREVISTAS_DIA} as previstas_minutos,
            exists (
                select 1
                  from processamento_salarial p
                 where p.funcionario_id = f.id
                   and to_char(p.periodo_inicio, 'YYYY-MM') = ${periodo}
            ) as tem_processamento
        from funcionario f
        left join assiduidade a
            on a.funcionario_id = f.id
           and a.data >= ${inicio}
           and a.data <= ${fim}
        where f.estado = 'Ativo'
        group by f.id, f.nome, f.salario
        order by f.nome
    `);

    return resultado.rows.map((linha) => {
        const trabalhadasMin = Number(linha.trabalhadas_segundos) / 60;
        const previstasMin = Number(linha.previstas_minutos) || 0;
        const semRegistos = previstasMin === 0;
        const efetividade = semRegistos ? null : (trabalhadasMin / previstasMin) * 100;
        const taxa = semRegistos ? 0 : obterTaxaReducao(efetividade);
        const valor = Math.round(Number(linha.salario_base) * taxa);
        return {
            funcionario_id: Number(linha.funcionario_id),
            funcionario_nome: linha.funcionario_nome,
            salario_base: Number(linha.salario_base),
            trabalhadas: trabalhadasMin,
            previstas: previstasMin,
            efetividade,
            reducaoPercentual: taxa * 100,
            valor,
            semRegistos,
            temProcessamento: Boolean(linha.tem_processamento),
            tipo: TIPO_DEDUCAO_ASSIDUIDADE,
            descricao: semRegistos
                ? "Sem registos de assiduidade no periodo"
                : `Reducao por assiduidade (efetividade ${efetividade.toFixed(1)}%)`
        };
    });
};

async function aplicarReducoesNosProcessamentos(tx, periodo, registado_por, processamentos, reducoes) {
    const reducoesPorFuncionario = new Map(reducoes.map((r) => [r.funcionario_id, r]));
    const atualizacoes = [];
    const ignorados = [];
    const aplicadas = [];

    for (const processamento of processamentos) {
        if (processamento.estado !== 'Preparado') {
            ignorados.push({ processamento_id: processamento.id, estado: processamento.estado });
            continue;
        }

        const reducao = reducoesPorFuncionario.get(processamento.funcionario_id);
        if (!reducao) continue;

        await Salario.removerDeducoesPorTipo(tx, processamento.id, TIPO_DEDUCAO_ASSIDUIDADE);

        if (reducao.valor > 0) {
            await Salario.inserirDeducao(tx, {
                processamento_id: processamento.id,
                tipo: TIPO_DEDUCAO_ASSIDUIDADE,
                descricao: reducao.descricao,
                valor: reducao.valor,
                motivo: `Assiduidade: efetividade ${reducao.efetividade.toFixed(1)}% -> reducao ${reducao.reducaoPercentual.toFixed(1)}%`,
                aprovado_por: registado_por
            });
            aplicadas.push({
                funcionario_id: reducao.funcionario_id,
                efetividade: reducao.efetividade,
                reducaoPercentual: reducao.reducaoPercentual,
                valor: reducao.valor
            });
        }

        await Salario.recalcular(tx, processamento.id);
        atualizacoes.push(await Salario.findProcessamentoById(processamento.id, tx));
    }

    await AuditoriaService.registar({
        id_utilizador: registado_por,
        entidade: 'processamento_salarial',
        id_registo: null,
        operacao: 'reducao_assiduidade',
        antes: null,
        depois: { periodo, reducoes: aplicadas }
    }, tx);

    return { atualizacoes, ignorados, aplicadas };
}

//Calcula e aplica as reducoes de assiduidade aos processamentos do periodo.
//A reducao e guardada como deducaoSalarial (tipo 'reducao_assiduidade'); antes de
//gravar remove a reducao anterior do mesmo tipo, para o calculo poder ser repetido
//sem duplicar o desconto. As deducoes manuais existentes nao sao tocadas e apenas
//processamentos em Preparado sao alterados (os aprovados/pagos ficam fechados).
export const aplicarReducoesAssiduidade = async (periodo, registado_por, executor = null) => {
    const aplicar = async (tx) => {
        const reducoes = await computarReducoesAssiduidade(periodo, tx);
        const processamentos = await Salario.findProcessamentos({ periodo }, tx);
        const comProcessamento = new Set(processamentos.map((p) => p.funcionario_id));
        const semProcessamento = reducoes.filter(
            (r) => r.valor > 0 && !comProcessamento.has(r.funcionario_id)
        ).length;
        const resultado = await aplicarReducoesNosProcessamentos(
            tx,
            periodo,
            registado_por,
            processamentos,
            reducoes
        );

        return { ...resultado, semProcessamento };
    };

    return executor ? aplicar(executor) : db.transaction(aplicar);
};

const SalarioService = {
    processar,
    atualizarDeducoes,
    aprovar,
    pagar,
    computarReducoesAssiduidade,
    aplicarReducoesAssiduidade
};

export default SalarioService;
