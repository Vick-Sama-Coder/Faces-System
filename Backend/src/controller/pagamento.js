import Pagamento from "../repository/pagamento.js";
import Atendimento from "../repository/atendimento.js";
import PagamentoService from "../services/pagamento.js";

const getPagamentos = async (req, res, next) => {
    try {
        const { de, ate, estado, metodo } = req.query;

        res.status(200).json(await Pagamento.findAll({ de, ate, estado, metodo }));
    } catch (error) {
        next(error);
    }
};

const getPagamentoById = async (req, res, next) => {
    try {
        const pagamento = await Pagamento.findById(req.params.id);

        if (!pagamento) {
            return res.status(404).json({ message: "Pagamento nao encontrado" });
        }

        pagamento.parcelas = await Pagamento.findParcelas(pagamento.id);
        res.status(200).json(pagamento);
    } catch (error) {
        next(error);
    }
};

//regista um pagamento (uma ou mais parcelas) para um atendimento
const registrarPagamento = async (req, res, next) => {
    try {
        const { parcelas } = req.body;

        if (!Array.isArray(parcelas) || parcelas.length === 0) {
            return res.status(400).json({ message: "E obrigatoria pelo menos uma parcela" });
        }

        const incompleta = parcelas.find((p) => !p.metodo_pagamento || p.valor === undefined);
        if (incompleta) {
            return res.status(400).json({ message: "Cada parcela exige metodo_pagamento e valor" });
        }

        const id = await PagamentoService.registrar(req.params.id, {
            parcelas,
            registado_por: req.user.id
        });

        const pagamento = await Pagamento.findById(id);
        pagamento.parcelas = await Pagamento.findParcelas(id);

        // A fila offline precisa do estado absoluto do atendimento para nao
        // somar o valor duas vezes ao cache local (uma na criacao otimista e
        // outra na sincronizacao). "atendimento" e um campo adicional e nao
        // altera o formato anterior da resposta.
        const atendimento = await Atendimento.findById(req.params.id);
        if (atendimento) {
            pagamento.atendimento = {
                id: atendimento.id,
                valor_total: atendimento.valor_total,
                valor_pago: atendimento.valor_pago,
                estado: atendimento.estado
            };
        }

        res.status(201).json(pagamento);
    } catch (error) {
        next(error);
    }
};

//estado de liquidacao de um atendimento
const getPagamentoDoAtendimento = async (req, res, next) => {
    try {
        const atendimento = await Atendimento.findById(req.params.id);

        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        res.status(200).json({
            atendimento_id: atendimento.id,
            valor_total: atendimento.valor_total,
            estado: atendimento.estado,
            pagamentos: await Pagamento.findByAtendimento(atendimento.id)
        });
    } catch (error) {
        next(error);
    }
};

const anularPagamento = async (req, res, next) => {
    try {
        const { motivo } = req.body;

        if (!motivo) {
            return res.status(400).json({ message: "O motivo da anulacao e obrigatorio" });
        }

        await PagamentoService.anular(req.params.id, { motivo, registado_por: req.user.id });
        res.status(200).json({ message: "Pagamento anulado" });
    } catch (error) {
        next(error);
    }
};

const PagamentoController = {
    getPagamentos,
    getPagamentoById,
    registrarPagamento,
    getPagamentoDoAtendimento,
    anularPagamento
};

export default PagamentoController;
