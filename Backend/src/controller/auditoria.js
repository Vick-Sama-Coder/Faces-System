import Auditoria from "../repository/auditoria.js";

const getAuditoria = async (req, res, next) => {
    try {
        const { entidade, utilizador, utilizador_nome, perfil, de, ate, operacao } = req.query;
        res.status(200).json(await Auditoria.findAll({
            entidade,
            utilizador,
            utilizador_nome,
            perfil,
            de,
            ate,
            operacao
        }));
    } catch (error) {
        next(error);
    }
};

const getOpcoes = async (req, res, next) => {
    try {
        res.status(200).json(await Auditoria.findOpcoes());
    } catch (error) {
        next(error);
    }
};

const getAuditoriaById = async (req, res, next) => {
    try {
        const registo = await Auditoria.findById(req.params.id);

        if (!registo) {
            return res.status(404).json({ message: "Registo de auditoria nao encontrado" });
        }

        res.status(200).json(registo);
    } catch (error) {
        next(error);
    }
};

const AuditoriaController = {
    getAuditoria,
    getOpcoes,
    getAuditoriaById
};

export default AuditoriaController;
