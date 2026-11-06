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


//O salario base cobre 10 horas por cada dia do mes. As horas em falta sao
//descontadas proporcionalmente ao total de horas previstas no periodo. As
//ausencias parciais do dia sao subtraidas as horas entre entrada e saida.
export const MINUTOS_PREVISTAS_DIA = 10 * 60;
export const TIPO_DEDUCAO_ASSIDUIDADE = 'reducao_assiduidade';

//Calcula, para cada funcionario ativo, a efetividade a partir do registo diario de
//assiduidade e o desconto proporcional pelas horas mensais em falta, sem gravar nada.
//Devolve todos os funcionarios (mesmo com reducao 0) para o relatorio poder mostrar
//a efetividade; quem aplica decide o que fazer com valor 0.
export const computarReducoesAssiduidade = async (periodo, executor = db) => {
    const { inicio, fim } = periodoMensal(periodo);
    const diasNoMes = Number(fim.slice(-2));
    const previstasMin = diasNoMes * MINUTOS_PREVISTAS_DIA;
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
                    then greatest(0, (
                        extract(epoch from a.hora_saida_real)
                        - extract(epoch from a.hora_entrada_real)
                        - coalesce((
                            select sum(
                                extract(epoch from aa.hora_fim)
                                - extract(epoch from aa.hora_inicio)
                            )
                              from assiduidade_ausencia aa
                             where aa.assiduidade_id = a.id
                        ), 0)
                    ))::int
                    else 0
                end
            ), 0)::int as trabalhadas_segundos,
            count(a.id)::int as dias_com_registo,
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
        const horasEmFaltaMin = Math.max(0, previstasMin - trabalhadasMin);
        const salarioBase = Number(linha.salario_base);
        const efetividade = (trabalhadasMin / previstasMin) * 100;
        const valor = Math.round(salarioBase * horasEmFaltaMin / previstasMin);
        const reducaoPercentual = salarioBase > 0 ? (valor / salarioBase) * 100 : 0;
        const semRegistos = Number(linha.dias_com_registo) === 0;
        return {
            funcionario_id: Number(linha.funcionario_id),
            funcionario_nome: linha.funcionario_nome,
            salario_base: salarioBase,
            trabalhadas: trabalhadasMin,
            previstas: previstasMin,
            horasEmFalta: horasEmFaltaMin / 60,
            efetividade,
            reducaoPercentual,
            valor,
            semRegistos,
            temProcessamento: Boolean(linha.tem_processamento),
            tipo: TIPO_DEDUCAO_ASSIDUIDADE,
            descricao: `Desconto proporcional por assiduidade (${(horasEmFaltaMin / 60).toFixed(1)} horas em falta)`
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
                motivo: `Assiduidade: ${reducao.horasEmFalta.toFixed(1)} horas em falta (${reducao.reducaoPercentual.toFixed(1)}% do salario base)`,
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
