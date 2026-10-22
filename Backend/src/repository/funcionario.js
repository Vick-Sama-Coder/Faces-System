import { and, asc, eq, ne, sql } from 'drizzle-orm';
import db from '../db/client.js';
import {
    atendimento,
    atendimentoServico,
    funcionario,
    servico
} from '../db/schema/index.js';

//campos devolvidos pela API (data_admissao formatada para evitar desvios de fuso)
const campos = {
    id: funcionario.id,
    nome: funcionario.nome,
    telefone: funcionario.telefone,
    documento: funcionario.documento,
    cargo: funcionario.cargo,
    data_admissao: sql`to_char(${funcionario.data_admissao}, 'YYYY-MM-DD')`,
    salario: funcionario.salario,
    comissao_percentual: sql`${funcionario.comissao_percentual}::float8`,
    estado: funcionario.estado,
    id_usuario: funcionario.id_usuario,
    data_criacao: funcionario.data_criacao
};

const findAll = async () => {
    return db.select(campos)
        .from(funcionario)
        .orderBy(asc(funcionario.nome));
};

const findById = async (id) => {
    const [linha] = await db.select(campos)
        .from(funcionario)
        .where(eq(funcionario.id, id))
        .limit(1);

    return linha || null;
};

const create = async ({
    nome,
    telefone,
    documento,
    cargo,
    data_admissao,
    salario,
    comissao_percentual,
    id_usuario
}) => {
    const [linha] = await db.insert(funcionario)
        .values({
            nome,
            telefone: telefone ?? null,
            documento: documento ?? null,
            cargo: cargo ?? null,
            data_admissao: data_admissao ?? null,
            salario,
            comissao_percentual: comissao_percentual !== undefined && comissao_percentual !== null
                ? String(comissao_percentual)
                : '30.00',
            id_usuario: id_usuario ?? null
        })
        .returning(campos);

    return linha;
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, {
    nome,
    telefone,
    documento,
    cargo,
    data_admissao,
    salario,
    comissao_percentual,
    id_usuario
}) => {
    const valores = {};

    if (nome !== undefined && nome !== null) valores.nome = nome;
    if (telefone !== undefined && telefone !== null) valores.telefone = telefone;
    if (documento !== undefined && documento !== null) valores.documento = documento;
    if (cargo !== undefined && cargo !== null) valores.cargo = cargo;
    if (data_admissao !== undefined && data_admissao !== null) valores.data_admissao = data_admissao;
    if (salario !== undefined && salario !== null) valores.salario = salario;
    if (comissao_percentual !== undefined && comissao_percentual !== null) {
        valores.comissao_percentual = String(comissao_percentual);
    }
    if (id_usuario !== undefined && id_usuario !== null) valores.id_usuario = id_usuario;

    if (Object.keys(valores).length === 0) {
        return findById(id);
    }

    const [linha] = await db.update(funcionario)
        .set(valores)
        .where(eq(funcionario.id, id))
        .returning(campos);

    return linha || null;
};

const updateEstado = async (id, estado) => {
    const [linha] = await db.update(funcionario)
        .set({ estado })
        .where(eq(funcionario.id, id))
        .returning({
            id: funcionario.id,
            nome: funcionario.nome,
            estado: funcionario.estado
        });

    return linha || null;
};

//remocao: devolve o id apagado ou null se nao existir
//(o postgres bloqueia se houver atendimentos com este funcionario)
const deleteFuncionario = async (id) => {
    const [linha] = await db.delete(funcionario)
        .where(eq(funcionario.id, id))
        .returning({ id: funcionario.id });

    return linha || null;
};

//desempenho do periodo: quantidade e total por servico realizado
const findDesempenho = async (funcionario_id, { de, ate }) => {
    const condicoes = [
        eq(atendimentoServico.funcionario_id, funcionario_id),
        eq(atendimentoServico.estado, 'Ativo'),
        ne(atendimento.estado, 'Anulado')
    ];

    if (de) condicoes.push(sql`${atendimento.data_hora}::date >= ${de}`);
    if (ate) condicoes.push(sql`${atendimento.data_hora}::date <= ${ate}`);

    return db.select({
        servico_id: servico.id,
        servico_nome: servico.nome,
        quantidade: sql`count(*)::int`,
        total: sql`sum(${atendimentoServico.valor_final})::int`
    })
        .from(atendimentoServico)
        .innerJoin(atendimento, eq(atendimento.id, atendimentoServico.atendimento_id))
        .innerJoin(servico, eq(servico.id, atendimentoServico.servico_id))
        .where(and(...condicoes))
        .groupBy(servico.id, servico.nome)
        .orderBy(asc(servico.nome));
};

const Funcionario = {
    findAll,
    findById,
    create,
    update,
    updateEstado,
    delete: deleteFuncionario,
    findDesempenho
};

export default Funcionario;
