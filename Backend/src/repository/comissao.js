import pool from '../config/database.js';

const campos = `co.id, co.atendimento_servico_id, co.funcionario_id, f.nome as funcionario_nome,
    co.taxa::float8 as taxa, co.base_calculo, co.valor_comissao, co.estado, co.criado_em`;

//listagem com filtros opcionais (funcionario, periodo, estado)
const findAll = async ({ funcionario, de, ate, estado } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from comissao co
           join funcionario f on f.id = co.funcionario_id
          where ($1::int is null or co.funcionario_id = $1)
            and ($2::date is null or co.criado_em::date >= $2)
            and ($3::date is null or co.criado_em::date <= $3)
            and ($4::text is null or co.estado = $4)
          order by co.criado_em desc`,
        [funcionario || null, de || null, ate || null, estado || null]
    );

    return result.rows;
};

//gera a comissao de cada servico do atendimento que ainda nao tenha comissao.
//a taxa especifica por servico sobrepoe-se a geral do funcionario (RN27);
//o "on conflict do nothing" garante idempotencia (no maximo uma por servico).
const gerarParaAtendimento = async (client, atendimento_id) => {
    await client.query(
        `insert into comissao (atendimento_servico_id, funcionario_id, taxa, base_calculo, valor_comissao)
         select s.id,
                s.funcionario_id,
                coalesce(cc.taxa_percentual, f.comissao_percentual),
                s.valor_final,
                round(s.valor_final * coalesce(cc.taxa_percentual, f.comissao_percentual) / 100)::int
           from atendimento_servico s
           join funcionario f on f.id = s.funcionario_id
           left join lateral (
                select c.taxa_percentual
                  from comissao_config c
                 where c.funcionario_id = s.funcionario_id
                   and c.servico_id = s.servico_id
                   and c.estado = 'Ativo'
                 order by c.vigencia_inicio desc
                 limit 1
           ) cc on true
          where s.atendimento_id = $1 and s.estado = 'Ativo'
         on conflict (atendimento_servico_id) do nothing`,
        [atendimento_id]
    );
};

const Comissao = {
    findAll,
    gerarParaAtendimento
};

export default Comissao;
