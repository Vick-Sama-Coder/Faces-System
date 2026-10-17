import pool from '../config/database.js';

const campos = `l.id, l.id_utilizador, u.nome as utilizador_nome, l.data_hora, l.entidade,
    l.id_registo_afetado, l.tipo_operacao, l.valores_anteriores, l.valores_posteriores,
    l.motivo, l.identificador_operacao`;

//os filtros sao opcionais porque investigar uma ocorrencia nao deve obrigar a conhecermos o periodo
const findAll = async ({ entidade, utilizador, de, ate, operacao } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from log_auditoria l
           left join usuario u on u.id = l.id_utilizador
          where ($1::text is null or l.entidade = $1)
            and ($2::int is null or l.id_utilizador = $2)
            and ($3::date is null or l.data_hora::date >= $3)
            and ($4::date is null or l.data_hora::date <= $4)
            and ($5::text is null or l.tipo_operacao = $5)
          order by l.data_hora desc, l.id desc`,
        [entidade || null, utilizador || null, de || null, ate || null, operacao || null]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos}
           from log_auditoria l
           left join usuario u on u.id = l.id_utilizador
          where l.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

//serializar aqui evita que o driver trate arrays como arrays do postgres em vez de jsonb
const json = (valor) => (valor === undefined || valor === null ? null : JSON.stringify(valor));

//recebe o client para o registo ser gravado na mesma transacao da operacao auditada
const insert = async (db, { id_utilizador, entidade, id_registo_afetado, tipo_operacao, valores_anteriores, valores_posteriores, motivo, identificador_operacao }) => {
    const result = await db.query(
        `insert into log_auditoria
            (id_utilizador, entidade, id_registo_afetado, tipo_operacao,
             valores_anteriores, valores_posteriores, motivo, identificador_operacao)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [
            id_utilizador ?? null,
            entidade,
            id_registo_afetado ?? null,
            tipo_operacao,
            json(valores_anteriores),
            json(valores_posteriores),
            motivo ?? null,
            identificador_operacao ?? null
        ]
    );

    return result.rows[0].id;
};

const Auditoria = {
    findAll,
    findById,
    insert
};

export default Auditoria;
