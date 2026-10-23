import { sql } from 'drizzle-orm';
import db from '../db/client.js';

//Resumo do mes actual e do mes anterior para as variacoes do dashboard.
const resumo = async () => {
    const resultado = await db.execute(sql`
        select
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and p.data_hora >= date_trunc('month', current_date)
                         and p.data_hora < date_trunc('month', current_date) + interval '1 month'), 0)::int as receita,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and d.data_compra >= date_trunc('month', current_date)::date
                         and d.data_compra < (date_trunc('month', current_date) + interval '1 month')::date), 0)::int as despesas,
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and p.data_hora >= date_trunc('month', current_date) - interval '1 month'
                         and p.data_hora < date_trunc('month', current_date)), 0)::int as receita_anterior,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and d.data_compra >= (date_trunc('month', current_date) - interval '1 month')::date
                         and d.data_compra < date_trunc('month', current_date)::date), 0)::int as despesas_anterior
    `);

    const dados = resultado.rows[0] || {};
    const receita = Number(dados.receita) || 0;
    const despesas = Number(dados.despesas) || 0;
    const receitaAnterior = Number(dados.receita_anterior) || 0;
    const despesasAnterior = Number(dados.despesas_anterior) || 0;

    return {
        receita,
        despesas,
        resultado: receita - despesas,
        receita_anterior: receitaAnterior,
        despesas_anterior: despesasAnterior,
        resultado_anterior: receitaAnterior - despesasAnterior
    };
};

//Contadores operacionais e de estado do salao.
const indicadores = async () => {
    const resultado = await db.execute(sql`
        select
            (select count(*) from atendimento where data_hora::date = current_date and estado <> 'Anulado')::int as atendimentos_hoje,
            (select count(*) from atendimento
              where data_hora >= date_trunc('month', current_date)
                and data_hora < date_trunc('month', current_date) + interval '1 month'
                and estado <> 'Anulado')::int as atendimentos_mes,
            (select count(*) from atendimento where estado = 'Em andamento')::int as em_andamento,
            (select count(*) from atendimento where estado = 'Pago')::int as pagos,
            (select count(*) from cliente where estado = 'Ativo')::int as clientes_ativos,
            (select count(*) from funcionario where estado = 'Ativo')::int as funcionarios_ativos,
            (select count(*) from servico where estado = 'Ativo')::int as servicos_ativos,
            (select count(*) from cartao_fidelizacao where estado = 'Ativo')::int as cartoes_fidelizacao
    `);

    return resultado.rows[0] || {};
};

//Serie dos ultimos seis meses para o grafico de evolucao.
const serie = async () => {
    const resultado = await db.execute(sql`
        with meses as (
            select generate_series(
                date_trunc('month', current_date) - interval '5 months',
                date_trunc('month', current_date),
                interval '1 month'
            ) as mes
        )
        select
            to_char(m.mes, 'YYYY-MM') as mes,
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and p.data_hora >= m.mes
                         and p.data_hora < m.mes + interval '1 month'), 0)::int as receita,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and d.data_compra >= m.mes::date
                         and d.data_compra < (m.mes + interval '1 month')::date), 0)::int as despesas
          from meses m
         order by m.mes
    `);

    return resultado.rows;
};

const topServicos = async () => {
    const resultado = await db.execute(sql`
        select s.id as servico_id, s.nome as servico_nome,
               count(es.id)::int as quantidade,
               coalesce(sum(es.valor_final), 0)::int as total
          from atendimento_servico es
          join atendimento a on a.id = es.atendimento_id
          join servico s on s.id = es.servico_id
         where es.estado = 'Ativo'
           and a.estado <> 'Anulado'
           and a.data_hora >= date_trunc('month', current_date)
           and a.data_hora < date_trunc('month', current_date) + interval '1 month'
         group by s.id, s.nome
         order by quantidade desc, total desc
         limit 5
    `);

    return resultado.rows;
};

const topFuncionarios = async () => {
    const resultado = await db.execute(sql`
        select f.id as funcionario_id, f.nome as funcionario_nome, f.cargo,
               coalesce(t.quantidade, 0)::int as quantidade,
               coalesce(t.total, 0)::int as total
          from funcionario f
          left join (
                select es.funcionario_id,
                       count(*) as quantidade,
                       sum(es.valor_final) as total
                  from atendimento_servico es
                  join atendimento a on a.id = es.atendimento_id
                 where es.estado = 'Ativo'
                   and a.estado <> 'Anulado'
                   and a.data_hora >= date_trunc('month', current_date)
                   and a.data_hora < date_trunc('month', current_date) + interval '1 month'
                 group by es.funcionario_id
          ) t on t.funcionario_id = f.id
         where f.estado = 'Ativo'
         order by quantidade desc, total desc, f.nome
         limit 5
    `);

    return resultado.rows;
};

const recentes = async () => {
    const resultado = await db.execute(sql`
        select a.id, c.nome as cliente_nome, a.data_hora, a.estado, a.valor_total,
               coalesce((
                   select string_agg(distinct pp.metodo_pagamento, ', ')
                     from pagamento_parcela pp
                     join pagamento p on p.id = pp.pagamento_id
                    where p.atendimento_id = a.id
                      and p.estado <> 'Anulado'
               ), '') as metodos_pagamento
          from atendimento a
          join cliente c on c.id = a.cliente_id
         order by a.data_hora desc
         limit 6
    `);

    return resultado.rows;
};

const fidelizacao = async () => {
    const resultado = await db.execute(sql`
        select
            count(*) filter (where tipo_movimento = 'marca')::int as marcas,
            count(*) filter (where tipo_movimento = 'beneficio_ganho')::int as beneficios_ganhos,
            count(*) filter (where tipo_movimento = 'beneficio_utilizado')::int as beneficios_utilizados
          from movimento_fidelizacao
         where data_hora >= date_trunc('month', current_date)
           and data_hora < date_trunc('month', current_date) + interval '1 month'
    `);

    return resultado.rows[0] || { marcas: 0, beneficios_ganhos: 0, beneficios_utilizados: 0 };
};

const obter = async () => {
    const [resumoMes, contadores, serieMensal, servicos, funcionarios, atendimentosRecentes, cartoes] = await Promise.all([
        resumo(),
        indicadores(),
        serie(),
        topServicos(),
        topFuncionarios(),
        recentes(),
        fidelizacao()
    ]);

    return {
        atualizado_em: new Date().toISOString(),
        resumo: resumoMes,
        indicadores: contadores,
        serie: serieMensal,
        top_servicos: servicos,
        top_funcionarios: funcionarios,
        recentes: atendimentosRecentes,
        fidelizacao: cartoes
    };
};

const Dashboard = {
    obter
};

export default Dashboard;
