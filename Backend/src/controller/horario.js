import Horario from "../repository/horario.js";
import Funcionario from "../repository/funcionario.js";
import {
    validarDiaSemana,
    validarHora,
    horaParaMinutos,
    horariosSobrepostos
} from "../utils/validacoes.js";

const podeGerirHorarios = (user) => (user?.permissoes || []).includes("horarios:gerir");

const normalizarHorario = (horario) => ({
    dia_semana: Number(horario.dia_semana),
    hora_entrada: String(horario.hora_entrada ?? "").trim(),
    hora_saida: String(horario.hora_saida ?? "").trim()
});

//devolve {field, message} ou null
const validarHorario = (horario) => {
    const erroDia = validarDiaSemana(horario.dia_semana);
    if(erroDia){
        return { field: "dia_semana", message: erroDia };
    }

    const erroEntrada = validarHora(horario.hora_entrada, "hora_entrada");
    if(erroEntrada){
        return { field: "hora_entrada", message: erroEntrada };
    }

    const erroSaida = validarHora(horario.hora_saida, "hora_saida");
    if(erroSaida){
        return { field: "hora_saida", message: erroSaida };
    }

    const entrada = horaParaMinutos(horario.hora_entrada);
    const saida = horaParaMinutos(horario.hora_saida);

    if(saida <= entrada){
        return {
            field: "hora_saida",
            message: "A hora de saida deve ser posterior a hora de entrada"
        };
    }

    return null;
};

const primeiroConflito = (horarios, candidato, ignorarId = null) => {
    return horarios.find((existente) => (
        String(existente.id) !== String(ignorarId) &&
        horariosSobrepostos(existente, candidato)
    ));
};

const getHorarios = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        //gestores vêem qualquer funcionário; os restantes só o próprio horário
        if (!podeGerirHorarios(req.user)) {
            const proprio = await Funcionario.findByUsuarioId(req.user.id);

            if (!proprio || Number(proprio.id) !== Number(funcionario.id)) {
                return res.status(403).json({ message: "Acesso negado: so pode consultar o proprio horario" });
            }
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

        const horario = normalizarHorario(req.body || {});
        const erro = validarHorario(horario);

        if (erro) {
            return res.status(400).json(erro);
        }

        const existentes = await Horario.findByFuncionario(funcionario.id);
        const conflito = primeiroConflito(existentes, horario);

        if (conflito) {
            return res.status(409).json({
                field: "hora_entrada",
                message: "Ja existe um turno sobreposto neste dia"
            });
        }

        res.status(201).json(await Horario.create(funcionario.id, horario));
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

        const { horarios } = req.body || {};
        if (!Array.isArray(horarios)) {
            return res.status(400).json({ message: "E obrigatoria uma lista de horarios" });
        }

        const normalizados = [];

        for (let indice = 0; indice < horarios.length; indice += 1) {
            const horario = normalizarHorario(horarios[indice] || {});
            const erro = validarHorario(horario);

            if (erro) {
                return res.status(400).json({
                    field: `horarios.${indice}.${erro.field}`,
                    message: `Horario ${indice + 1}: ${erro.message}`
                });
            }

            const conflito = primeiroConflito(normalizados, horario);
            if (conflito) {
                return res.status(409).json({
                    field: `horarios.${indice}.hora_entrada`,
                    message: `Horario ${indice + 1}: existe outro turno sobreposto no mesmo dia`
                });
            }

            normalizados.push(horario);
        }

        await Horario.substituir(funcionario.id, normalizados);
        res.status(200).json(await Horario.findByFuncionario(funcionario.id));
    } catch (error) {
        next(error);
    }
};

const atualizarHorario = async (req, res, next) => {
    try {
        const horarioAtual = await Horario.findById(req.params.id);

        if (!horarioAtual) {
            return res.status(404).json({ message: "Horario nao encontrado" });
        }

        const horario = normalizarHorario(req.body || {});
        const erro = validarHorario(horario);

        if (erro) {
            return res.status(400).json(erro);
        }

        const existentes = await Horario.findByFuncionario(horarioAtual.funcionario_id);
        const conflito = primeiroConflito(existentes, horario, horarioAtual.id);

        if (conflito) {
            return res.status(409).json({
                field: "hora_entrada",
                message: "Ja existe um turno sobreposto neste dia"
            });
        }

        res.status(200).json(await Horario.update(horarioAtual.id, horario));
    } catch (error) {
        next(error);
    }
};

const deletarHorario = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const erroDia = validarDiaSemana(req.params.dia_semana);
        if (erroDia) {
            return res.status(400).json({ field: "dia_semana", message: erroDia });
        }

        await Horario.deletar(funcionario.id, Number(req.params.dia_semana));
        res.status(200).json({ message: "Horario deletado com sucesso" });
    } catch (error) {
        next(error);
    }
};

const deletarHorarioPorId = async (req, res, next) => {
    try {
        const apagado = await Horario.deleteById(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Horario nao encontrado" });
        }

        res.status(200).json({ message: "Horario deletado com sucesso" });
    } catch (error) {
        next(error);
    }
};

const HorarioController = {
    getHorarios,
    createHorario,
    substituirHorarios,
    atualizarHorario,
    deletarHorario,
    deletarHorarioPorId
};

export default HorarioController;
