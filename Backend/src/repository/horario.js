import { asc, eq } from 'drizzle-orm';
import db from '../db/client.js';
import { horarioFuncionario, horarioFuncionarioHistorico } from '../db/schema/index.js';

const campos = {
    id: horarioFuncionario.id,
    funcionario_id: horarioFuncionario.funcionario_id,
    dia_semana: horarioFuncionario.dia_semana,
    hora_entrada: horarioFuncionario.hora_entrada,
    hora_saida: horarioFuncionario.hora_saida,
    estado: horarioFuncionario.estado
};

const camposHistorico = {
    id: horarioFuncionarioHistorico.id,
    funcionario_id: horarioFuncionarioHistorico.funcionario_id,
    dia_semana: horarioFuncionarioHistorico.dia_semana,
    hora_entrada: horarioFuncionarioHistorico.hora_entrada,
    hora_saida: horarioFuncionarioHistorico.hora_saida,
    estado: horarioFuncionarioHistorico.estado,
    substituido_em: horarioFuncionarioHistorico.substituido_em,
    substituido_por: horarioFuncionarioHistorico.substituido_por
};

const findByFuncionario = async (funcionario_id) => {
    return db.select(campos)
        .from(horarioFuncionario)
        .where(eq(horarioFuncionario.funcionario_id, funcionario_id))
        .orderBy(asc(horarioFuncionario.dia_semana), asc(horarioFuncionario.hora_entrada));
};

const findHistorico = async (funcionario_id) => {
    return db.select(camposHistorico)
        .from(horarioFuncionarioHistorico)
        .where(eq(horarioFuncionarioHistorico.funcionario_id, funcionario_id))
        .orderBy(
            asc(horarioFuncionarioHistorico.substituido_em),
            asc(horarioFuncionarioHistorico.dia_semana),
            asc(horarioFuncionarioHistorico.hora_entrada)
        );
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(horarioFuncionario)
        .where(eq(horarioFuncionario.id, id))
        .limit(1);

    return linha || null;
};

// Copia os turnos atuais para o historico antes de qualquer alteracao. A copia
// e feita dentro da mesma transacao da alteracao para nao perder versoes.
const registarHistorico = async (tx, funcionario_id, substituido_por) => {
    const atuais = await tx.select(campos)
        .from(horarioFuncionario)
        .where(eq(horarioFuncionario.funcionario_id, funcionario_id));

    if (atuais.length === 0) return;

    await tx.insert(horarioFuncionarioHistorico).values(
        atuais.map((horario) => ({
            funcionario_id: horario.funcionario_id,
            dia_semana: horario.dia_semana,
            hora_entrada: horario.hora_entrada,
            hora_saida: horario.hora_saida,
            estado: horario.estado,
            substituido_por: substituido_por ?? null
        }))
    );
};

const create = async (funcionario_id, {
    dia_semana,
    hora_entrada,
    hora_saida
}) => {
    const [linha] = await db.insert(horarioFuncionario)
        .values({
            funcionario_id,
            dia_semana,
            hora_entrada,
            hora_saida
        })
        .returning(campos);

    return linha;
};

//substituir numa transacao evita deixar a programacao pela metade se um horario falhar
const substituir = async (funcionario_id, horarios, { substituido_por } = {}) => {
    await db.transaction(async (tx) => {
        await registarHistorico(tx, funcionario_id, substituido_por);

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
                hora_saida: horario.hora_saida
            }))
        );
    });
};

const deletar = async (funcionario_id, dia_semana, { substituido_por } = {}) => {
    await db.transaction(async (tx) => {
        await registarHistorico(tx, funcionario_id, substituido_por);

        await tx.delete(horarioFuncionario)
            .where(eq(horarioFuncionario.funcionario_id, funcionario_id))
            .where(eq(horarioFuncionario.dia_semana, dia_semana));
    });
};

//actualizacao de um turno individual
const update = async (id, {
    dia_semana,
    hora_entrada,
    hora_saida
}, { substituido_por } = {}) => {
    return db.transaction(async (tx) => {
        const atual = await tx.select(campos)
            .from(horarioFuncionario)
            .where(eq(horarioFuncionario.id, id))
            .limit(1);

        if (atual[0]) {
            await tx.insert(horarioFuncionarioHistorico).values({
                funcionario_id: atual[0].funcionario_id,
                dia_semana: atual[0].dia_semana,
                hora_entrada: atual[0].hora_entrada,
                hora_saida: atual[0].hora_saida,
                estado: atual[0].estado,
                substituido_por: substituido_por ?? null
            });
        }

        const [linha] = await tx.update(horarioFuncionario)
            .set({
                dia_semana,
                hora_entrada,
                hora_saida
            })
            .where(eq(horarioFuncionario.id, id))
            .returning(campos);

        return linha || null;
    });
};

//remocao de um turno individual
const deleteById = async (id, { substituido_por } = {}) => {
    return db.transaction(async (tx) => {
        const atual = await tx.select(campos)
            .from(horarioFuncionario)
            .where(eq(horarioFuncionario.id, id))
            .limit(1);

        if (!atual[0]) return null;

        await tx.insert(horarioFuncionarioHistorico).values({
            funcionario_id: atual[0].funcionario_id,
            dia_semana: atual[0].dia_semana,
            hora_entrada: atual[0].hora_entrada,
            hora_saida: atual[0].hora_saida,
            estado: atual[0].estado,
            substituido_por: substituido_por ?? null
        });

        const [linha] = await tx.delete(horarioFuncionario)
            .where(eq(horarioFuncionario.id, id))
            .returning({
                id: horarioFuncionario.id,
                funcionario_id: horarioFuncionario.funcionario_id
            });

        return linha || null;
    });
};

const Horario = {
    findByFuncionario,
    findHistorico,
    findById,
    create,
    substituir,
    deletar,
    update,
    deleteById
};

export default Horario;
