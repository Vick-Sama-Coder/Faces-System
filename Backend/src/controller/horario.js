import Horario from "../repository/horario.js";
import Funcionario from "../repository/funcionario.js";

const getHorarios = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(await Horario.findByFuncionario(funcionario.id));
    } catch (error) {
        next(error);
    }
};

const createHorario = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const { dia_semana, hora_entrada, hora_saida } = req.body;
        if (dia_semana === undefined || !hora_entrada || !hora_saida) {
            return res.status(400).json({ message: "dia_semana, hora_entrada e hora_saida sao obrigatorios" });
        }

        res.status(201).json(await Horario.create(funcionario.id, req.body));
    } catch (error) {
        next(error);
    }
};

const substituirHorarios = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const { horarios } = req.body;
        if (!Array.isArray(horarios)) {
            return res.status(400).json({ message: "E obrigatoria uma lista de horarios" });
        }

        await Horario.substituir(funcionario.id, horarios);
        res.status(200).json(await Horario.findByFuncionario(funcionario.id));
    } catch (error) {
        next(error);
    }
};

const HorarioController = {
    getHorarios,
    createHorario,
    substituirHorarios
};

export default HorarioController;
