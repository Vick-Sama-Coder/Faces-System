import { asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { horarioFuncionario } from '../db/schema/index.js';

const campos = {
    id: horarioFuncionario.id,
    funcionario_id: horarioFuncionario.funcionario_id,
    dia_semana: horarioFuncionario.dia_semana,
    hora_entrada: horarioFuncionario.hora_entrada,
    hora_saida: horarioFuncionario.hora_saida,
    data_inicio_vigencia: horarioFuncionario.data_inicio_vigencia,
    data_fim_vigencia: horarioFuncionario.data_fim_vigencia,
    estado: horarioFuncionario.estado
};

const findByFuncionario = async (funcionario_id) => {
    return db.select(campos)
        .from(horarioFuncionario)
        .where(eq(horarioFuncionario.funcionario_id, funcionario_id))
        .orderBy(asc(horarioFuncionario.dia_semana), asc(horarioFuncionario.hora_entrada));
};

const create = async (funcionario_id, {
    dia_semana,
    hora_entrada,
    hora_saida,
    data_inicio_vigencia,
    data_fim_vigencia
}) => {
    const [linha] = await db.insert(horarioFuncionario)
        .values({
            funcionario_id,
            dia_semana,
            hora_entrada,
            hora_saida,
            data_inicio_vigencia: data_inicio_vigencia ?? sql`current_date`,
            data_fim_vigencia: data_fim_vigencia ?? null
        })
        .returning(campos);

    return linha;
};

//substituir numa transacao evita deixar a programacao pela metade se um horario falhar
const substituir = async (funcionario_id, horarios) => {
    await db.transaction(async (tx) => {
        await tx.delete(horarioFuncionario)
            .where(eq(horarioFuncionario.funcionario_id, funcionario_id));

        if (horarios.length === 0) {
            return;
        }

        await tx.insert(horarioFuncionario).values(
            horarios.map((horario) => ({
                funcionario_id,
                dia_semana: horario.dia_semana,
                hora_entrada: horario.hora_entrada,
                hora_saida: horario.hora_saida,
                data_inicio_vigencia: horario.data_inicio_vigencia ?? sql`current_date`,
                data_fim_vigencia: horario.data_fim_vigencia ?? null
            }))
        );
    });
};

const Horario = {
    findByFuncionario,
    create,
    substituir
};

export default Horario;
