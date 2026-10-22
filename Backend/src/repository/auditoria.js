import { and, desc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { logAuditoria, usuario } from '../db/schema/index.js';

const campos = {
    id: logAuditoria.id,
    id_utilizador: logAuditoria.id_utilizador,
    utilizador_nome: usuario.nome,
    data_hora: logAuditoria.data_hora,
    entidade: logAuditoria.entidade,
    id_registo_afetado: logAuditoria.id_registo_afetado,
    tipo_operacao: logAuditoria.tipo_operacao,
    valores_anteriores: logAuditoria.valores_anteriores,
    valores_posteriores: logAuditoria.valores_posteriores,
    motivo: logAuditoria.motivo,
    identificador_operacao: logAuditoria.identificador_operacao
};

//os filtros sao opcionais porque investigar uma ocorrencia nao deve obrigar a conhecermos o periodo
const findAll = async ({ entidade, utilizador, de, ate, operacao } = {}) => {
    const condicoes = [];

    if (entidade !== undefined && entidade !== null && entidade !== '') {
        condicoes.push(eq(logAuditoria.entidade, entidade));
    }
    if (utilizador !== undefined && utilizador !== null && utilizador !== '') {
        condicoes.push(eq(logAuditoria.id_utilizador, utilizador));
    }
    if (de) {
        condicoes.push(sql`${logAuditoria.data_hora}::date >= ${de}`);
    }
    if (ate) {
        condicoes.push(sql`${logAuditoria.data_hora}::date <= ${ate}`);
    }
    if (operacao !== undefined && operacao !== null && operacao !== '') {
        condicoes.push(eq(logAuditoria.tipo_operacao, operacao));
    }

    return db.select(campos)
        .from(logAuditoria)
        .leftJoin(usuario, eq(usuario.id, logAuditoria.id_utilizador))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(desc(logAuditoria.data_hora), desc(logAuditoria.id));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(logAuditoria)
        .leftJoin(usuario, eq(usuario.id, logAuditoria.id_utilizador))
        .where(eq(logAuditoria.id, id))
        .limit(1);

    return linha || null;
};

//recebe o executor (db ou transacao) para o registo ser gravado na mesma
//transacao da operacao auditada
const insert = async (executor, {
    id_utilizador,
    entidade,
    id_registo_afetado,
    tipo_operacao,
    valores_anteriores,
    valores_posteriores,
    motivo,
    identificador_operacao
}) => {
    const [linha] = await executor.insert(logAuditoria)
        .values({
            id_utilizador: id_utilizador ?? null,
            entidade,
            id_registo_afetado: id_registo_afetado ?? null,
            tipo_operacao,
            valores_anteriores: valores_anteriores ?? null,
            valores_posteriores: valores_posteriores ?? null,
            motivo: motivo ?? null,
            identificador_operacao: identificador_operacao ?? null
        })
        .returning({ id: logAuditoria.id });

    return linha.id;
};

const Auditoria = {
    findAll,
    findById,
    insert
};

export default Auditoria;
