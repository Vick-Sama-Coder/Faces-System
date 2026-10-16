import pool from '../config/database.js';

//listagem de todos os funcionarios (ordenada por nome para a grid do frontend)
const findAll = async () => {
    const result = await pool.query(
        "select id, nome, salario, comissao from funcionario order by nome"
    );

    return result.rows;
};

//busca de um unico funcionario pelo id (devolve null se nao existir)
const findById = async (id) => {
    const result = await pool.query(
        "select id, nome, salario, comissao from funcionario where id = $1",
        [id]
    );

    return result.rows[0] || null;
};

//criacao: os campos chegam sempre do controller (nome, salario, comissao)
const create = async ({ nome, salario, comissao }) => {
    const result = await pool.query(
        `insert into funcionario (nome, salario, comissao)
         values ($1, $2, $3)
         returning id, nome, salario, comissao`,
        [nome, salario, comissao]
    );

    return result.rows[0];
};

//atualizacao parcial: campos a null sao ignorados e mantem o valor atual
const update = async (id, { nome, salario, comissao }) => {
    const result = await pool.query(
        `update funcionario
         set nome = coalesce($2, nome),
             salario = coalesce($3, salario),
             comissao = coalesce($4, comissao)
         where id = $1
         returning id, nome, salario, comissao`,
        [id, nome, salario, comissao]
    );

    return result.rows[0] || null;
};

//remocao: devolve o id apagado ou null se o funcionario nao existir
//(o postgres bloqueia a operacao se houver item_produto/execucao_servico ligados)
const deleteFuncionario = async (id) => {
    const result = await pool.query(
        "delete from funcionario where id = $1 returning id",
        [id]
    );

    return result.rows[0] || null;
};

const Funcionario = {
    findAll,
    findById,
    create,
    update,
    delete: deleteFuncionario
};

export default Funcionario;