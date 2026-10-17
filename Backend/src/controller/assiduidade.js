import Assiduidade from "../repository/assiduidade.js";

const getAssiduidade = async (req, res, next) => {
    try {
        const { funcionario, de, ate, tipo } = req.query;
        res.status(200).json(await Assiduidade.findAll({ funcionario, de, ate, tipo }));
    } catch (error) {
        next(error);
    }
};

const createAssiduidade = async (req, res, next) => {
    try {
        const { funcionario_id } = req.body;

        if (!funcionario_id) {
            return res.status(400).json({ message: "funcionario_id e obrigatorio" });
        }

        const id = await Assiduidade.create({ ...req.body, registado_por: req.user.id });
        res.status(201).json(await Assiduidade.findById(id));
    } catch (error) {
        //23503 = funcionario inexistente
        if (error.code === "23503") {
            return res.status(400).json({ message: "Funcionario nao encontrado" });
        }
        next(error);
    }
};

const updateAssiduidade = async (req, res, next) => {
    try {
        const { hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, estado } = req.body;

        if (hora_entrada_real === undefined && hora_saida_real === undefined && tipo_ocorrencia === undefined &&
            justificacao === undefined && estado === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const registo = await Assiduidade.update(req.params.id, {
            hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, estado
        });

        if (!registo) {
            return res.status(404).json({ message: "Registo de assiduidade nao encontrado" });
        }

        res.status(200).json(await Assiduidade.findById(req.params.id));
    } catch (error) {
        next(error);
    }
};

const AssiduidadeController = {
    getAssiduidade,
    createAssiduidade,
    updateAssiduidade
};

export default AssiduidadeController;
