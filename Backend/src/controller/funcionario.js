import Funcionario from "../repository/funcionario.js";

const getFuncionarios = async (req, res, next) => {
    try {
        res.status(200).json(await Funcionario.findAll());
    } catch (error) {
        next(error);
    }
};

const getFuncionarioById = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(funcionario);
    } catch (error) {
        next(error);
    }
};

const createFuncionario = async (req, res, next) => {
    try {
        const { nome, salario, comissao } = req.body;

        if (!nome || salario === undefined) {
            return res.status(400).json({ message: "Os campos nome e salario sao obrigatorios" });
        }

        res.status(201).json(await Funcionario.create({ nome, salario, comissao }));
    } catch (error) {
        next(error);
    }
};

const updateFuncionario = async (req, res, next) => {
    try {
        const { nome, salario, comissao } = req.body;

        if (nome === undefined && salario === undefined && comissao === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const funcionario = await Funcionario.update(req.params.id, { nome, salario, comissao });

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(funcionario);
    } catch (error) {
        next(error);
    }
};

const deleteFuncionario = async (req, res, next) => {
    try {
        const apagado = await Funcionario.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem atendimentos associados a este funcionario
        if (error.code === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este funcionario" });
        }
        next(error);
    }
};

const FuncionarioController = {
    getFuncionarios,
    getFuncionarioById,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario
};

export default FuncionarioController;
