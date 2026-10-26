import Categoria from "../repository/categoria.js";
import { codigoPostgres } from "../utils/erro.js";

//verifica duplicados sem depender de uma constraint unica na base de dados
const nomeDuplicado = async (nome, ignorarId = null) => {
    const categorias = await Categoria.findAll();
    return categorias.some((categoria) => (
        categoria.nome.trim().toLowerCase() === nome.toLowerCase()
        && Number(categoria.id) !== Number(ignorarId)
    ));
};

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
        const nome = typeof req.body.nome === "string" ? req.body.nome.trim() : "";

        if (!nome) {
            return res.status(400).json({ field: "nome", message: "O campo nome e obrigatorio" });
        }

        if (await nomeDuplicado(nome)) {
            return res.status(409).json({ field: "nome", message: "Ja existe uma categoria com este nome" });
        }

        res.status(201).json(await Categoria.create({ nome }));
    } catch (error) {
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe uma categoria com este nome" });
        }
        next(error);
    }
};

const updateCategoria = async (req, res, next) => {
    try {
        const nome = typeof req.body.nome === "string" ? req.body.nome.trim() : "";

        if (!nome) {
            return res.status(400).json({ field: "nome", message: "O campo nome e obrigatorio" });
        }

        if (await nomeDuplicado(nome, req.params.id)) {
            return res.status(409).json({ field: "nome", message: "Ja existe uma categoria com este nome" });
        }

        const categoria = await Categoria.update(req.params.id, { nome });

        if (!categoria) {
            return res.status(404).json({ message: "Categoria nao encontrada" });
        }

        res.status(200).json(categoria);
    } catch (error) {
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe uma categoria com este nome" });
        }
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
        if (codigoPostgres(error) === "23503") {
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
