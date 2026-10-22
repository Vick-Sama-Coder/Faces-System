import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    comissao,
    deducaoSalarial,
    funcionario,
    processamentoSalarial
} from '../db/schema/index.js';

const campos = {
    id: processamentoSalarial.id,
    funcionario_id: processamentoSalarial.funcionario_id,
    funcionario_nome: funcionario.nome,
    periodo_inicio: processamentoSalarial.periodo_inicio,
    periodo_fim: processamentoSalarial.periodo_fim,
    salario_base: processamentoSalarial.salario_base,
    total_comissoes: processamentoSalarial.total_comissoes,
    total_deducoes: processamentoSalarial.total_deducoes,
    total_a_pagar: processamentoSalarial.total_a_pagar,
    estado: processamentoSalarial.estado,
    aprovado_por: processamentoSalarial.aprovado_por,
    data_aprovacao: processamentoSalarial.data_aprovacao,
    data_pagamento: processamentoSalarial.data_pagamento,
    criado_em: processamentoSalarial.criado_em
};

//filtros opcionais porque o processamento e procurado por mes, funcionario ou estado
const findProcessamentos = async ({ periodo, funcionario: funcionarioId, estado } = {}) => {
    const condicoes = [];

    if (periodo !== undefined && periodo !== null && periodo !== '') {
        condicoes.push(sql`to_char(${processamentoSalarial.periodo_inicio}, 'YYYY-MM') = ${periodo}`);
    }
    if (funcionarioId !== undefined && funcionarioId !== null && funcionarioId !== '') {
        condicoes.push(eq(processamentoSalarial.funcionario_id, funcionarioId));
    }
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(processamentoSalarial.estado, estado));
    }

    return db.select(campos)
        .from(processamentoSalarial)
        .innerJoin(funcionario, eq(funcionario.id, processamentoSalarial.funcionario_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${processamentoSalarial.periodo_inicio} desc`, asc(funcionario.nome));
};

const findProcessamentoById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(processamentoSalarial)
        .innerJoin(funcionario, eq(funcionario.id, processamentoSalarial.funcionario_id))
        .where(eq(processamentoSalarial.id, id))
        .limit(1);

    return linha || null;
};

const findDeducoes = async (processamento_id) => {
    return db.select({
        id: deducaoSalarial.id,
        processamento_id: deducaoSalarial.processamento_id,
        tipo: deducaoSalarial.tipo,
        descricao: deducaoSalarial.descricao,
        valor: deducaoSalarial.valor,
        motivo: deducaoSalarial.motivo,
        aprovado_por: deducaoSalarial.aprovado_por,
        criado_em: deducaoSalarial.criado_em
    })
        .from(deducaoSalarial)
        .where(eq(deducaoSalarial.processamento_id, processamento_id))
        .orderBy(asc(deducaoSalarial.id));
};

//---- recebem o executor para participarem na transacao do servico ----

const findFuncionariosAtivos = async (executor) => {
    return executor.select({
        id: funcionario.id,
        nome: funcionario.nome,
        salario: funcionario.salario
    })
        .from(funcionario)
        .where(eq(funcionario.estado, 'Ativo'))
        .orderBy(asc(funcionario.nome));
};

//excluir as ja pagas evita que a mesma comissao entre em dois processamentos (RN05)
const somaComissoes = async (executor, funcionario_id, periodo_inicio, periodo_fim) => {
    const [linha] = await executor.select({
        total: sql`coalesce(sum(${comissao.valor_comissao}), 0)::int`
    })
        .from(comissao)
        .where(and(
            eq(comissao.funcionario_id, funcionario_id),
            eq(comissao.estado, 'Elegivel'),
            sql`${comissao.criado_em}::date between ${periodo_inicio} and ${periodo_fim}`
        ));

    return linha.total;
};

//ignorar o conflito torna o processamento repetivel sem duplicar o mesmo periodo (indice unico)
const inserirProcessamento = async (tx, {
    funcionario_id,
    periodo_inicio,
    periodo_fim,
    salario_base,
    total_comissoes,
    total_deducoes,
    total_a_pagar
}) => {
    const [linha] = await tx.insert(processamentoSalarial)
        .values({
            funcionario_id,
            periodo_inicio,
            periodo_fim,
            salario_base,
            total_comissoes,
            total_deducoes,
            total_a_pagar
        })
        .onConflictDoNothing()
        .returning({ id: processamentoSalarial.id });

    return linha?.id || null;
};

const substituirDeducoes = async (tx, processamento_id, deducoes, aprovado_por) => {
    await tx.delete(deducaoSalarial)
        .where(eq(deducaoSalarial.processamento_id, processamento_id));

    if (deducoes.length === 0) {
        return;
    }

    await tx.insert(deducaoSalarial).values(
        deducoes.map((deducao) => ({
            processamento_id,
            tipo: deducao.tipo,
            descricao: deducao.descricao ?? null,
            valor: deducao.valor,
            motivo: deducao.motivo ?? null,
            aprovado_por
        }))
    );
};

//recalcular a partir das linhas evita guardar totais que divergem das deducoes
const recalcular = async (tx, processamento_id) => {
    await tx.execute(sql`
        update processamento_salarial p
           set total_deducoes = coalesce(t.total, 0),
               total_a_pagar = p.salario_base + p.total_comissoes - coalesce(t.total, 0)
          from (select ${processamento_id}::int as id) x
          left join (
               select processamento_id, sum(valor)::int as total
                 from deducao_salarial
                where processamento_id = ${processamento_id}
                group by processamento_id
          ) t on t.processamento_id = x.id
         where p.id = x.id
    `);
};

//---- mudancas de estado simples, fora de transacao (db) ----

const aprovar = async (id, aprovado_por, executor = db) => {
    const [linha] = await executor.update(processamentoSalarial)
        .set({
            estado: 'Aprovado',
            aprovado_por,
            data_aprovacao: sql`now()`
        })
        .where(eq(processamentoSalarial.id, id))
        .returning({ id: processamentoSalarial.id });

    return linha || null;
};

const pagar = async (id, executor = db) => {
    const [linha] = await executor.update(processamentoSalarial)
        .set({
            estado: 'Pago',
            data_pagamento: sql`now()`
        })
        .where(eq(processamentoSalarial.id, id))
        .returning({ id: processamentoSalarial.id });

    return linha || null;
};

//marcar como pagas ao liquidar o salario impede que voltem a entrar num proximo processamento
const marcarComissoesPagas = async (executor, funcionario_id, periodo_inicio, periodo_fim) => {
    await executor.update(comissao)
        .set({ estado: 'Paga' })
        .where(and(
            eq(comissao.funcionario_id, funcionario_id),
            eq(comissao.estado, 'Elegivel'),
            sql`${comissao.criado_em}::date between ${periodo_inicio} and ${periodo_fim}`
        ));
};

const Salario = {
    findProcessamentos,
    findProcessamentoById,
    findDeducoes,
    findFuncionariosAtivos,
    somaComissoes,
    inserirProcessamento,
    substituirDeducoes,
    recalcular,
    aprovar,
    pagar,
    marcarComissoesPagas
};

export default Salario;
