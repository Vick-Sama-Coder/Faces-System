import pool from '../config/database.js';

const campos = `a.id, a.funcionario_id, f.nome as funcionario_nome, a.data,
    a.hora_entrada_real, a.hora_saida_real, a.tipo_ocorrencia, a.justificacao,
    a.estado, a.registado_por, a.criado_em`;

//listagem com filtros opcionais (funcionario, periodo, tipo de ocorrencia)
const findAll = async ({ funcionario, de, ate, tipo } = {}) => {
    const result = await pool.query(
        `select ${campos}
           from assiduidade a
           join funcionario f on f.id = a.funcionario_id
          where ($1::int is null or a.funcionario_id = $1)
            and ($2::date is null or a.data >= $2)
            and ($3::date is null or a.data <= $3)
            and ($4::text is null or a.tipo_ocorrencia = $4)
          order by a.data desc, f.nome`,
        [funcionario || null, de || null, ate || null, tipo || null]
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos}
           from assiduidade a
           join funcionario f on f.id = a.funcionario_id
          where a.id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const create = async ({ funcionario_id, data, hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, registado_por }) => {
    const result = await pool.query(
        `insert into assiduidade
            (funcionario_id, data, hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, registado_por)
         values ($1, coalesce($2, current_date), $3, $4, $5, $6, $7)
         returning id`,
        [funcionario_id, data ?? null, hora_entrada_real ?? null, hora_saida_real ?? null, tipo_ocorrencia ?? null, justificacao ?? null, registado_por]
    );

    return result.rows[0].id;
};

//correcao parcial: campos a null sao ignorados
const update = async (id, { hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, estado }) => {
    const result = await pool.query(
        `update assiduidade
            set hora_entrada_real = coalesce($2, hora_entrada_real),
                hora_saida_real = coalesce($3, hora_saida_real),
                tipo_ocorrencia = coalesce($4, tipo_ocorrencia),
                justificacao = coalesce($5, justificacao),
                estado = coalesce($6, estado)
          where id = $1
          returning id`,
        [id, hora_entrada_real ?? null, hora_saida_real ?? null, tipo_ocorrencia ?? null, justificacao ?? null, estado ?? null]
    );

    return result.rows[0] || null;
};

const Assiduidade = {
    findAll,
    findById,
    create,
    update
};

export default Assiduidade;
