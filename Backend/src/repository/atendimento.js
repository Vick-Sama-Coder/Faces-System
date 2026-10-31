import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    atendimento,
    atendimentoServico,
    categoriaSalao,
    cliente,
    descontoAtendimento,
    funcionario,
    movimentoFidelizacao,
    servico,
    servicoModalidade,
    usuario
} from '../db/schema/index.js';

const campos = {
    id: atendimento.id,
    cliente_id: atendimento.cliente_id,
    cliente_nome: cliente.nome,
    cliente_apelido: cliente.apelido,
    cliente_telefone: cliente.telefone,
    data_hora: atendimento.data_hora,
    estado: atendimento.estado,
    valor_bruto: atendimento.valor_bruto,
    valor_desconto: atendimento.valor_desconto,
    valor_total: atendimento.valor_total,
    registado_por: atendimento.registado_por,
    registado_por_nome: usuario.nome,
    motivo_anulacao: atendimento.motivo_anulacao,
    total_clientes: sql`greatest(coalesce((
        select count(distinct asv.cliente_id)::int
          from atendimento_servico asv
         where asv.atendimento_id = ${atendimento.id}
           and asv.estado = 'Ativo'
    ), 0), 1)`,
    clientes_nomes: sql`coalesce((
        select string_agg(distinct concat_ws(' ', c2.nome, c2.apelido), ', ')
          from atendimento_servico asv
          join cliente c2 on c2.id = asv.cliente_id
         where asv.atendimento_id = ${atendimento.id}
           and asv.estado = 'Ativo'
    ), concat_ws(' ', ${cliente.nome}, ${cliente.apelido}))`,
    valor_pago: sql`coalesce((
        select sum(pp.valor)::int
          from pagamento_parcela pp
          join pagamento p on p.id = pp.pagamento_id
         where p.atendimento_id = ${atendimento.id}
           and p.estado <> 'Anulado'
    ), 0)`,
    metodos_pagamento: sql`coalesce((
        select string_agg(distinct pp.metodo_pagamento, ', ')
          from pagamento_parcela pp
          join pagamento p on p.id = pp.pagamento_id
         where p.atendimento_id = ${atendimento.id}
           and p.estado <> 'Anulado'
    ), '')`,
    tem_cartao_fidelizacao: sql`exists(
        select 1
          from cartao_fidelizacao cf
         where cf.cliente_id = ${atendimento.cliente_id}
           and cf.estado = 'Ativo'
    )`
};

