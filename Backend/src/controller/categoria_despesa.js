import CategoriaDespesa from "../repository/categoria_despesa.js";

const getCategoriasDespesa = async (req, res, next) => {
    try {
        res.status(200).json(await CategoriaDespesa.findAll());
    } catch (error) {
        next(error);
    }
};

const createCategoriaDespesa = async (req, res, next) => {
    try {
        const { nome, tipo } = req.body;

        if (!nome) {
            return res.status(400).json({ message: "O nome da categoria e obrigatorio" });
        }

        res.status(201).json(await CategoriaDespesa.create({ nome, tipo }));
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe uma categoria com este nome" });
        }
        next(error);
    }
};

const CategoriaDespesaController = {
    getCategoriasDespesa,
    createCategoriaDespesa
};

export default CategoriaDespesaController;
