import pool from '../config/database.js';

//filtro de periodo reutilizavel (coluna, params $1=de $2=ate)
const PERIODO = (coluna) => `($1::date is null or ${coluna} >= $1)
                          and ($2::date is null or ${coluna} <= $2)`;

//Receita (parcelas de pagamentos nao anulados), despesas e resultado do periodo
const resumo = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select
            coalesce((select sum(pp.valor)
                        from pagamento_parcela pp
                        join pagamento p on p.id = pp.pagamento_id
                       where p.estado <> 'Anulado'
                         and (${PERIODO('p.data_hora::date')})), 0)::int as receita,
            coalesce((select sum(d.valor_total)
                        from despesa d
                       where d.estado = 'Ativo'
                         and (${PERIODO('d.data_compra')})), 0)::int as despesas`,
        [de || null, ate || null]
    );

    const { receita, despesas } = result.rows[0];
    return { receita, despesas, resultado: receita - despesas };
};

//Entradas/saidas/levantamentos do caixa e sessoes fechadas com diferencas
const caixa = async ({ de, ate } = {}) => {
    const totais = await pool.query(
        `select
            coalesce(sum(valor) filter (where tipo_movimento = 'Entrada'), 0)::int as entradas,
            coalesce(sum(valor) filter (where tipo_movimento = 'Saida'), 0)::int as saidas,
            coalesce(sum(valor) filter (where tipo_movimento = 'Levantamento'), 0)::int as levantamentos
           from movimento_caixa
          where estado = 'Ativo'
            and (${PERIODO('data_hora::date')})`,
        [de || null, ate || null]
    );

    const sessoes = await pool.query(
        `select id, data_abertura, data_fecho, saldo_inicial, valor_esperado, valor_contado, diferenca
           from caixa_sessao
          where estado = 'Fechada'
            and (${PERIODO('data_fecho::date')})
          order by data_fecho desc`,
        [de || null, ate || null]
    );

    const { entradas, saidas, levantamentos } = totais.rows[0];
    return { entradas, saidas, levantamentos, sessoes: sessoes.rows };
};

//Servicos mais realizados (quantidade e receita gerada)
const servicos = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select s.id as servico_id, s.nome as servico_nome,
                count(es.id)::int as quantidade,
                coalesce(sum(es.valor_final), 0)::int as total
           from atendimento_servico es
           join atendimento a on a.id = es.atendimento_id
           join servico s on s.id = es.servico_id
          where es.estado = 'Ativo'
            and a.estado <> 'Anulado'
            and (${PERIODO('a.data_hora::date')})
          group by s.id, s.nome
          order by quantidade desc, total desc`,
        [de || null, ate || null]
    );

    return result.rows;
};

//Servicos realizados e comissoes por funcionario
const funcionarios = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select f.id as funcionario_id, f.nome as funcionario_nome,
                coalesce(t.servicos, 0)::int as servicos,
                coalesce(t.total_servicos, 0)::int as total_servicos,
                coalesce((select sum(co.valor_comissao)
                            from comissao co
                           where co.funcionario_id = f.id
                             and (${PERIODO('co.criado_em::date')})), 0)::int as total_comissoes
           from funcionario f
           left join (
                select es.funcionario_id, count(*) as servicos, sum(es.valor_final) as total_servicos
                  from atendimento_servico es
                  join atendimento a on a.id = es.atendimento_id
                 where es.estado = 'Ativo'
                   and a.estado <> 'Anulado'
                   and (${PERIODO('a.data_hora::date')})
                 group by es.funcionario_id
           ) t on t.funcionario_id = f.id
          order by total_servicos desc, f.nome`,
        [de || null, ate || null]
    );

    return result.rows;
};

//Assiduidade: registos e ocorrencias por funcionario
const assiduidade = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select f.id as funcionario_id, f.nome as funcionario_nome,
                count(a.id)::int as registos,
                count(a.id) filter (where a.tipo_ocorrencia is not null)::int as ocorrencias,
                count(a.id) filter (where a.tipo_ocorrencia = 'atraso')::int as atrasos,
                count(a.id) filter (where a.tipo_ocorrencia in ('falta_justificada', 'falta_injustificada', 'ausencia'))::int as faltas
           from funcionario f
           left join assiduidade a on a.funcionario_id = f.id
            and (${PERIODO('a.data')})
          group by f.id, f.nome
          order by ocorrencias desc, f.nome`,
        [de || null, ate || null]
    );

    return result.rows;
};

//Clientes mais frequentes (numero de atendimentos e total gasto)
const clientes = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select c.id as cliente_id, c.nome as cliente_nome, c.telefone,
                count(a.id)::int as atendimentos,
                coalesce(sum(a.valor_total) filter (where a.estado <> 'Anulado'), 0)::int as total_gasto
           from cliente c
           left join atendimento a on a.cliente_id = c.id
            and (${PERIODO('a.data_hora::date')})
          group by c.id, c.nome, c.telefone
          order by atendimentos desc, total_gasto desc`,
        [de || null, ate || null]
    );

    return result.rows;
};

//Fidelizacao: marcas, beneficios ganhos e utilizados no periodo
const fidelizacao = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select
            count(*) filter (where tipo_movimento = 'marca')::int as marcas,
            count(*) filter (where tipo_movimento = 'beneficio_ganho')::int as beneficios_ganhos,
            count(*) filter (where tipo_movimento = 'beneficio_utilizado')::int as beneficios_utilizados
           from movimento_fidelizacao
          where (${PERIODO('data_hora::date')})`,
        [de || null, ate || null]
    );

    return result.rows[0];
};

//Historico de anulacoes (atendimentos e pagamentos)
const anulacoes = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select 'atendimento' as tipo, a.id, a.cliente_id, c.nome as cliente_nome,
                a.valor_total as valor, a.motivo_anulacao as motivo, a.data_hora
           from atendimento a
           join cliente c on c.id = a.cliente_id
          where a.estado = 'Anulado'
            and (${PERIODO('a.data_hora::date')})
          union all
         select 'pagamento' as tipo, p.id, p.atendimento_id as cliente_id, null as cliente_nome,
                p.valor_total as valor, p.motivo_anulacao as motivo, p.data_hora
           from pagamento p
          where p.estado = 'Anulado'
            and (${PERIODO('p.data_hora::date')})
          order by data_hora desc`,
        [de || null, ate || null]
    );

    return result.rows;
};

//Movimentos financeiros do caixa no periodo
const movimentos = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select m.id, m.id_sessao, m.tipo_movimento, m.valor, m.descricao,
                m.origem, m.referencia_id, m.data_hora, m.estado
           from movimento_caixa m
          where (${PERIODO('m.data_hora::date')})
          order by m.data_hora desc, m.id desc`,
        [de || null, ate || null]
    );

    return result.rows;
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
    movimentos
};

export default Relatorio;
