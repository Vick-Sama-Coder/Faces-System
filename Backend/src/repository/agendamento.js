import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    agendamento,
    agendamentoReembolso,
    agendamentoServico,
    atendimento,
    atendimentoServico,
    categoriaSalao,
    cliente,
    funcionario,
    servico,
    usuario
} from '../db/schema/index.js';

// Valores derivados do pagamento e do saldo de servicos. Ficam em SQL para a
// listagem e o detalhe usarem exatamente a mesma definicao.
const valorPagoSql = sql`coalesce((
    select sum(pp.valor)::int
      from pagamento_parcela pp
      join pagamento p on p.id = pp.pagamento_id
     where p.agendamento_id = ${agendamento.id}
       and p.estado <> 'Anulado'
), 0)`;

const valorReembolsadoSql = sql`coalesce((
    select sum(r.valor)::int
      from agendamento_reembolso r
     where r.agendamento_id = ${agendamento.id}
), 0)`;

const valorCanceladoSql = sql`coalesce((
    select sum(s.quantidade_cancelada * s.preco_unitario)::int
      from agendamento_servico s
     where s.agendamento_id = ${agendamento.id}
), 0)`;

const quantidadeTotalSql = sql`coalesce((
    select sum(s.quantidade)::int
      from agendamento_servico s
     where s.agendamento_id = ${agendamento.id}
), 0)`;

const quantidadeConsumidaSql = sql`coalesce((
    select sum(s.quantidade_consumida)::int
      from agendamento_servico s
     where s.agendamento_id = ${agendamento.id}
), 0)`;

const quantidadeCanceladaSql = sql`coalesce((
    select sum(s.quantidade_cancelada)::int
      from agendamento_servico s
     where s.agendamento_id = ${agendamento.id}
), 0)`;

const quantidadeRestanteSql = sql`coalesce((
    select sum(s.quantidade - s.quantidade_consumida - s.quantidade_cancelada)::int
      from agendamento_servico s
     where s.agendamento_id = ${agendamento.id}
), 0)`;

const campos = {
    id: agendamento.id,
    cliente_id: agendamento.cliente_id,
    cliente_nome: cliente.nome,
    cliente_apelido: cliente.apelido,
    cliente_telefone: cliente.telefone,
    estado: agendamento.estado,
    valor_total: agendamento.valor_total,
    valor_cancelado: valorCanceladoSql,
    valor_devido: sql`${agendamento.valor_total} - ${valorCanceladoSql}`,
    valor_pago: valorPagoSql,
    valor_reembolsado: valorReembolsadoSql,
    valor_pago_liquido: sql`${valorPagoSql} - ${valorReembolsadoSql}`,
    saldo: sql`greatest(${agendamento.valor_total} - ${valorCanceladoSql} - (${valorPagoSql} - ${valorReembolsadoSql}), 0)`,
    quantidade_total: quantidadeTotalSql,
    quantidade_consumida: quantidadeConsumidaSql,
    quantidade_cancelada: quantidadeCanceladaSql,
    quantidade_restante: quantidadeRestanteSql,
    observacoes: agendamento.observacoes,
    registado_por: agendamento.registado_por,
    registado_por_nome: usuario.nome,
    criado_em: agendamento.criado_em,
    motivo_anulacao: agendamento.motivo_anulacao
};

