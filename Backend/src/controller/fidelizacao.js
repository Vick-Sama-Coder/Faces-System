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

const FidelizacaoController = {
    getFidelizacao,
    corrigirFidelizacao
};

export default FidelizacaoController;
