import CaixaService from "../services/caixa.js";
import Caixa from "../repository/caixa.js";

const abrirCaixa = async (req, res, next) => {
    try {
        const { saldo_inicial } = req.body;

        if (saldo_inicial === undefined) {
            return res.status(400).json({ message: "O saldo_inicial e obrigatorio" });
        }

        res.status(201).json(await CaixaService.abrir({ saldo_inicial, aberto_por: req.user.id }));
    } catch (error) {
        next(error);
    }
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
        const { valor, descricao } = req.body;

        if (!valor || Number(valor) <= 0) {
            return res.status(400).json({ message: "O valor do levantamento tem de ser positivo" });
        }

        await CaixaService.levantamento({ valor, descricao, registado_por: req.user.id });
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

const fecharCaixa = async (req, res, next) => {
    try {
        const { valor_contado, observacoes } = req.body;

        if (valor_contado === undefined) {
            return res.status(400).json({ message: "O valor_contado e obrigatorio" });
        }

        res.status(200).json(await CaixaService.fechar({ valor_contado, observacoes, fechado_por: req.user.id }));
    } catch (error) {
        next(error);
    }
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
