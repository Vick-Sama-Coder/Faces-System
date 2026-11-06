import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { assiduidade, assiduidadeAusencia, funcionario } from '../db/schema/index.js';

// As ausencias parciais ficam numa tabela filha para permitir varios intervalos
// no mesmo dia. O json_agg evita multiplicar as linhas do registo diario.
const campos = {
    id: assiduidade.id,
    funcionario_id: assiduidade.funcionario_id,
    funcionario_nome: funcionario.nome,
    data: sql`to_char(${assiduidade.data}, 'YYYY-MM-DD')`,
    hora_entrada_real: assiduidade.hora_entrada_real,
    hora_saida_real: assiduidade.hora_saida_real,
    tipo_ocorrencia: assiduidade.tipo_ocorrencia,
    justificacao: assiduidade.justificacao,
    estado: assiduidade.estado,
    registado_por: assiduidade.registado_por,
    criado_em: assiduidade.criado_em,
    ausencias: sql`coalesce((
        select json_agg(
            json_build_object(
                'id', aa.id,
                'hora_inicio', to_char(aa.hora_inicio, 'HH24:MI'),
                'hora_fim', to_char(aa.hora_fim, 'HH24:MI'),
                'motivo', aa.motivo,
                'registado_por', aa.registado_por,
                'criado_em', aa.criado_em
            )
            order by aa.hora_inicio, aa.id
        )
        from assiduidade_ausencia aa
        where aa.assiduidade_id = ${assiduidade.id}
    ), '[]'::json)`
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

const findById = async (id, executor = db) => {
    const [linha] = await executor.select(campos)
        .from(assiduidade)
        .innerJoin(funcionario, eq(funcionario.id, assiduidade.funcionario_id))
        .where(eq(assiduidade.id, id))
        .limit(1);

    return linha || null;
};

//usado pelo registo mensal para atualizar o dia sem duplicar (funcionario, data)
const findByFuncionarioData = async (funcionario_id, data, executor = db) => {
    const [linha] = await executor.select({ id: assiduidade.id })
        .from(assiduidade)
        .where(and(
            eq(assiduidade.funcionario_id, funcionario_id),
            eq(assiduidade.data, data)
        ))
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
}, executor = db) => {
    const [linha] = await executor.insert(assiduidade)
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
}, executor = db) => {
    const valores = {};

    if (hora_entrada_real !== undefined) valores.hora_entrada_real = hora_entrada_real || null;
    if (hora_saida_real !== undefined) valores.hora_saida_real = hora_saida_real || null;
    if (tipo_ocorrencia !== undefined) valores.tipo_ocorrencia = tipo_ocorrencia;
    if (justificacao !== undefined) valores.justificacao = justificacao;
    if (estado !== undefined && estado !== null) valores.estado = estado;

    if (Object.keys(valores).length === 0) {
        const [linha] = await executor.select({ id: assiduidade.id })
            .from(assiduidade)
            .where(eq(assiduidade.id, id))
            .limit(1);

        return linha || null;
    }

    const [linha] = await executor.update(assiduidade)
        .set(valores)
        .where(eq(assiduidade.id, id))
        .returning({ id: assiduidade.id });

    return linha || null;
};

// Substitui por completo as ausencias de um dia (usado no upsert mensal).
const substituirAusencias = async (assiduidade_id, ausencias, registado_por, executor = db) => {
    await executor.delete(assiduidadeAusencia)
        .where(eq(assiduidadeAusencia.assiduidade_id, assiduidade_id));

    if (!Array.isArray(ausencias) || ausencias.length === 0) return;

    await executor.insert(assiduidadeAusencia).values(ausencias.map((ausencia) => ({
        assiduidade_id,
        hora_inicio: ausencia.hora_inicio,
        hora_fim: ausencia.hora_fim,
        motivo: ausencia.motivo ?? null,
        registado_por: registado_por ?? null
    })));
};

const Assiduidade = {
    findAll,
    findById,
    findByFuncionarioData,
    create,
    update,
    substituirAusencias
};

export default Assiduidade;
