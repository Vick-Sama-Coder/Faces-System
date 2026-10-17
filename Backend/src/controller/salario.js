import Salario from "../repository/salario.js";
import SalarioService from "../services/salario.js";

const getProcessamentos = async (req, res, next) => {
    try {
        const { periodo, funcionario, estado } = req.query;
        res.status(200).json(await Salario.findProcessamentos({ periodo, funcionario, estado }));
    } catch (error) {
        next(error);
    }
};

const getProcessamentoById = async (req, res, next) => {
    try {
        const processamento = await Salario.findProcessamentoById(req.params.id);

        if (!processamento) {
            return res.status(404).json({ message: "Processamento nao encontrado" });
        }

        processamento.deducoes = await Salario.findDeducoes(processamento.id);
        res.status(200).json(processamento);
    } catch (error) {
        next(error);
    }
};

const processar = async (req, res, next) => {
    try {
        const { periodo } = req.body;

        if (!periodo) {
            return res.status(400).json({ message: "periodo e obrigatorio (formato AAAA-MM)" });
        }

        const ids = await SalarioService.processar(periodo, req.user.id);

        const lista = [];
        for (const id of ids) {
            const processamento = await Salario.findProcessamentoById(id);
            processamento.deducoes = await Salario.findDeducoes(id);
            lista.push(processamento);
        }

        res.status(201).json(lista);
    } catch (error) {
        next(error);
    }
};

const atualizarDeducoes = async (req, res, next) => {
    try {
        const { deducoes } = req.body;

        if (!Array.isArray(deducoes)) {
            return res.status(400).json({ message: "E obrigatoria uma lista de deducoes" });
        }
        if (deducoes.some((d) => !d.tipo || d.valor === undefined)) {
            return res.status(400).json({ message: "Cada deducao precisa de tipo e valor" });
        }

        const processamento = await SalarioService.atualizarDeducoes(req.params.id, deducoes, req.user.id);
        processamento.deducoes = await Salario.findDeducoes(processamento.id);
        res.status(200).json(processamento);
    } catch (error) {
        next(error);
    }
};

const aprovar = async (req, res, next) => {
    try {
        res.status(200).json(await SalarioService.aprovar(req.params.id, req.user.id));
    } catch (error) {
        next(error);
    }
};

const pagar = async (req, res, next) => {
    try {
        res.status(200).json(await SalarioService.pagar(req.params.id, req.user.id));
    } catch (error) {
        next(error);
    }
};

const SalarioController = {
    getProcessamentos,
    getProcessamentoById,
    processar,
    atualizarDeducoes,
    aprovar,
    pagar
};

export default SalarioController;
