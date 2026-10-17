import pool from '../config/database.js';

const camposSessao = `s.id, s.caixa_id, s.data_abertura, s.saldo_inicial, s.aberto_por,
    s.data_fecho, s.valor_esperado, s.valor_contado, s.diferenca, s.observacoes,
    s.fechado_por, s.estado`;

const camposMovimento = `m.id, m.id_sessao, m.tipo_movimento, m.valor, m.descricao,
    m.data_hora, m.origem, m.referencia_id, m.registado_por, m.estado`;

//caixa ativo (o sistema opera com um caixa unico, RN09)
const caixaPrincipal = async (db = pool) => {
    const result = await db.query(
        "select id, designacao from caixa where estado = 'Ativo' order by id limit 1"
    );

    return result.rows[0] || null;
};

//sessao aberta (no maximo uma, garantido pelo indice unico parcial)
const findSessaoAberta = async (db = pool) => {
    const result = await db.query(
        `select ${camposSessao} from caixa_sessao s where s.estado = 'Aberta' order by s.data_abertura desc limit 1`
    );

    return result.rows[0] || null;
};

const findById = async (id, db = pool) => {
    const result = await db.query(
        `select ${camposSessao} from caixa_sessao s where s.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const abrir = async ({ caixa_id, saldo_inicial, aberto_por }) => {
    const result = await pool.query(
        `insert into caixa_sessao (caixa_id, saldo_inicial, aberto_por)
         values ($1, $2, $3)
         returning ${camposSessao.replaceAll('s.', '')}`,
        [caixa_id, saldo_inicial, aberto_por]
    );

    return result.rows[0];
};

//saldo esperado = saldo inicial + entradas - saidas/levantamentos (so movimentos ativos)
const saldoEsperado = async (db, sessao_id) => {
    const result = await db.query(
        `select s.saldo_inicial + coalesce((
                    select sum(case when m.tipo_movimento = 'Entrada' then m.valor else -m.valor end)
                      from movimento_caixa m
                     where m.id_sessao = s.id and m.estado = 'Ativo'
                ), 0)::int as esperado
           from caixa_sessao s
          where s.id = $1`,
        [sessao_id]
    );

    return result.rows[0] ? result.rows[0].esperado : null;
};

const movimentos = async (sessao_id, db = pool) => {
    const result = await db.query(
        `select ${camposMovimento}
           from movimento_caixa m
          where m.id_sessao = $1
          order by m.data_hora, m.id`,
        [sessao_id]
    );

    return result.rows;
};

//idempotente por (origem, referencia_id): repeticoes nao duplicam o movimento (RNF05)
const inserirMovimento = async (db, { id_sessao, tipo_movimento, valor, descricao, origem, referencia_id, registado_por }) => {
    await db.query(
        `insert into movimento_caixa
            (id_sessao, tipo_movimento, valor, descricao, origem, referencia_id, registado_por)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict do nothing`,
        [id_sessao, tipo_movimento, valor, descricao, origem, referencia_id ?? null, registado_por]
    );
};

const fechar = async (db, sessao_id, { valor_esperado, valor_contado, diferenca, observacoes, fechado_por }) => {
    await db.query(
        `update caixa_sessao
            set estado = 'Fechada',
                data_fecho = now(),
                valor_esperado = $2,
                valor_contado = $3,
                diferenca = $4,
                observacoes = $5,
                fechado_por = $6
          where id = $1`,
        [sessao_id, valor_esperado, valor_contado, diferenca, observacoes ?? null, fechado_por]
    );
};

//historico de fechos (sessoes fechadas), com filtro opcional por periodo
const findFechos = async ({ de, ate } = {}) => {
    const result = await pool.query(
        `select ${camposSessao}
           from caixa_sessao s
          where s.estado = 'Fechada'
            and ($1::date is null or s.data_fecho::date >= $1)
            and ($2::date is null or s.data_fecho::date <= $2)
          order by s.data_fecho desc`,
        [de || null, ate || null]
    );

    return result.rows;
};

const Caixa = {
    caixaPrincipal,
    findSessaoAberta,
    findById,
    abrir,
    saldoEsperado,
    movimentos,
    inserirMovimento,
    fechar,
    findFechos
};

export default Caixa;
