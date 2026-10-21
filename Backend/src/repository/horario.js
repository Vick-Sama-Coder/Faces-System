import pool from '../config/database.js';

const campos = `h.id, h.funcionario_id, h.dia_semana, h.hora_entrada, h.hora_saida,
    h.data_inicio_vigencia, h.data_fim_vigencia, h.estado`;

const findByFuncionario = async (funcionario_id) => {
    const result = await pool.query(
        `select ${campos}
           from horario_funcionario h
          where h.funcionario_id = $1
          order by h.dia_semana, h.hora_entrada`,
        [funcionario_id]
    );

    return result.rows;
};

const create = async (funcionario_id, { dia_semana, hora_entrada, hora_saida, data_inicio_vigencia, data_fim_vigencia }) => {
    const result = await pool.query(
        `insert into horario_funcionario
            (funcionario_id, dia_semana, hora_entrada, hora_saida, data_inicio_vigencia, data_fim_vigencia)
         values ($1, $2, $3, $4, coalesce($5, current_date), $6)
         returning id, funcionario_id, dia_semana, hora_entrada, hora_saida,
                   data_inicio_vigencia, data_fim_vigencia, estado`,
        [funcionario_id, dia_semana, hora_entrada, hora_saida, data_inicio_vigencia ?? null, data_fim_vigencia ?? null]
    );

    return result.rows[0];
};

//substituir numa transacao evita deixar a programacao pela metade se um horario falhar
const substituir = async (funcionario_id, horarios) => {
    const client = await pool.connect();

    try {
        await client.query('begin');
        await client.query("delete from horario_funcionario where funcionario_id = $1", [funcionario_id]);

        for (const h of horarios) {
            await client.query(
                `insert into horario_funcionario
                    (funcionario_id, dia_semana, hora_entrada, hora_saida, data_inicio_vigencia, data_fim_vigencia)
                 values ($1, $2, $3, $4, coalesce($5, current_date), $6)`,
                [funcionario_id, h.dia_semana, h.hora_entrada, h.hora_saida, h.data_inicio_vigencia ?? null, h.data_fim_vigencia ?? null]
            );
        }

        await client.query('commit');
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const Horario = {
    findByFuncionario,
    create,
    substituir
};

export default Horario;
