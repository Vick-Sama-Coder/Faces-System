import Categoria from "../repository/categoria.js";

const getCategorias = async (req, res, next) => {
    try {
        res.status(200).json(await Categoria.findAll());
    } catch (error) {
        next(error);
    }
};

const getCategoriaById = async (req, res, next) => {
    try {
        const categoria = await Categoria.findById(req.params.id);

        if (!categoria) {
            return res.status(404).json({ message: "Categoria nao encontrada" });
        }

        res.status(200).json(categoria);
    } catch (error) {
        next(error);
    }
};

const createCategoria = async (req, res, next) => {
    try {
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ message: "O campo nome e obrigatorio" });
        }

        res.status(201).json(await Categoria.create({ nome }));
    } catch (error) {
        next(error);
    }
};

const updateCategoria = async (req, res, next) => {
    try {
        const { nome } = req.body;

        if (nome === undefined) {
            return res.status(400).json({ message: "O campo nome e obrigatorio" });
        }

        const categoria = await Categoria.update(req.params.id, { nome });

        if (!categoria) {
            return res.status(404).json({ message: "Categoria nao encontrada" });
        }

        res.status(200).json(categoria);
    } catch (error) {
        next(error);
    }
};

const deleteCategoria = async (req, res, next) => {
    try {
        const apagada = await Categoria.delete(req.params.id);

        if (!apagada) {
            return res.status(404).json({ message: "Categoria nao encontrada" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem servicos nesta categoria
        if (error.code === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem servicos nesta categoria" });
        }
        next(error);
    }
};

const CategoriaController = {
    getCategorias,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria
};

export default CategoriaController;