const findAll = async ({ de, ate, cliente: clienteId, estado } = {}) => {
    const condicoes = [];

    if (de) condicoes.push(sql`${agendamento.criado_em}::date >= ${de}`);
    if (ate) condicoes.push(sql`${agendamento.criado_em}::date <= ${ate}`);
    if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
        condicoes.push(eq(agendamento.cliente_id, clienteId));
    }
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(agendamento.estado, estado));
    }

    return db.select(campos)
        .from(agendamento)
        .innerJoin(cliente, eq(cliente.id, agendamento.cliente_id))
        .leftJoin(usuario, eq(usuario.id, agendamento.registado_por))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${agendamento.criado_em} desc`);
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(agendamento)
        .innerJoin(cliente, eq(cliente.id, agendamento.cliente_id))
        .leftJoin(usuario, eq(usuario.id, agendamento.registado_por))
        .where(eq(agendamento.id, id))
        .limit(1);

    return linha || null;
};

const findServicos = async (agendamento_id, executor = db) => {
    return executor.select({
        id: agendamentoServico.id,
        agendamento_id: agendamentoServico.agendamento_id,
        cliente_id: agendamentoServico.cliente_id,
        servico_id: agendamentoServico.servico_id,
        servico_nome: servico.nome,
        servico_valor: servico.valor,
        servico_estado: servico.estado,
        categoria_nome: categoriaSalao.nome,
        elegivel_fidelizacao: servico.elegivel_fidelizacao,
        permite_aplicacoes: servico.permite_aplicacoes,
        modalidade_id: agendamentoServico.modalidade_id,
        modalidade_nome: agendamentoServico.modalidade_nome,
        tipo_servico: agendamentoServico.tipo_servico,
        preco_unitario: agendamentoServico.preco_unitario,
        quantidade: agendamentoServico.quantidade,
        quantidade_consumida: agendamentoServico.quantidade_consumida,
        quantidade_cancelada: agendamentoServico.quantidade_cancelada,
        quantidade_restante: sql`${agendamentoServico.quantidade} - ${agendamentoServico.quantidade_consumida} - ${agendamentoServico.quantidade_cancelada}`
    })
        .from(agendamentoServico)
        .innerJoin(servico, eq(servico.id, agendamentoServico.servico_id))
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .where(eq(agendamentoServico.agendamento_id, agendamento_id))
        .orderBy(asc(agendamentoServico.id));
};

const findReembolsos = async (agendamento_id, executor = db) => {
    return executor.select({
        id: agendamentoReembolso.id,
        agendamento_id: agendamentoReembolso.agendamento_id,
        valor: agendamentoReembolso.valor,
        metodo_pagamento: agendamentoReembolso.metodo_pagamento,
        motivo: agendamentoReembolso.motivo,
        registado_por: agendamentoReembolso.registado_por,
        registado_por_nome: usuario.nome,
        data_hora: agendamentoReembolso.data_hora
    })
        .from(agendamentoReembolso)
        .leftJoin(usuario, eq(usuario.id, agendamentoReembolso.registado_por))
        .where(eq(agendamentoReembolso.agendamento_id, agendamento_id))
        .orderBy(sql`${agendamentoReembolso.data_hora} desc`);
};

// Servicos efetivamente executados a partir deste agendamento. Cada unidade
// consumida gera uma linha propria no atendimento.
const findConsumos = async (agendamento_id, executor = db) => {
    return executor.select({
        atendimento_servico_id: atendimentoServico.id,
        atendimento_id: atendimentoServico.atendimento_id,
        atendimento_data_hora: atendimento.data_hora,
        agendamento_servico_id: atendimentoServico.agendamento_servico_id,
        servico_id: atendimentoServico.servico_id,
        servico_nome: servico.nome,
        funcionario_id: atendimentoServico.funcionario_id,
        funcionario_nome: funcionario.nome,
        modalidade_nome: atendimentoServico.modalidade_nome,
        tipo_servico: atendimentoServico.tipo_servico,
        preco_unitario: agendamentoServico.preco_unitario,
        criado_em: atendimentoServico.criado_em
    })
        .from(atendimentoServico)
        .innerJoin(atendimento, eq(atendimento.id, atendimentoServico.atendimento_id))
        .innerJoin(agendamentoServico, eq(agendamentoServico.id, atendimentoServico.agendamento_servico_id))
        .innerJoin(servico, eq(servico.id, atendimentoServico.servico_id))
        .innerJoin(funcionario, eq(funcionario.id, atendimentoServico.funcionario_id))
        .where(eq(agendamentoServico.agendamento_id, agendamento_id))
        .orderBy(sql`${atendimento.data_hora} desc`, sql`${atendimentoServico.id} desc`);
};

//bloqueia o cabecalho durante consumo/cancelamento para evitar dupla utilizacao
const findForUpdate = async (tx, id) => {
    const resultado = await tx.execute(sql`
        select id from agendamento where id = ${id} for update
    `);

    return resultado.rows[0] || null;
};

//---- operacoes usadas dentro de transacoes (recebem o tx) ----

const insertHeader = async (tx, {
    cliente_id,
    valor_total,
    observacoes,
    registado_por
}) => {
    const [linha] = await tx.insert(agendamento)
        .values({
            cliente_id,
            valor_total,
            observacoes: observacoes ?? null,
            registado_por
        })
        .returning({ id: agendamento.id });

    return linha.id;
};

const insertServico = async (tx, {
    agendamento_id,
    cliente_id,
    servico_id,
    modalidade_id,
    modalidade_nome,
    tipo_servico,
    preco_unitario,
    quantidade,
    registado_por
}) => {
    const [linha] = await tx.insert(agendamentoServico)
        .values({
            agendamento_id,
            cliente_id,
            servico_id,
            modalidade_id: modalidade_id ?? null,
            modalidade_nome: modalidade_nome ?? null,
            tipo_servico: tipo_servico ?? 'Servico',
            preco_unitario,
            quantidade,
            registado_por
        })
        .returning({ id: agendamentoServico.id });

    return linha.id;
};

const insertReembolso = async (tx, {
    agendamento_id,
    valor,
    metodo_pagamento,
    motivo,
    registado_por
}) => {
    const [linha] = await tx.insert(agendamentoReembolso)
        .values({
            agendamento_id,
            valor,
            metodo_pagamento,
            motivo,
            registado_por
        })
        .returning({ id: agendamentoReembolso.id });

    return linha.id;
};

const incrementarConsumo = async (tx, item_id, quantidade) => {
    await tx.execute(sql`
        update agendamento_servico
           set quantidade_consumida = quantidade_consumida + ${quantidade}
         where id = ${item_id}
    `);
};

const incrementarCancelamento = async (tx, item_id, quantidade) => {
    await tx.execute(sql`
        update agendamento_servico
           set quantidade_cancelada = quantidade_cancelada + ${quantidade}
         where id = ${item_id}
    `);
};

const updateEstado = async (executor, id, { estado, motivo_anulacao }) => {
    const valores = { estado };

    if (motivo_anulacao !== undefined && motivo_anulacao !== null) {
        valores.motivo_anulacao = motivo_anulacao;
    }

    const [linha] = await executor.update(agendamento)
        .set(valores)
        .where(eq(agendamento.id, id))
        .returning({
            id: agendamento.id,
            estado: agendamento.estado
        });

    return linha || null;
};

const Agendamento = {
    findAll,
    findById,
    findServicos,
    findReembolsos,
    findConsumos,
    findForUpdate,
    insertHeader,
    insertServico,
    insertReembolso,
    incrementarConsumo,
    incrementarCancelamento,
    updateEstado
};

export default Agendamento;
