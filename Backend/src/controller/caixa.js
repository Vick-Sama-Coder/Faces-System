import CaixaService from "../services/caixa.js";
import Caixa from "../repository/caixa.js";

// A abertura e o fecho sao automaticos; estas rotas ficam bloqueadas para
// impedir que o estado seja alterado manualmente.
const abrirCaixa = async (req, res) => {
    res.status(403).json({
        message: "A abertura do caixa e automatica (todos os dias a partir das 08h)"
    });
};

const getCaixaAtual = async (req, res, next) => {
    try {
        res.status(200).json(await CaixaService.atual());
    } catch (error) {
        next(error);
    }
};

const registarLevantamento = async (req, res, next) => {
    try {
        const { valor, metodo_pagamento, descricao } = req.body;

        if (!valor || Number(valor) <= 0) {
            return res.status(400).json({ message: "O valor do levantamento tem de ser positivo" });
        }
        if (!metodo_pagamento) {
            return res.status(400).json({ message: "O metodo_pagamento e obrigatorio" });
        }

        await CaixaService.levantamento({ valor, metodo_pagamento, descricao, registado_por: req.user.id });
        res.status(201).json({ message: "Levantamento registado" });
    } catch (error) {
        next(error);
    }
};

const getMovimentos = async (req, res, next) => {
    try {
        res.status(200).json(await CaixaService.movimentos());
    } catch (error) {
        next(error);
    }
};

const fecharCaixa = async (req, res) => {
    res.status(403).json({
        message: "O fecho do caixa e automatico (todos os dias apos a meia-noite)"
    });
};

const getFechos = async (req, res, next) => {
    try {
        const { de, ate } = req.query;
        res.status(200).json(await Caixa.findFechos({ de, ate }));
    } catch (error) {
        next(error);
    }
};

const CaixaController = {
    abrirCaixa,
    getCaixaAtual,
    registarLevantamento,
    getMovimentos,
    fecharCaixa,
    getFechos
};

export default CaixaController;
