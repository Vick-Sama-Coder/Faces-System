import Servico from "../repository/servico.js";

const getServicos = async (req, res, next) => {
    try {
        res.status(200).json(await Servico.findAll());
    } catch (error) {
        next(error);
    }
};

const getServicoById = async (req, res, next) => {
    try {
        const servico = await Servico.findById(req.params.id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(servico);
    } catch (error) {
        next(error);
    }
};

const createServico = async (req, res, next) => {
    try {
        const { nome, valor, categoria_id } = req.body;

        if (!nome || valor === undefined || !categoria_id) {
            return res.status(400).json({ message: "Os campos nome, valor e categoria_id sao obrigatorios" });
        }

        res.status(201).json(await Servico.create({ nome, valor, categoria_id }));
    } catch (error) {
        //23503 = a categoria informada nao existe
        if (error.code === "23503") {
            return res.status(400).json({ message: "Categoria nao encontrada" });
        }
        next(error);
    }
};

const updateServico = async (req, res, next) => {
    try {
        const { nome, valor, categoria_id } = req.body;

        if (nome === undefined && valor === undefined && categoria_id === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const servico = await Servico.update(req.params.id, { nome, valor, categoria_id });

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(servico);
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ message: "Categoria nao encontrada" });
        }
        next(error);
    }
};

const deleteServico = async (req, res, next) => {
    try {
        const apagado = await Servico.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem atendimentos com este servico
        if (error.code === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este servico" });
        }
        next(error);
    }
};

const ServicoController = {
    getServicos,
    getServicoById,
    createServico,
    updateServico,
    deleteServico
};

export default ServicoController;
