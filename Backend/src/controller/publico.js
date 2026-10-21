import Servico from "../repository/servico.js";

//sem autenticacao (RF22) mas sem dados internos, para nao expor a operacao (RNF11)
const getServicosPublicos = async (req, res, next) => {
    try {
        res.status(200).json(await Servico.findPublicos());
    } catch (error) {
        next(error);
    }
};

const getServicoPublicoById = async (req, res, next) => {
    try {
        const servico = await Servico.findPublicoById(req.params.id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(servico);
    } catch (error) {
        next(error);
    }
};

const PublicoController = {
    getServicosPublicos,
    getServicoPublicoById
};

export default PublicoController;
