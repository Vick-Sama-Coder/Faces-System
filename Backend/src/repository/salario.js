import pool from '../config/database.js';

const campos = `p.id, p.funcionario_id, f.nome as funcionario_nome, p.periodo_inicio,
    p.periodo_fim, p.salario_base, p.total_comissoes, p.total_deducoes, p.total_a_pagar,
    p.estado, p.aprovado_por, p.data_aprovacao, p.data_pagamento, p.criado_em`;

//listagem com filtros opcionais (periodo AAAA-MM, funcionario, estado)
const findProcessamentos = async ({ periodo, funcionario, estado } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from processamento_salarial p
           join funcionario f on f.id = p.funcionario_id
          where ($1::text is null or to_char(p.periodo_inicio, 'YYYY-MM') = $1)
            and ($2::int is null or p.funcionario_id = $2)
            and ($3::text is null or p.estado = $3)
          order by p.periodo_inicio desc, f.nome`,
        [periodo || null, funcionario || null, estado || null]
    );

    return result.rows;
};

const findProcessamentoById = async (id, db = pool) => {
    const result = await db.query(
        `select ${campos}
           from processamento_salarial p
           join funcionario f on f.id = p.funcionario_id
          where p.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const findDeducoes = async (processamento_id) => {
    const result = await pool.query(
        `select id, processamento_id, tipo, descricao, valor, motivo, aprovado_por, criado_em
           from deducao_salarial
          where processamento_id = $1
          order by id`,
        [processamento_id]
    );

    return result.rows;
};

//---- operacoes usadas dentro de transacoes (recebem o client) ----

const findFuncionariosAtivos = async (db) => {
    const result = await db.query(
        `select id, nome, salario from funcionario where estado = 'Ativo' order by nome`
    );

    return result.rows;
};

//comissoes elegiveis do periodo (ainda nao pagas)
const somaComissoes = async (db, funcionario_id, periodo_inicio, periodo_fim) => {
    const result = await db.query(
        `select coalesce(sum(valor_comissao), 0)::int as total
           from comissao
          where funcionario_id = $1
            and estado = 'Elegivel'
            and criado_em::date between $2 and $3`,
        [funcionario_id, periodo_inicio, periodo_fim]
    );

    return result.rows[0].total;
};

//on conflict do nothing: nao duplica processamento do mesmo periodo
const inserirProcessamento = async (client, { funcionario_id, periodo_inicio, periodo_fim, salario_base, total_comissoes, total_deducoes, total_a_pagar }) => {
    const result = await client.query(
        `insert into processamento_salarial
            (funcionario_id, periodo_inicio, periodo_fim, salario_base, total_comissoes, total_deducoes, total_a_pagar)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict do nothing
         returning id`,
        [funcionario_id, periodo_inicio, periodo_fim, salario_base, total_comissoes, total_deducoes, total_a_pagar]
    );

    return result.rows[0]?.id || null;
};

const substituirDeducoes = async (client, processamento_id, deducoes, aprovado_por) => {
    await client.query("delete from deducao_salarial where processamento_id = $1", [processamento_id]);

    for (const d of deducoes) {
        await client.query(
            `insert into deducao_salarial (processamento_id, tipo, descricao, valor, motivo, aprovado_por)
             values ($1, $2, $3, $4, $5, $6)`,
            [processamento_id, d.tipo, d.descricao ?? null, d.valor, d.motivo ?? null, aprovado_por]
        );
    }
};

//recalcula deducoes e total a pagar a partir das linhas
const recalcular = async (client, processamento_id) => {
    await client.query(
        `update processamento_salarial p
            set total_deducoes = coalesce(t.total, 0),
                total_a_pagar = p.salario_base + p.total_comissoes - coalesce(t.total, 0)
           from (select $1::int as id) x
           left join (
                select processamento_id, sum(valor)::int as total
                  from deducao_salarial
                 where processamento_id = $1
                 group by processamento_id
           ) t on t.processamento_id = x.id
          where p.id = x.id`,
        [processamento_id]
    );
};

//---- transicoes de estado (pool) ----

const aprovar = async (id, aprovado_por) => {
    const result = await pool.query(
        `update processamento_salarial
            set estado = 'Aprovado', aprovado_por = $2, data_aprovacao = now()
          where id = $1
          returning id`,
        [id, aprovado_por]
    );

    return result.rows[0] || null;
};

const pagar = async (id, db = pool) => {
    const result = await db.query(
        `update processamento_salarial
            set estado = 'Pago', data_pagamento = now()
          where id = $1
          returning id`,
        [id]
    );

    return result.rows[0] || null;
};

//marca como pagas as comissoes elegiveis incluidas no processamento
const marcarComissoesPagas = async (db, funcionario_id, periodo_inicio, periodo_fim) => {
    await db.query(
        `update comissao
            set estado = 'Paga'
          where funcionario_id = $1
            and estado = 'Elegivel'
            and criado_em::date between $2 and $3`,
        [funcionario_id, periodo_inicio, periodo_fim]
    );
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
