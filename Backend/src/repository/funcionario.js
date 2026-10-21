import pool from '../config/database.js';

//campos devolvidos pela API (data_admissao formatada para evitar desvios de fuso)
const campos = `id, nome, telefone, documento, cargo,
    to_char(data_admissao, 'YYYY-MM-DD') as data_admissao,
    salario, comissao_percentual::float8 as comissao_percentual,
    estado, id_usuario, data_criacao`;

const findAll = async () => {
    const result = await pool.query(
        `select ${campos} from funcionario order by nome`
    );

    return result.rows;
};

const findById = async (id) => {
    const result = await pool.query(
        `select ${campos} from funcionario where id = $1`,
        [id]
    );

    return result.rows[0] || null;
};

const create = async ({ nome, telefone, documento, cargo, data_admissao, salario, comissao_percentual, id_usuario }) => {
    const result = await pool.query(
        `insert into funcionario
            (nome, telefone, documento, cargo, data_admissao, salario, comissao_percentual, id_usuario)
         values ($1, $2, $3, $4, $5, $6, coalesce($7, 30.00), $8)
         returning ${campos}`,
        [nome, telefone, documento, cargo, data_admissao, salario, comissao_percentual, id_usuario]
    );

    return result.rows[0];
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, { nome, telefone, documento, cargo, data_admissao, salario, comissao_percentual, id_usuario }) => {
    const result = await pool.query(
        `update funcionario
            set nome = coalesce($2, nome),
                telefone = coalesce($3, telefone),
                documento = coalesce($4, documento),
                cargo = coalesce($5, cargo),
                data_admissao = coalesce($6, data_admissao),
                salario = coalesce($7, salario),
                comissao_percentual = coalesce($8, comissao_percentual),
                id_usuario = coalesce($9, id_usuario)
          where id = $1
          returning ${campos}`,
        [id, nome, telefone, documento, cargo, data_admissao, salario, comissao_percentual, id_usuario]
    );

    return result.rows[0] || null;
};

const updateEstado = async (id, estado) => {
    const result = await pool.query(
        `update funcionario set estado = $2 where id = $1
         returning id, nome, estado`,
        [id, estado]
    );

    return result.rows[0] || null;
};

//remocao: devolve o id apagado ou null se nao existir
//(o postgres bloqueia se houver atendimentos com este funcionario)
const deleteFuncionario = async (id) => {
    const result = await pool.query(
        "delete from funcionario where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

//desempenho do periodo: quantidade e total por servico realizado
const findDesempenho = async (funcionario_id, { de, ate }) => {
    const result = await pool.query(
        `select s.id as servico_id, s.nome as servico_nome,
                count(*)::int as quantidade,
                sum(es.valor_final)::int as total
           from atendimento_servico es
           join atendimento a on a.id = es.atendimento_id
           join servico s on s.id = es.servico_id
          where es.funcionario_id = $1
            and es.estado = 'Ativo'
            and a.estado <> 'Anulado'
            and ($2::date is null or a.data_hora::date >= $2)
            and ($3::date is null or a.data_hora::date <= $3)
          group by s.id, s.nome
          order by s.nome`,
        [funcionario_id, de || null, ate || null]
    );

    return result.rows;
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
