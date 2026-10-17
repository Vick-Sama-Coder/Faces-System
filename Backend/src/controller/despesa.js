import Despesa from "../repository/despesa.js";
import DespesaService from "../services/despesa.js";

const getDespesas = async (req, res, next) => {
    try {
        const { de, ate, categoria, estado } = req.query;
        res.status(200).json(await Despesa.findAll({ de, ate, categoria, estado }));
    } catch (error) {
        next(error);
    }
};

const getDespesaById = async (req, res, next) => {
    try {
        const despesa = await Despesa.findById(req.params.id);

        if (!despesa) {
            return res.status(404).json({ message: "Despesa nao encontrada" });
        }

        despesa.itens = await Despesa.findItens(despesa.id);
        res.status(200).json(despesa);
    } catch (error) {
        next(error);
    }
};

const createDespesa = async (req, res, next) => {
    try {
        const { descricao, valor_total, itens } = req.body;
        const temItens = Array.isArray(itens) && itens.length > 0;

        if (!descricao || (!temItens && valor_total === undefined)) {
            return res.status(400).json({ message: "descricao e valor_total (ou itens) sao obrigatorios" });
        }

        const id = await DespesaService.criar(req.body, req.user.id);

        const despesa = await Despesa.findById(id);
        despesa.itens = await Despesa.findItens(id);
        res.status(201).json(despesa);
    } catch (error) {
        //23503 = categoria/produto/funcionario inexistente
        if (error.code === "23503") {
            return res.status(400).json({ message: "Categoria, produto ou funcionario nao encontrado" });
        }
        next(error);
    }
};

const updateDespesa = async (req, res, next) => {
    try {
        const { descricao, categoria_id, valor_total, data_compra, metodo_pagamento, comprovativo } = req.body;

        if (descricao === undefined && categoria_id === undefined && valor_total === undefined &&
            data_compra === undefined && metodo_pagamento === undefined && comprovativo === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const despesa = await Despesa.update(req.params.id, {
            descricao, categoria_id, valor_total, data_compra, metodo_pagamento, comprovativo
        });

        if (!despesa) {
            return res.status(404).json({ message: "Despesa nao encontrada" });
        }

        res.status(200).json(await Despesa.findById(req.params.id));
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ message: "Categoria nao encontrada" });
        }
        next(error);
    }
};

const deleteDespesa = async (req, res, next) => {
    try {
        const despesa = await Despesa.delete(req.params.id);

        if (!despesa) {
            return res.status(404).json({ message: "Despesa nao encontrada" });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const DespesaController = {
    getDespesas,
    getDespesaById,
    createDespesa,
    updateDespesa,
    deleteDespesa
};

export default DespesaController;
