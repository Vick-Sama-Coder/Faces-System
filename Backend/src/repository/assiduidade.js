import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { assiduidade, funcionario } from '../db/schema/index.js';

const campos = {
    id: assiduidade.id,
    funcionario_id: assiduidade.funcionario_id,
    funcionario_nome: funcionario.nome,
    data: assiduidade.data,
    hora_entrada_real: assiduidade.hora_entrada_real,
    hora_saida_real: assiduidade.hora_saida_real,
    tipo_ocorrencia: assiduidade.tipo_ocorrencia,
    justificacao: assiduidade.justificacao,
    estado: assiduidade.estado,
    registado_por: assiduidade.registado_por,
    criado_em: assiduidade.criado_em
};

//filtros opcionais porque a assiduidade e consultada por funcionario, periodo ou ocorrencia
const findAll = async ({ funcionario: funcionarioId, de, ate, tipo } = {}) => {
    const condicoes = [];

    if (funcionarioId !== undefined && funcionarioId !== null && funcionarioId !== '') {
        condicoes.push(eq(assiduidade.funcionario_id, funcionarioId));
    }
    if (de) condicoes.push(sql`${assiduidade.data} >= ${de}`);
    if (ate) condicoes.push(sql`${assiduidade.data} <= ${ate}`);
    if (tipo !== undefined && tipo !== null && tipo !== '') {
        condicoes.push(eq(assiduidade.tipo_ocorrencia, tipo));
    }

    return db.select(campos)
        .from(assiduidade)
        .innerJoin(funcionario, eq(funcionario.id, assiduidade.funcionario_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${assiduidade.data} desc`, asc(funcionario.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(assiduidade)
        .innerJoin(funcionario, eq(funcionario.id, assiduidade.funcionario_id))
        .where(eq(assiduidade.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({
    funcionario_id,
    data,
    hora_entrada_real,
    hora_saida_real,
    tipo_ocorrencia,
    justificacao,
    registado_por
}) => {
    const [linha] = await db.insert(assiduidade)
        .values({
            funcionario_id,
            data: data ?? sql`current_date`,
            hora_entrada_real: hora_entrada_real ?? null,
            hora_saida_real: hora_saida_real ?? null,
            tipo_ocorrencia: tipo_ocorrencia ?? null,
            justificacao: justificacao ?? null,
            registado_por: registado_por ?? null
        })
        .returning({ id: assiduidade.id });

    return linha.id;
};

//coalesce mantem o valor atual, para corrigir apenas o campo errado sem reenviar os restantes
const update = async (id, {
    hora_entrada_real,
    hora_saida_real,
    tipo_ocorrencia,
    justificacao,
    estado
}) => {
    const valores = {};

    if (hora_entrada_real !== undefined && hora_entrada_real !== null) valores.hora_entrada_real = hora_entrada_real;
    if (hora_saida_real !== undefined && hora_saida_real !== null) valores.hora_saida_real = hora_saida_real;
    if (tipo_ocorrencia !== undefined && tipo_ocorrencia !== null) valores.tipo_ocorrencia = tipo_ocorrencia;
    if (justificacao !== undefined && justificacao !== null) valores.justificacao = justificacao;
    if (estado !== undefined && estado !== null) valores.estado = estado;

    if (Object.keys(valores).length === 0) {
        const [linha] = await db.select({ id: assiduidade.id })
            .from(assiduidade)
            .where(eq(assiduidade.id, id))
            .limit(1);

        return linha || null;
    }

    const [linha] = await db.update(assiduidade)
        .set(valores)
        .where(eq(assiduidade.id, id))
        .returning({ id: assiduidade.id });

    return linha || null;
};

const Assiduidade = {
    findAll,
    findById,
    create,
    update
};

export default Assiduidade;
