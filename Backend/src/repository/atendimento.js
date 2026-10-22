import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    atendimento,
    atendimentoServico,
    cliente,
    funcionario,
    servico
} from '../db/schema/index.js';

const campos = {
    id: atendimento.id,
    cliente_id: atendimento.cliente_id,
    cliente_nome: cliente.nome,
    data_hora: atendimento.data_hora,
    estado: atendimento.estado,
    valor_bruto: atendimento.valor_bruto,
    valor_desconto: atendimento.valor_desconto,
    valor_total: atendimento.valor_total,
    registado_por: atendimento.registado_por,
    motivo_anulacao: atendimento.motivo_anulacao
};

//listagem com filtros opcionais (periodo, cliente, funcionario, estado)
const findAll = async ({ de, ate, cliente: clienteId, funcionario: funcionarioId, estado } = {}) => {
    const condicoes = [];

    if (de) condicoes.push(sql`${atendimento.data_hora}::date >= ${de}`);
    if (ate) condicoes.push(sql`${atendimento.data_hora}::date <= ${ate}`);
    if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
        condicoes.push(eq(atendimento.cliente_id, clienteId));
    }
    if (funcionarioId !== undefined && funcionarioId !== null && funcionarioId !== '') {
        condicoes.push(inArray(
            atendimento.id,
            db.select({ id: atendimentoServico.atendimento_id })
                .from(atendimentoServico)
                .where(eq(atendimentoServico.funcionario_id, funcionarioId))
        ));
    }
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(atendimento.estado, estado));
    }

    return db.select(campos)
        .from(atendimento)
        .innerJoin(cliente, eq(cliente.id, atendimento.cliente_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${atendimento.data_hora} desc`);
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(atendimento)
        .innerJoin(cliente, eq(cliente.id, atendimento.cliente_id))
        .where(eq(atendimento.id, id))
        .limit(1);

    return linha || null;
};

const findServicos = async (atendimento_id) => {
    return db.select({
        id: atendimentoServico.id,
        servico_id: atendimentoServico.servico_id,
        servico_nome: servico.nome,
        funcionario_id: atendimentoServico.funcionario_id,
        funcionario_nome: funcionario.nome,
        preco_original: atendimentoServico.preco_original,
        tipo_preco: atendimentoServico.tipo_preco,
        valor_desconto: atendimentoServico.valor_desconto,
        valor_final: atendimentoServico.valor_final,
        estado: atendimentoServico.estado
    })
        .from(atendimentoServico)
        .innerJoin(servico, eq(servico.id, atendimentoServico.servico_id))
        .innerJoin(funcionario, eq(funcionario.id, atendimentoServico.funcionario_id))
        .where(eq(atendimentoServico.atendimento_id, atendimento_id))
        .orderBy(asc(atendimentoServico.id));
};

//---- operacoes usadas dentro de transacoes (recebem o tx) ----

const insertHeader = async (tx, { cliente_id, valor_bruto, valor_desconto, valor_total, registado_por }) => {
    const [linha] = await tx.insert(atendimento)
        .values({
            cliente_id,
            valor_bruto,
            valor_desconto,
            valor_total,
            registado_por
        })
        .returning({ id: atendimento.id });

    return linha.id;
};

const insertServico = async (tx, {
    atendimento_id,
    servico_id,
    funcionario_id,
    preco_original,
    tipo_preco,
    valor_desconto,
    valor_final,
    registado_por
}) => {
    const [linha] = await tx.insert(atendimentoServico)
        .values({
            atendimento_id,
            servico_id,
            funcionario_id,
            preco_original,
            tipo_preco: tipo_preco ?? null,
            valor_desconto,
            valor_final,
            registado_por
        })
        .returning({ id: atendimentoServico.id });

    return linha.id;
};

//recalcula os totais do cabecalho a partir das linhas ativas
const recalcular = async (tx, atendimento_id) => {
    await tx.execute(sql`
        update atendimento
           set valor_bruto = coalesce(t.bruto, 0),
               valor_desconto = coalesce(t.desconto, 0),
               valor_total = coalesce(t.total, 0)
          from (select ${atendimento_id}::int as id) x
          left join (
               select atendimento_id,
                      sum(preco_original)::int as bruto,
                      sum(valor_desconto)::int as desconto,
                      sum(valor_final)::int as total
                 from atendimento_servico
                where atendimento_id = ${atendimento_id} and estado = 'Ativo'
                group by atendimento_id
          ) t on t.atendimento_id = x.id
         where atendimento.id = x.id
    `);
};

const findServicoItem = async (tx, item_id) => {
    const [linha] = await tx.select({
        id: atendimentoServico.id,
        atendimento_id: atendimentoServico.atendimento_id
    })
        .from(atendimentoServico)
        .where(eq(atendimentoServico.id, item_id))
        .limit(1);

    return linha || null;
};

const deleteServicoItem = async (tx, item_id) => {
    await tx.delete(atendimentoServico)
        .where(eq(atendimentoServico.id, item_id));
};

//---- atualizacoes simples (db) ----

const updateHeader = async (id, { cliente_id }) => {
    if (cliente_id === undefined || cliente_id === null) {
        const [linha] = await db.select({ id: atendimento.id })
            .from(atendimento)
            .where(eq(atendimento.id, id))
            .limit(1);

        return linha || null;
    }

    const [linha] = await db.update(atendimento)
        .set({ cliente_id })
        .where(eq(atendimento.id, id))
        .returning({ id: atendimento.id });

    return linha || null;
};

const updateEstado = async (id, { estado, motivo_anulacao }, executor = db) => {
    const valores = { estado };

    if (motivo_anulacao !== undefined && motivo_anulacao !== null) {
        valores.motivo_anulacao = motivo_anulacao;
    }

    const [linha] = await executor.update(atendimento)
        .set(valores)
        .where(eq(atendimento.id, id))
        .returning({
            id: atendimento.id,
            estado: atendimento.estado
        });

    return linha || null;
};

const Atendimento = {
    findAll,
    findById,
    findServicos,
    insertHeader,
    insertServico,
    recalcular,
    findServicoItem,
    deleteServicoItem,
    updateHeader,
    updateEstado
};

export default Atendimento;
