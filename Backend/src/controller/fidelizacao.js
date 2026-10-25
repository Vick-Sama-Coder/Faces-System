import FidelizacaoService from "../services/fidelizacao.js";
import Cliente from "../repository/cliente.js";

const getFidelizacao = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        res.status(200).json(await FidelizacaoService.progresso(cliente.id));
    } catch (error) {
        next(error);
    }
};

const corrigirFidelizacao = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        const { tipo_movimento, ciclo, observacao } = req.body;

        await FidelizacaoService.corrigir(cliente.id, { tipo_movimento, ciclo, observacao }, req.user.id);
        res.status(200).json(await FidelizacaoService.progresso(cliente.id));
    } catch (error) {
        next(error);
    }
};

//preenchimento manual do cartao (apenas Administrador)
const marcarFidelizacaoManual = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        const resultado = await FidelizacaoService.marcarManual(
            cliente.id,
            {
                quantidade: req.body?.quantidade,
                confirmar_beneficio: req.body?.confirmar_beneficio
            },
            req.user.id
        );

        res.status(200).json(resultado);
    } catch (error) {
        //409 com detalhes permite ao frontend pedir confirmacao para gerar beneficios
        if (error.status === 409 && error.details) {
            return res.status(409).json({ message: error.message, ...error.details });
        }
        next(error);
    }
};

const removerMarcaFidelizacao = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        const progresso = await FidelizacaoService.removerMarca(
            cliente.id,
            req.params.movimentoId,
            req.user.id
        );

        res.status(200).json(progresso);
    } catch (error) {
        next(error);
    }
};

const utilizarBeneficioFidelizacaoManual = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        const progresso = await FidelizacaoService.utilizarBeneficioManual(
            cliente.id,
            { observacao: req.body?.observacao },
            req.user.id
        );

        res.status(200).json(progresso);
    } catch (error) {
        next(error);
    }
};

const FidelizacaoController = {
    getFidelizacao,
    corrigirFidelizacao,
    marcarFidelizacaoManual,
    removerMarcaFidelizacao,
    utilizarBeneficioFidelizacaoManual
};

export default FidelizacaoController;