//listagem com filtros opcionais (periodo, cliente, funcionario, estado)
const findAll = async ({ de, ate, cliente: clienteId, funcionario: funcionarioId, estado } = {}) => {
    const condicoes = [];

    if (de) condicoes.push(sql`${atendimento.data_hora}::date >= ${de}`);
    if (ate) condicoes.push(sql`${atendimento.data_hora}::date <= ${ate}`);
    if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
        // O cliente pode ser o principal (cabecalho) ou um cliente adicional
        // com servicos no mesmo atendimento.
        condicoes.push(or(
            eq(atendimento.cliente_id, clienteId),
            inArray(
                atendimento.id,
                db.select({ id: atendimentoServico.atendimento_id })
                    .from(atendimentoServico)
                    .where(eq(atendimentoServico.cliente_id, clienteId))
            )
        ));
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
        .leftJoin(usuario, eq(usuario.id, atendimento.registado_por))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${atendimento.data_hora} desc`);
};

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(atendimento)
        .innerJoin(cliente, eq(cliente.id, atendimento.cliente_id))
        .leftJoin(usuario, eq(usuario.id, atendimento.registado_por))
        .where(eq(atendimento.id, id))
        .limit(1);

    return linha || null;
};

const findServicos = async (atendimento_id) => {
    return db.select({
        id: atendimentoServico.id,
        atendimento_id: atendimentoServico.atendimento_id,
        cliente_id: atendimentoServico.cliente_id,
        cliente_nome: cliente.nome,
        cliente_apelido: cliente.apelido,
        servico_id: atendimentoServico.servico_id,
        servico_nome: servico.nome,
        categoria_nome: categoriaSalao.nome,
        funcionario_id: atendimentoServico.funcionario_id,
        funcionario_nome: funcionario.nome,
        modalidade_id: atendimentoServico.modalidade_id,
        modalidade_nome: atendimentoServico.modalidade_nome,
        tipo_servico: atendimentoServico.tipo_servico,
        servico_principal_id: atendimentoServico.servico_principal_id,
        preco_original: atendimentoServico.preco_original,
        tipo_preco: atendimentoServico.tipo_preco,
        elegivel_fidelizacao: servico.elegivel_fidelizacao,
        fidelizacao_selecionada: atendimentoServico.fidelizacao_selecionada,
        valor_desconto: atendimentoServico.valor_desconto,
        valor_final: atendimentoServico.valor_final,
        estado: atendimentoServico.estado
    })
        .from(atendimentoServico)
        .innerJoin(servico, eq(servico.id, atendimentoServico.servico_id))
        .innerJoin(categoriaSalao, eq(categoriaSalao.id, servico.categoria_id))
        .innerJoin(funcionario, eq(funcionario.id, atendimentoServico.funcionario_id))
        .innerJoin(cliente, eq(cliente.id, atendimentoServico.cliente_id))
        .where(eq(atendimentoServico.atendimento_id, atendimento_id))
        .orderBy(asc(atendimentoServico.id));
};

// Clientes envolvidos no atendimento, com o subtotal dos servicos de cada um.
// O subtotal inclui aplicacoes, porque estas sao linhas faturaveis do servico.
const findClientes = async (atendimento_id) => {
    return db.select({
        cliente_id: atendimentoServico.cliente_id,
        cliente_nome: cliente.nome,
        cliente_apelido: cliente.apelido,
        cliente_telefone: cliente.telefone,
        subtotal: sql`coalesce(sum(${atendimentoServico.valor_final}), 0)::int`,
        total_servicos: sql`(count(*) filter (where ${atendimentoServico.tipo_servico} = 'Servico'))::int`,
        total_aplicacoes: sql`(count(*) filter (where ${atendimentoServico.tipo_servico} = 'Aplicacao'))::int`,
        fidelizacao_servico_id: sql`(max(${atendimentoServico.id}) filter (where ${atendimentoServico.fidelizacao_selecionada} = true))::int`
    })
        .from(atendimentoServico)
        .innerJoin(cliente, eq(cliente.id, atendimentoServico.cliente_id))
        .where(and(
            eq(atendimentoServico.atendimento_id, atendimento_id),
            eq(atendimentoServico.estado, 'Ativo')
        ))
        .groupBy(
            atendimentoServico.cliente_id,
            cliente.nome,
            cliente.apelido,
            cliente.telefone
        )
        .orderBy(sql`min(${atendimentoServico.id})`);
};

// Buscar descontos aplicados a um atendimento
const findDescontos = async (atendimento_id) => {
    return db.select({
        id: descontoAtendimento.id,
        atendimento_id: descontoAtendimento.atendimento_id,
        atendimento_servico_id: descontoAtendimento.atendimento_servico_id,
        escopo: descontoAtendimento.escopo,
        tipo: descontoAtendimento.tipo,
        percentagem: descontoAtendimento.percentagem,
        valor_bruto: descontoAtendimento.valor_bruto,
        valor_desconto: descontoAtendimento.valor_desconto,
        valor_final: descontoAtendimento.valor_final,
        aplicado_por: descontoAtendimento.aplicado_por,
        aplicado_por_nome: usuario.nome,
        criado_em: descontoAtendimento.criado_em
    })
        .from(descontoAtendimento)
        .leftJoin(usuario, eq(usuario.id, descontoAtendimento.aplicado_por))
        .where(eq(descontoAtendimento.atendimento_id, atendimento_id))
        .orderBy(asc(descontoAtendimento.id));
};

// Verifica se o cliente já consumiu um benefício gratuito neste atendimento.
// A fidelização é individual: cada cliente tem o seu próprio benefício.
const temBeneficioFidelizacao = async (executor, atendimento_id, cliente_id = null) => {
    const condicoes = [
        eq(atendimentoServico.atendimento_id, atendimento_id),
        eq(movimentoFidelizacao.tipo_movimento, 'beneficio_utilizado')
    ];

    if (cliente_id !== null && cliente_id !== undefined) {
        condicoes.push(eq(atendimentoServico.cliente_id, cliente_id));
    }

    const linhas = await executor.select({ id: movimentoFidelizacao.id })
        .from(movimentoFidelizacao)
        .innerJoin(
            atendimentoServico,
            eq(atendimentoServico.id, movimentoFidelizacao.atendimento_servico_id)
        )
        .where(and(...condicoes))
        .limit(1);

    return linhas.length > 0;
};

// Verifica se o cliente já gerou uma marca de fidelização neste atendimento.
const temMarcaFidelizacao = async (executor, atendimento_id, cliente_id = null) => {
    const condicoes = [
        eq(atendimentoServico.atendimento_id, atendimento_id),
        eq(movimentoFidelizacao.tipo_movimento, 'marca')
    ];

    if (cliente_id !== null && cliente_id !== undefined) {
        condicoes.push(eq(atendimentoServico.cliente_id, cliente_id));
    }

    const linhas = await executor.select({ id: movimentoFidelizacao.id })
        .from(movimentoFidelizacao)
        .innerJoin(
            atendimentoServico,
            eq(atendimentoServico.id, movimentoFidelizacao.atendimento_servico_id)
        )
        .where(and(...condicoes))
        .limit(1);

    return linhas.length > 0;
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
    cliente_id,
    servico_id,
    servico_principal_id,
    funcionario_id,
    modalidade_id,
    modalidade_nome,
    tipo_servico,
    preco_original,
    tipo_preco,
    valor_desconto,
    valor_final,
    fidelizacao_selecionada = false,
    registado_por
}) => {
    const [linha] = await tx.insert(atendimentoServico)
        .values({
            atendimento_id,
            cliente_id,
            servico_id,
            servico_principal_id: servico_principal_id ?? null,
            funcionario_id,
            modalidade_id: modalidade_id ?? null,
            modalidade_nome: modalidade_nome ?? null,
            tipo_servico: tipo_servico ?? 'Servico',
            preco_original,
            tipo_preco: tipo_preco ?? null,
            valor_desconto,
            valor_final,
            fidelizacao_selecionada: fidelizacao_selecionada === true,
            registado_por
        })
        .returning({ id: atendimentoServico.id });

    return linha.id;
};

// Remove a selecao de fidelizacao de todas as linhas do cliente no
// atendimento. Usado quando o utilizador escolhe outro servico.
const limparSelecaoFidelizacao = async (tx, atendimento_id, cliente_id, exceptItemId = null) => {
    const condicoes = [
        eq(atendimentoServico.atendimento_id, atendimento_id),
        eq(atendimentoServico.cliente_id, cliente_id),
        eq(atendimentoServico.fidelizacao_selecionada, true)
    ];

    if (exceptItemId !== null && exceptItemId !== undefined) {
        condicoes.push(ne(atendimentoServico.id, exceptItemId));
    }

    await tx.update(atendimentoServico)
        .set({ fidelizacao_selecionada: false })
        .where(and(...condicoes));
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

// Inserir registo de desconto
const insertDesconto = async (tx, {
    atendimento_id,
    atendimento_servico_id,
    escopo,
    tipo,
    percentagem,
    valor_bruto,
    valor_desconto,
    valor_final,
    aplicado_por
}) => {
    const [linha] = await tx.insert(descontoAtendimento)
        .values({
            atendimento_id,
            atendimento_servico_id,
            escopo,
            tipo,
            percentagem: percentagem ?? null,
            valor_bruto,
            valor_desconto,
            valor_final,
            aplicado_por
        })
        .returning({ id: descontoAtendimento.id });

    return linha.id;
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
    findClientes,
    findDescontos,
    insertHeader,
    insertServico,
    insertDesconto,
    recalcular,
    findServicoItem,
    deleteServicoItem,
    temBeneficioFidelizacao,
    temMarcaFidelizacao,
    limparSelecaoFidelizacao,
    updateHeader,
    updateEstado
};

export default Atendimento;