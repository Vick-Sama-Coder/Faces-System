import { sql } from 'drizzle-orm';
import db from '../db/client.js';

//partilhar a condicao de periodo evita que os relatorios contem intervalos diferentes
const periodo = (coluna, de, ate) => sql`
    (${de ?? null}::date is null or ${coluna} >= ${de ?? null})
    and (${ate ?? null}::date is null or ${coluna} <= ${ate ?? null})
`;

//so parcelas de pagamentos nao anulados contam como receita, para nao contar dinheiro devolvido
const resumo = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and (${periodo(sql`p.data_hora::date`, de, ate)})), 0)::int as receita,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and (${periodo(sql`d.data_compra`, de, ate)})), 0)::int as despesas
    `);

    const { receita, despesas } = resultado.rows[0];
    return { receita, despesas, resultado: receita - despesas };
};

//separar por tipo permite conferir entradas, saidas e diferencas do fecho em separado
const caixa = async ({ de, ate } = {}) => {
    const totais = await db.execute(sql`
        select
            coalesce(sum(valor) filter (where tipo_movimento = 'Entrada'), 0)::int as entradas,
            coalesce(sum(valor) filter (where tipo_movimento = 'Saida'), 0)::int as saidas,
            coalesce(sum(valor) filter (where tipo_movimento = 'Levantamento'), 0)::int as levantamentos
           from movimento_caixa
          where estado = 'Ativo'
            and (${periodo(sql`data_hora::date`, de, ate)})
    `);

    const sessoes = await db.execute(sql`
        select id, data_abertura, data_fecho, saldo_inicial, valor_esperado, valor_contado, diferenca
           from caixa_sessao
          where estado = 'Fechada'
            and (${periodo(sql`data_fecho::date`, de, ate)})
          order by data_fecho desc
    `);

    const { entradas, saidas, levantamentos } = totais.rows[0];
    return { entradas, saidas, levantamentos, sessoes: sessoes.rows };
};

//excluir atendimentos anulados evita inflacionar os servicos mais realizados
const servicos = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select s.id as servico_id, s.nome as servico_nome,
               count(es.id)::int as quantidade,
               coalesce(sum(es.preco_original), 0)::int as valor_bruto,
               coalesce(sum(es.valor_desconto), 0)::int as descontos,
               coalesce(sum(es.valor_final), 0)::int as total,
               coalesce(sum(co.valor_comissao), 0)::int as comissoes
           from atendimento_servico es
           join atendimento a on a.id = es.atendimento_id
           join servico s on s.id = es.servico_id
           left join comissao co on co.atendimento_servico_id = es.id
          where es.estado = 'Ativo'
            and a.estado <> 'Anulado'
            and (${periodo(sql`a.data_hora::date`, de, ate)})
          group by s.id, s.nome
          order by quantidade desc, total desc
    `);

    return resultado.rows;
};

//as comissoes vem de subquery para o total nao multiplicar as linhas dos servicos
const funcionarios = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select f.id as funcionario_id, f.nome as funcionario_nome,
               f.salario as salario_base,
               coalesce(t.servicos, 0)::int as servicos,
               coalesce(t.total_servicos, 0)::int as total_servicos,
               coalesce((select sum(co.valor_comissao)
                           from comissao co
                          where co.funcionario_id = f.id
                            and (${periodo(sql`co.criado_em::date`, de, ate)})), 0)::int as total_comissoes
           from funcionario f
           left join (
                select es.funcionario_id, count(*) as servicos, sum(es.valor_final) as total_servicos
                  from atendimento_servico es
                  join atendimento a on a.id = es.atendimento_id
                 where es.estado = 'Ativo'
                   and a.estado <> 'Anulado'
                   and (${periodo(sql`a.data_hora::date`, de, ate)})
                 group by es.funcionario_id
           ) t on t.funcionario_id = f.id
          order by total_servicos desc, f.nome
    `);

    return resultado.rows;
};

//left join mantem os funcionarios sem registos, para se ver tambem quem nao tem assiduidade
const assiduidade = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select f.id as funcionario_id, f.nome as funcionario_nome,
               count(a.id)::int as registos,
               count(a.id) filter (where a.tipo_ocorrencia is not null)::int as ocorrencias,
               count(a.id) filter (where a.tipo_ocorrencia = 'atraso')::int as atrasos,
               count(a.id) filter (where a.tipo_ocorrencia in ('falta_justificada', 'falta_injustificada', 'ausencia'))::int as faltas
           from funcionario f
           left join assiduidade a on a.funcionario_id = f.id
            and (${periodo(sql`a.data`, de, ate)})
          group by f.id, f.nome
          order by ocorrencias desc, f.nome
    `);

    return resultado.rows;
};

