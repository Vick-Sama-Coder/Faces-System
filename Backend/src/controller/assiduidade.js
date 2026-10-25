import Assiduidade from "../repository/assiduidade.js";
import AuditoriaService from "../services/auditoria.js";
import { horaParaMinutos } from "../utils/validacoes.js";

const normalizarHora = (valor) => {
    if (valor === undefined || valor === null) return null;
    const texto = String(valor).trim();
    return texto === "" ? null : texto;
};

const validarDataISO = (valor) => {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return data.getUTCFullYear() === ano
        && data.getUTCMonth() === mes - 1
        && data.getUTCDate() === dia;
};

const codigoPostgres = (error) => (
    error?.code
    || error?.cause?.code
    || error?.cause?.cause?.code
);

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
        const registo = await Assiduidade.findById(id);

        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "assiduidade",
            id_registo: id,
            operacao: "criar",
            depois: registo
        });

        res.status(201).json(registo);
    } catch (error) {
        //23503 = funcionario inexistente; 23505 = ja existe registo nesse dia
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Funcionario nao encontrado" });
        }
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ message: "Ja existe registo de assiduidade para este funcionario nesta data" });
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

        const antes = await Assiduidade.findById(req.params.id);
        if (!antes) {
            return res.status(404).json({ message: "Registo de assiduidade nao encontrado" });
        }

        await Assiduidade.update(req.params.id, {
            hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, estado
        });

        const depois = await Assiduidade.findById(req.params.id);
        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "assiduidade",
            id_registo: antes.id,
            operacao: "atualizar",
            antes,
            depois
        });

        res.status(200).json(depois);
    } catch (error) {
        next(error);
    }
};

//registo mensal: cria ou atualiza o dia (funcionario, data) sem duplicar
const registarDia = async (req, res, next) => {
    try {
        const { funcionario_id, data, hora_entrada_real, hora_saida_real } = req.body || {};
        const funcionarioId = Number(funcionario_id);

        if (!funcionario_id) {
            return res.status(400).json({ message: "funcionario_id e obrigatorio" });
        }

        if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
            return res.status(400).json({ message: "funcionario_id invalido" });
        }

        if (!validarDataISO(data)) {
            return res.status(400).json({ message: "Data invalida (formato AAAA-MM-DD)" });
        }

        const entrada = normalizarHora(hora_entrada_real);
        const saida = normalizarHora(hora_saida_real);
        const entradaMin = entrada === null ? null : horaParaMinutos(entrada);
        const saidaMin = saida === null ? null : horaParaMinutos(saida);

        if (entrada !== null && entradaMin === null) {
            return res.status(400).json({ message: "Hora de entrada invalida (formato HH:MM)" });
        }

        if (saida !== null && saidaMin === null) {
            return res.status(400).json({ message: "Hora de saida invalida (formato HH:MM)" });
        }

        if (entradaMin !== null && saidaMin !== null && saidaMin <= entradaMin) {
            return res.status(400).json({ message: "A hora de saida deve ser posterior a hora de entrada" });
        }

        const existente = await Assiduidade.findByFuncionarioData(funcionarioId, data);
        let id;
        let criado = false;
        let antes = null;

        if (existente) {
            antes = await Assiduidade.findById(existente.id);
            await Assiduidade.update(existente.id, {
                hora_entrada_real: entrada,
                hora_saida_real: saida
            });
            id = existente.id;
        } else {
            if (entrada === null && saida === null) {
                return res.status(400).json({ message: "Indique pelo menos a hora de entrada ou de saida" });
            }

            id = await Assiduidade.create({
                funcionario_id: funcionarioId,
                data,
                hora_entrada_real: entrada,
                hora_saida_real: saida,
                registado_por: req.user.id
            });
            criado = true;
        }

        const depois = await Assiduidade.findById(id);

        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "assiduidade",
            id_registo: id,
            operacao: criado ? "criar" : "atualizar",
            antes,
            depois
        });

        res.status(criado ? 201 : 200).json(depois);
    } catch (error) {
        //23503 = funcionario inexistente
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Funcionario nao encontrado" });
        }
        next(error);
    }
};

const AssiduidadeController = {
    getAssiduidade,
    createAssiduidade,
    updateAssiduidade,
    registarDia
};

export default AssiduidadeController;
