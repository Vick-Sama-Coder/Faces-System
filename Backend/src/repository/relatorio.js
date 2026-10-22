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
               coalesce(sum(es.valor_final), 0)::int as total
           from atendimento_servico es
           join atendimento a on a.id = es.atendimento_id
           join servico s on s.id = es.servico_id
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