//contar apenas o que nao foi anulado e o criterio correto para a frequencia real do cliente
const clientes = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select c.id as cliente_id, c.nome as cliente_nome, c.telefone,
               count(a.id)::int as atendimentos,
               coalesce(sum(a.valor_total) filter (where a.estado <> 'Anulado'), 0)::int as total_gasto
           from cliente c
           left join atendimento a on a.cliente_id = c.id
            and (${periodo(sql`a.data_hora::date`, de, ate)})
          group by c.id, c.nome, c.telefone
          order by atendimentos desc, total_gasto desc
    `);

    return resultado.rows;
};

//contagens por tipo dao o estado do ciclo de fidelizacao no periodo
const fidelizacao = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select
            count(*) filter (where tipo_movimento = 'marca')::int as marcas,
            count(*) filter (where tipo_movimento = 'beneficio_ganho')::int as beneficios_ganhos,
            count(*) filter (where tipo_movimento = 'beneficio_utilizado')::int as beneficios_utilizados
           from movimento_fidelizacao
          where (${periodo(sql`data_hora::date`, de, ate)})
    `);

    return resultado.rows[0];
};

//unir atendimentos e pagamentos numa lista evita a UI juntar duas consultas
const anulacoes = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select 'atendimento' as tipo, a.id, a.cliente_id, c.nome as cliente_nome,
               a.valor_total as valor, a.motivo_anulacao as motivo, a.data_hora
           from atendimento a
           join cliente c on c.id = a.cliente_id
          where a.estado = 'Anulado'
            and (${periodo(sql`a.data_hora::date`, de, ate)})
          union all
         select 'pagamento' as tipo, p.id, p.atendimento_id as cliente_id, null as cliente_nome,
                p.valor_total as valor, p.motivo_anulacao as motivo, p.data_hora
           from pagamento p
          where p.estado = 'Anulado'
            and (${periodo(sql`p.data_hora::date`, de, ate)})
          order by data_hora desc
    `);

    return resultado.rows;
};

//inclui o estado para o historico mostrar tambem os movimentos anulados
const movimentos = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select m.id, m.id_sessao, m.tipo_movimento, m.valor, m.descricao,
               m.origem, m.referencia_id, m.data_hora, m.estado
           from movimento_caixa m
          where (${periodo(sql`m.data_hora::date`, de, ate)})
          order by m.data_hora desc, m.id desc
    `);

    return resultado.rows;
};

//---- Relatorio financeiro consolidado ----

const formatarDataIso = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
};

//comparar com o intervalo anterior de igual duracao torna as variacoes justas
const periodoAnterior = (de, ate) => {
    if (!de || !ate) return null;

    const inicio = new Date(`${de}T00:00:00`);
    const fim = new Date(`${ate}T00:00:00`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
        return null;
    }

    const dias = Math.round((fim - inicio) / 86400000) + 1;
    const anteriorFim = new Date(inicio);
    anteriorFim.setDate(anteriorFim.getDate() - 1);
    const anteriorInicio = new Date(anteriorFim);
    anteriorInicio.setDate(anteriorInicio.getDate() - (dias - 1));

    return {
        de: formatarDataIso(anteriorInicio),
        ate: formatarDataIso(anteriorFim),
        dias
    };
};

//quando o periodo anterior e zero a variacao nao e calculavel (evita divisao por zero)
const calcularVariacao = (atual, anterior) => {
    if (!anterior || anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
};

//receita recebida (dinheiro) e receita gerada (servicos) sao medidas diferentes e ficam separadas
const resumoFinanceiro = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and (${periodo(sql`p.data_hora::date`, de, ate)})), 0)::int as receitas_recebidas,
            coalesce((select sum(a.valor_total)
                        from atendimento a
                       where a.estado <> 'Anulado'
                         and (${periodo(sql`a.data_hora::date`, de, ate)})), 0)::int as receitas_geradas,
            coalesce((select sum(a.valor_desconto)
                        from atendimento a
                       where a.estado <> 'Anulado'
                         and (${periodo(sql`a.data_hora::date`, de, ate)})), 0)::int as descontos,
            coalesce((select count(*)
                        from atendimento a
                       where a.estado <> 'Anulado'
                         and (${periodo(sql`a.data_hora::date`, de, ate)})), 0)::int as atendimentos,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and (${periodo(sql`d.data_compra`, de, ate)})), 0)::int as despesas,
            coalesce((select count(*)
                        from despesa d
                       where d.estado = 'Ativo'
                         and (${periodo(sql`d.data_compra`, de, ate)})), 0)::int as despesas_quantidade,
            coalesce((select sum(co.valor_comissao)
                        from comissao co
                       where (${periodo(sql`co.criado_em::date`, de, ate)})), 0)::int as comissoes_geradas,
            coalesce((select sum(m.valor)
                        from movimento_caixa m
                       where m.estado = 'Ativo'
                         and m.tipo_movimento = 'Entrada'
                         and m.origem <> 'Pagamento'
                         and (${periodo(sql`m.data_hora::date`, de, ate)})), 0)::int as outras_receitas,
            coalesce((select sum(a.valor_total - coalesce(pg.pago, 0))
                        from atendimento a
                        left join (
                            select p.atendimento_id, sum(pp.valor)::int as pago
                              from pagamento p
                              join pagamento_parcela pp on pp.pagamento_id = p.id
                             where p.estado <> 'Anulado'
                             group by p.atendimento_id
                        ) pg on pg.atendimento_id = a.id
                       where a.estado in ('Concluido', 'Pago')
                         and a.valor_total > coalesce(pg.pago, 0)), 0)::int as valores_a_receber
    `);

    return resultado.rows[0] || {
        receitas_recebidas: 0,
        receitas_geradas: 0,
        descontos: 0,
        atendimentos: 0,
        despesas: 0,
        despesas_quantidade: 0,
        comissoes_geradas: 0,
        outras_receitas: 0,
        valores_a_receber: 0
    };
};

const receitasPorMetodo = async ({ de, ate } = {}) => {
    const resultado = await db.execute(sql`
        select coalesce(pp.metodo_pagamento, 'Nao indicado') as metodo,
               count(*)::int as quantidade,
               coalesce(sum(pp.valor), 0)::int as total
          from pagamento_parcela pp
          join pagamento p on p.id = pp.pagamento_id
         where p.estado <> 'Anulado'
           and (${periodo(sql`p.data_hora::date`, de, ate)})
         group by coalesce(pp.metodo_pagamento, 'Nao indicado')
         order by total desc
    `);

    return resultado.rows;
};

//o detalhe inclui o responsavel para o administrador saber quem registou cada gasto
const despesasFinanceiro = async ({ de, ate } = {}) => {
    const [categorias, metodos, detalhe] = await Promise.all([
        db.execute(sql`
            select coalesce(c.nome, 'Sem categoria') as categoria,
                   count(*)::int as quantidade,
                   coalesce(sum(d.valor_total), 0)::int as total
              from despesa d
              left join categoria_despesa c on c.id = d.categoria_id
             where d.estado = 'Ativo'
               and (${periodo(sql`d.data_compra`, de, ate)})
             group by coalesce(c.nome, 'Sem categoria')
             order by total desc
        `),
        db.execute(sql`
            select coalesce(d.metodo_pagamento, 'Nao indicado') as metodo,
                   count(*)::int as quantidade,
                   coalesce(sum(d.valor_total), 0)::int as total
              from despesa d
             where d.estado = 'Ativo'
               and (${periodo(sql`d.data_compra`, de, ate)})
             group by coalesce(d.metodo_pagamento, 'Nao indicado')
             order by total desc
        `),
        db.execute(sql`
            select d.id, d.data_compra, coalesce(c.nome, 'Sem categoria') as categoria,
                   d.descricao, d.valor_total,
                   coalesce(d.metodo_pagamento, 'Nao indicado') as metodo_pagamento,
                   coalesce(u.nome, 'Sistema') as responsavel, d.estado
              from despesa d
              left join categoria_despesa c on c.id = d.categoria_id
              left join usuario u on u.id = d.registado_por
             where d.estado = 'Ativo'
               and (${periodo(sql`d.data_compra`, de, ate)})
             order by d.data_compra desc, d.id desc
             limit 200
        `)
    ]);

    return {
        por_categoria: categorias.rows,
        por_metodo: metodos.rows,
        detalhe: detalhe.rows
    };
};

//saldo inicial = ultimo fecho antes do periodo; sem fecho, usa a abertura mais antiga
const fluxoFinanceiro = async ({ de, ate } = {}) => {
    const [totais, saldo, sessoes] = await Promise.all([
        db.execute(sql`
            select
                coalesce(sum(valor) filter (where tipo_movimento = 'Entrada'), 0)::int as entradas,
                coalesce(sum(valor) filter (where tipo_movimento = 'Saida'), 0)::int as saidas,
                coalesce(sum(valor) filter (where tipo_movimento = 'Levantamento'), 0)::int as levantamentos,
                coalesce(sum(valor) filter (where tipo_movimento = 'Entrada' and origem = 'Pagamento'), 0)::int as entradas_pagamentos,
                coalesce(sum(valor) filter (where tipo_movimento = 'Entrada' and origem <> 'Pagamento'), 0)::int as outras_entradas,
                count(*)::int as movimentos
               from movimento_caixa
              where estado = 'Ativo'
                and (${periodo(sql`data_hora::date`, de, ate)})
        `),
        db.execute(sql`
            select coalesce(
                (
                    select valor_contado
                      from caixa_sessao
                     where estado = 'Fechada'
                       and valor_contado is not null
                       and (${de ?? null}::date is not null and data_fecho::date < ${de ?? null}::date)
                     order by data_fecho desc
                     limit 1
                ),
                (
                    select saldo_inicial
                      from caixa_sessao
                     where (${de ?? null}::date is null or data_abertura::date >= ${de ?? null}::date)
                     order by data_abertura asc
                     limit 1
                ),
                (
                    select saldo_inicial
                      from caixa_sessao
                     order by data_abertura asc
                     limit 1
                ),
                0
            )::int as saldo_inicial
        `),
        db.execute(sql`
            select s.id, s.data_abertura, s.data_fecho, s.saldo_inicial,
                   s.valor_esperado, s.valor_contado, s.diferenca, s.observacoes,
                   ua.nome as aberto_por_nome, uf.nome as fechado_por_nome
              from caixa_sessao s
              left join usuario ua on ua.id = s.aberto_por
              left join usuario uf on uf.id = s.fechado_por
             where s.estado = 'Fechada'
               and (${periodo(sql`s.data_fecho::date`, de, ate)})
             order by s.data_fecho desc
        `)
    ]);

    return {
        ...totais.rows[0],
        saldo_inicial: saldo.rows[0]?.saldo_inicial || 0,
        sessoes: sessoes.rows
    };
};

//o salario fixo e mensal; o numero de meses tocados pelo periodo define a referencia
const salariosFinanceiro = async ({ de, ate } = {}) => {
    const hojeIso = formatarDataIso(new Date());
    const salarioDe = de || `${(ate || hojeIso).slice(0, 7)}-01`;
    const salarioAte = ate || hojeIso;

    const [base, fixo, comissoes, deducoes, processamentos, desempenho] = await Promise.all([
        db.execute(sql`
            select id as funcionario_id, nome as funcionario_nome, cargo, salario as salario_mensal, estado
              from funcionario
             order by nome
        `),
        db.execute(sql`
            with limites as (
                select ${salarioDe}::date as de, ${salarioAte}::date as ate
            ),
            meses as (
                select gs::date as inicio_mes,
                       (gs + interval '1 month - 1 day')::date as fim_mes
                  from generate_series(
                      date_trunc('month', (select de from limites)),
                      date_trunc('month', (select ate from limites)),
                      interval '1 month'
                  ) gs
            )
            select f.id as funcionario_id,
                   count(m.inicio_mes)::int as meses,
                   coalesce(round(sum(
                       f.salario * (least(m.fim_mes, l.ate) - greatest(m.inicio_mes, l.de) + 1)::numeric
                       / extract(day from m.fim_mes)
                   )), 0)::int as salario_fixo
              from funcionario f
             cross join meses m
             cross join limites l
             where f.estado = 'Ativo'
               and least(m.fim_mes, l.ate) >= greatest(m.inicio_mes, l.de)
             group by f.id, f.salario
        `),
        db.execute(sql`
            with limites as (
                select ${salarioDe}::date as de, ${salarioAte}::date as ate
            )
            select co.funcionario_id,
                   coalesce(sum(co.valor_comissao), 0)::int as comissoes,
                   coalesce(sum(co.valor_comissao) filter (where co.estado = 'Elegivel'), 0)::int as comissoes_pendentes,
                   coalesce(sum(co.valor_comissao) filter (where co.estado = 'Paga'), 0)::int as comissoes_pagas,
                   count(*)::int as comissoes_quantidade
              from comissao co
             cross join limites l
             where co.criado_em::date between l.de and l.ate
             group by co.funcionario_id
        `),
        db.execute(sql`
            with limites as (
                select ${salarioDe}::date as de, ${salarioAte}::date as ate
            )
            select ps.funcionario_id,
                   coalesce(sum(ds.valor), 0)::int as deducoes
              from processamento_salarial ps
             cross join limites l
              left join deducao_salarial ds on ds.processamento_id = ps.id
             where ps.periodo_inicio <= l.ate
               and ps.periodo_fim >= l.de
             group by ps.funcionario_id
        `),
        db.execute(sql`
            with limites as (
                select ${salarioDe}::date as de, ${salarioAte}::date as ate
            )
            select ps.id, ps.funcionario_id, f.nome as funcionario_nome,
                   ps.periodo_inicio, ps.periodo_fim, ps.salario_base, ps.total_comissoes,
                   ps.total_deducoes, ps.total_a_pagar, ps.estado, ps.data_pagamento
              from processamento_salarial ps
              join funcionario f on f.id = ps.funcionario_id
             cross join limites l
             where ps.periodo_inicio <= l.ate
               and ps.periodo_fim >= l.de
             order by ps.periodo_inicio desc, f.nome
        `),
        funcionarios({ de, ate })
    ]);

    const fixoPorFuncionario = new Map(fixo.rows.map((linha) => [linha.funcionario_id, linha]));
    const comissoesPorFuncionario = new Map(comissoes.rows.map((linha) => [linha.funcionario_id, linha]));
    const deducoesPorFuncionario = new Map(deducoes.rows.map((linha) => [linha.funcionario_id, linha]));
    const desempenhoPorFuncionario = new Map(desempenho.map((linha) => [linha.funcionario_id, linha]));
    const processamentosPorFuncionario = new Map();

    processamentos.rows.forEach((linha) => {
        if (!processamentosPorFuncionario.has(linha.funcionario_id)) {
            processamentosPorFuncionario.set(linha.funcionario_id, []);
        }
        processamentosPorFuncionario.get(linha.funcionario_id).push(linha);
    });

    const linhas = base.rows.map((funcionario) => {
        const fixoLinha = fixoPorFuncionario.get(funcionario.funcionario_id) || {};
        const comissaoLinha = comissoesPorFuncionario.get(funcionario.funcionario_id) || {};
        const deducaoLinha = deducoesPorFuncionario.get(funcionario.funcionario_id) || {};
        const desempenhoLinha = desempenhoPorFuncionario.get(funcionario.funcionario_id) || {};
        const listaProcessamentos = processamentosPorFuncionario.get(funcionario.funcionario_id) || [];

        const salarioFixo = Number(fixoLinha.salario_fixo) || 0;
        const totalComissoes = Number(comissaoLinha.comissoes) || 0;
        const totalDeducoes = Number(deducaoLinha.deducoes) || 0;
        const totalPago = listaProcessamentos
            .filter((processamento) => processamento.estado === "Pago")
            .reduce((soma, processamento) => soma + (Number(processamento.total_a_pagar) || 0), 0);
        const totalAPagar = salarioFixo + totalComissoes - totalDeducoes;

        return {
            funcionario_id: funcionario.funcionario_id,
            funcionario_nome: funcionario.funcionario_nome,
            cargo: funcionario.cargo,
            estado: funcionario.estado,
            salario_mensal: Number(funcionario.salario_mensal) || 0,
            meses: Number(fixoLinha.meses) || 0,
            salario_fixo: salarioFixo,
            servicos: Number(desempenhoLinha.servicos) || 0,
            receita: Number(desempenhoLinha.total_servicos) || 0,
            comissoes: totalComissoes,
            comissoes_pendentes: Number(comissaoLinha.comissoes_pendentes) || 0,
            comissoes_pagas: Number(comissaoLinha.comissoes_pagas) || 0,
            comissoes_quantidade: Number(comissaoLinha.comissoes_quantidade) || 0,
            deducoes: totalDeducoes,
            total_a_pagar: totalAPagar,
            total_pago: totalPago,
            saldo_pendente: Math.max(0, totalAPagar - totalPago),
            processamentos: listaProcessamentos
        };
    });

    //funcionarios inativos ainda podem ter processamentos no periodo
    processamentosPorFuncionario.forEach((lista, funcionarioId) => {
        if (linhas.some((linha) => linha.funcionario_id === funcionarioId)) return;

        const primeiro = lista[0];
        const totalPago = lista
            .filter((processamento) => processamento.estado === "Pago")
            .reduce((soma, processamento) => soma + (Number(processamento.total_a_pagar) || 0), 0);

        linhas.push({
            funcionario_id: funcionarioId,
            funcionario_nome: primeiro.funcionario_nome,
            cargo: null,
            estado: "Inativo",
            salario_mensal: 0,
            meses: 0,
            salario_fixo: 0,
            servicos: 0,
            receita: 0,
            comissoes: 0,
            comissoes_pendentes: 0,
            comissoes_pagas: 0,
            comissoes_quantidade: 0,
            deducoes: 0,
            total_a_pagar: 0,
            total_pago: totalPago,
            saldo_pendente: 0,
            processamentos: lista
        });
    });

    linhas.sort((a, b) => b.total_a_pagar - a.total_a_pagar || a.funcionario_nome.localeCompare(b.funcionario_nome));

    const somar = (campo) => linhas.reduce((soma, linha) => soma + (Number(linha[campo]) || 0), 0);
    const mesesReferencia = Math.max(
        1,
        ...linhas.map((linha) => Number(linha.meses) || 0)
    );
    const salarioMensal = base.rows
        .filter((funcionario) => funcionario.estado === "Ativo")
        .reduce((soma, funcionario) => soma + (Number(funcionario.salario_mensal) || 0), 0);
    const diasReferencia = Math.max(
        1,
        Math.round(
            (new Date(`${salarioAte}T00:00:00`) - new Date(`${salarioDe}T00:00:00`)) / 86400000
        ) + 1
    );
    const totalProcessado = processamentos.rows
        .reduce((soma, processamento) => soma + (Number(processamento.total_a_pagar) || 0), 0);
    const totalPendenteProcessado = processamentos.rows
        .filter((processamento) => processamento.estado !== "Pago")
        .reduce((soma, processamento) => soma + (Number(processamento.total_a_pagar) || 0), 0);

    return {
        resumo: {
            funcionarios: linhas.length,
            funcionarios_ativos: base.rows.filter((funcionario) => funcionario.estado === "Ativo").length,
            meses_referencia: mesesReferencia,
            dias_referencia: diasReferencia,
            referencia_inicio: salarioDe,
            referencia_fim: salarioAte,
            salario_fixo_mensal: salarioMensal,
            salario_fixo: somar("salario_fixo"),
            comissoes: somar("comissoes"),
            comissoes_pendentes: somar("comissoes_pendentes"),
            comissoes_pagas: somar("comissoes_pagas"),
            deducoes: somar("deducoes"),
            total_a_pagar: somar("total_a_pagar"),
            total_processado: totalProcessado,
            total_pendente_processado: totalPendenteProcessado,
            total_pago: somar("total_pago"),
            saldo_pendente: somar("saldo_pendente")
        },
        funcionarios: linhas
    };
};

const dividasFinanceiro = async ({ de, ate, salarioDe, salarioAte } = {}) => {
    const [aReceber, aPagar] = await Promise.all([
        db.execute(sql`
            select a.id, a.data_hora, c.nome as cliente_nome, c.telefone,
                   a.valor_total, coalesce(pg.pago, 0)::int as pago,
                   (a.valor_total - coalesce(pg.pago, 0))::int as pendente,
                   (current_date - a.data_hora::date)::int as dias_atraso,
                   (
                       select string_agg(distinct s.nome, ', ')
                         from atendimento_servico es
                         join servico s on s.id = es.servico_id
                        where es.atendimento_id = a.id
                          and es.estado = 'Ativo'
                   ) as servicos,
                   a.estado
              from atendimento a
              join cliente c on c.id = a.cliente_id
              left join (
                  select p.atendimento_id, sum(pp.valor)::int as pago
                    from pagamento p
                    join pagamento_parcela pp on pp.pagamento_id = p.id
                   where p.estado <> 'Anulado'
                   group by p.atendimento_id
              ) pg on pg.atendimento_id = a.id
             where a.estado in ('Concluido', 'Pago')
               and a.valor_total > coalesce(pg.pago, 0)
             order by dias_atraso desc, a.data_hora asc
             limit 100
        `),
        db.execute(sql`
            with limites as (
                select ${salarioDe}::date as de, ${salarioAte}::date as ate
            )
            select ps.id, ps.funcionario_id, f.nome as beneficiario,
                   ps.periodo_inicio, ps.periodo_fim, ps.total_a_pagar as valor,
                   ps.estado, ps.data_pagamento
              from processamento_salarial ps
              join funcionario f on f.id = ps.funcionario_id
             cross join limites l
             where ps.estado <> 'Pago'
               and ps.periodo_inicio <= l.ate
               and ps.periodo_fim >= l.de
             order by ps.periodo_inicio asc, f.nome
        `)
    ]);

    const totalReceber = aReceber.rows.reduce((soma, linha) => soma + (Number(linha.pendente) || 0), 0);
    const vencido = aReceber.rows
        .filter((linha) => Number(linha.dias_atraso) > 30)
        .reduce((soma, linha) => soma + (Number(linha.pendente) || 0), 0);
    const totalPagar = aPagar.rows.reduce((soma, linha) => soma + (Number(linha.valor) || 0), 0);

    return {
        resumo: {
            a_receber: totalReceber,
            vencido,
            a_pagar: totalPagar,
            processamentos_pendentes: aPagar.rows.length
        },
        a_receber: aReceber.rows,
        a_pagar: aPagar.rows
    };
};

//consolida tudo num payload unico para o frontend nao misturar intervalos diferentes
const financeiro = async ({ de, ate } = {}) => {
    const anterior = periodoAnterior(de, ate);
    const salarioDeReferencia = de || `${(ate || formatarDataIso(new Date())).slice(0, 7)}-01`;
    const salarioAteReferencia = ate || formatarDataIso(new Date());

    const [resumo, resumoAnterior, metodos, servicosPeriodo, despesas, fluxo, salarios] = await Promise.all([
        resumoFinanceiro({ de, ate }),
        anterior ? resumoFinanceiro({ de: anterior.de, ate: anterior.ate }) : Promise.resolve(null),
        receitasPorMetodo({ de, ate }),
        servicos({ de, ate }),
        despesasFinanceiro({ de, ate }),
        fluxoFinanceiro({ de, ate }),
        salariosFinanceiro({ de, ate })
    ]);

    const dividas = await dividasFinanceiro({
        de,
        ate,
        salarioDe: salarioDeReferencia,
        salarioAte: salarioAteReferencia
    });

    const saldoFinal = (Number(fluxo.saldo_inicial) || 0)
        + (Number(fluxo.entradas) || 0)
        - (Number(fluxo.saidas) || 0)
        - (Number(fluxo.levantamentos) || 0);
    const resultado = (Number(resumo.receitas_recebidas) || 0) - (Number(resumo.despesas) || 0);
    const margem = Number(resumo.receitas_recebidas) > 0
        ? (resultado / Number(resumo.receitas_recebidas)) * 100
        : 0;

    const comparacao = anterior && resumoAnterior ? {
        disponivel: true,
        periodo: anterior,
        atual: {
            receitas: Number(resumo.receitas_recebidas) || 0,
            despesas: Number(resumo.despesas) || 0,
            resultado
        },
        anterior: {
            receitas: Number(resumoAnterior.receitas_recebidas) || 0,
            despesas: Number(resumoAnterior.despesas) || 0,
            resultado: (Number(resumoAnterior.receitas_recebidas) || 0) - (Number(resumoAnterior.despesas) || 0)
        },
        variacao: {
            receitas: calcularVariacao(Number(resumo.receitas_recebidas) || 0, Number(resumoAnterior.receitas_recebidas) || 0),
            despesas: calcularVariacao(Number(resumo.despesas) || 0, Number(resumoAnterior.despesas) || 0),
            resultado: calcularVariacao(
                resultado,
                (Number(resumoAnterior.receitas_recebidas) || 0) - (Number(resumoAnterior.despesas) || 0)
            )
        }
    } : { disponivel: false };

    return {
        periodo: {
            de: de || null,
            ate: ate || null,
            anterior: anterior || null
        },
        resumo: {
            ...resumo,
            resultado,
            margem,
            saldo_inicial: Number(fluxo.saldo_inicial) || 0,
            saldo_final: saldoFinal,
            saldo_caixa: saldoFinal,
            valores_a_pagar: salarios.resumo.saldo_pendente,
            salario_fixo: salarios.resumo.salario_fixo,
            comissoes: salarios.resumo.comissoes,
            comissoes_pendentes: salarios.resumo.comissoes_pendentes,
            saldo_pendente_equipa: salarios.resumo.saldo_pendente
        },
        comparacao,
        receitas: {
            recebidas: Number(resumo.receitas_recebidas) || 0,
            geradas: Number(resumo.receitas_geradas) || 0,
            outras: Number(resumo.outras_receitas) || 0,
            descontos: Number(resumo.descontos) || 0,
            por_metodo: metodos,
            por_servico: servicosPeriodo,
            por_funcionario: salarios.funcionarios
        },
        despesas,
        fluxo: {
            ...fluxo,
            saldo_final: saldoFinal
        },
        salarios,
        dividas
    };
};

const Relatorio = {
    resumo,
    caixa,
    servicos,
    funcionarios,
    assiduidade,
    clientes,
    fidelizacao,
    anulacoes,
    movimentos,
    financeiro
};

export default Relatorio;
