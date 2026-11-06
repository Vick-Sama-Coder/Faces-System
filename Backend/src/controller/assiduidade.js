import Assiduidade from "../repository/assiduidade.js";
import AuditoriaService from "../services/auditoria.js";
import db from "../db/client.js";
import SalarioService from "../services/salario.js";
import { horaParaMinutos } from "../utils/validacoes.js";
import { criarErro, codigoPostgres } from "../utils/erro.js";
import { normalizarAusencias, validarAusenciasDoDia } from "../utils/assiduidade.js";

const normalizarHora = (valor) => {
    if (valor === undefined || valor === null) return null;
    const texto = String(valor).trim();
    return texto === "" ? null : texto;
};

// As ausencias vindas da base de dados so trazem HH:MM; os minutos sao
// recalculados para as validacoes de intervalo.
const comMinutos = (ausencias) => (Array.isArray(ausencias) ? ausencias : []).map((ausencia) => ({
    ...ausencia,
    inicioMin: horaParaMinutos(ausencia.hora_inicio),
    fimMin: horaParaMinutos(ausencia.hora_fim)
}));

const validarHoraOpcional = (valor, mensagem) => {
    const hora = normalizarHora(valor);
    if (hora !== null && horaParaMinutos(hora) === null) {
        throw criarErro(400, mensagem);
    }
    return hora;
};

const TIPOS_OCORRENCIA = new Set([
    "atraso",
    "falta_justificada",
    "falta_injustificada",
    "saida_antecipada",
    "ausencia",
    "sem_registo"
]);

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
        const { funcionario_id, data, tipo_ocorrencia, justificacao } = req.body;

        if (!funcionario_id) {
            return res.status(400).json({ message: "funcionario_id e obrigatorio" });
        }

        if (tipo_ocorrencia != null && !TIPOS_OCORRENCIA.has(tipo_ocorrencia)) {
            return res.status(400).json({ message: "Tipo de ocorrencia invalido" });
        }

        const entrada = validarHoraOpcional(
            req.body.hora_entrada_real,
            "Hora de entrada invalida (formato HH:MM)"
        );
        const saida = validarHoraOpcional(
            req.body.hora_saida_real,
            "Hora de saida invalida (formato HH:MM)"
        );
        const ausencias = normalizarAusencias(req.body.ausencias) ?? [];

        validarAusenciasDoDia(comMinutos(ausencias), entrada, saida, tipo_ocorrencia ?? null);

        const registo = await db.transaction(async (tx) => {
            const id = await Assiduidade.create({
                funcionario_id,
                data,
                hora_entrada_real: entrada,
                hora_saida_real: saida,
                tipo_ocorrencia: tipo_ocorrencia ?? null,
                justificacao,
                registado_por: req.user.id
            }, tx);

            await Assiduidade.substituirAusencias(id, ausencias, req.user.id, tx);

            const criado = await Assiduidade.findById(id, tx);

            await AuditoriaService.registar({
                id_utilizador: req.user.id,
                entidade: "assiduidade",
                id_registo: id,
                operacao: "criar",
                depois: criado
            }, tx);

            await SalarioService.aplicarReducoesAssiduidade(
                criado.data.slice(0, 7),
                req.user.id,
                tx
            );

            return criado;
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
        const {
            hora_entrada_real,
            hora_saida_real,
            tipo_ocorrencia,
            justificacao,
            estado,
            ausencias
        } = req.body;

        if (hora_entrada_real === undefined && hora_saida_real === undefined && tipo_ocorrencia === undefined &&
            justificacao === undefined && estado === undefined && ausencias === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        if (tipo_ocorrencia !== undefined && tipo_ocorrencia !== null && !TIPOS_OCORRENCIA.has(tipo_ocorrencia)) {
            return res.status(400).json({ message: "Tipo de ocorrencia invalido" });
        }

        const ausenciasInfo = normalizarAusencias(ausencias);

        const depois = await db.transaction(async (tx) => {
            const antes = await Assiduidade.findById(req.params.id, tx);
            if (!antes) return null;

            const entradaFinal = hora_entrada_real === undefined
                ? antes.hora_entrada_real
                : validarHoraOpcional(hora_entrada_real, "Hora de entrada invalida (formato HH:MM)");
            const saidaFinal = hora_saida_real === undefined
                ? antes.hora_saida_real
                : validarHoraOpcional(hora_saida_real, "Hora de saida invalida (formato HH:MM)");
            const tipoFinal = tipo_ocorrencia === undefined
                ? antes.tipo_ocorrencia
                : tipo_ocorrencia;
            const ausenciasFinais = ausenciasInfo === null
                ? antes.ausencias
                : ausenciasInfo;

            if (entradaFinal !== null && saidaFinal !== null) {
                const entradaMin = horaParaMinutos(entradaFinal);
                const saidaMin = horaParaMinutos(saidaFinal);

                if (entradaMin !== null && saidaMin !== null && saidaMin <= entradaMin) {
                    throw criarErro(400, "A hora de saida deve ser posterior a hora de entrada");
                }
            }

            validarAusenciasDoDia(comMinutos(ausenciasFinais), entradaFinal, saidaFinal, tipoFinal);

            await Assiduidade.update(req.params.id, {
                hora_entrada_real, hora_saida_real, tipo_ocorrencia, justificacao, estado
            }, tx);

            if (ausenciasInfo !== null) {
                await Assiduidade.substituirAusencias(
                    antes.id,
                    ausenciasInfo,
                    req.user.id,
                    tx
                );
            }

            const atualizado = await Assiduidade.findById(req.params.id, tx);
            await AuditoriaService.registar({
                id_utilizador: req.user.id,
                entidade: "assiduidade",
                id_registo: antes.id,
                operacao: "atualizar",
                antes,
                depois: atualizado
            }, tx);

            await SalarioService.aplicarReducoesAssiduidade(
                atualizado.data.slice(0, 7),
                req.user.id,
                tx
            );

            return atualizado;
        });

        if (!depois) {
            return res.status(404).json({ message: "Registo de assiduidade nao encontrado" });
        }

        res.status(200).json(depois);
    } catch (error) {
        next(error);
    }
};

//registo mensal: cria ou atualiza o dia (funcionario, data) sem duplicar
const registarDia = async (req, res, next) => {
    try {
        const {
            funcionario_id,
            data,
            hora_entrada_real,
            hora_saida_real,
            tipo_ocorrencia,
            ausencias
        } = req.body || {};
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

        if (tipo_ocorrencia != null && !TIPOS_OCORRENCIA.has(tipo_ocorrencia)) {
            return res.status(400).json({ message: "Tipo de ocorrencia invalido" });
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

        const ausenciasInfo = normalizarAusencias(ausencias);

        if (entrada === null && saida === null && tipo_ocorrencia == null
            && !(ausenciasInfo && ausenciasInfo.length > 0)) {
            const existente = await Assiduidade.findByFuncionarioData(funcionarioId, data);
            if (!existente) {
                return res.status(400).json({ message: "Indique pelo menos a hora de entrada ou de saida" });
            }
        }

        const resultado = await db.transaction(async (tx) => {
            const existente = await Assiduidade.findByFuncionarioData(funcionarioId, data, tx);
            const antes = existente
                ? await Assiduidade.findById(existente.id, tx)
                : null;
            const tipoFinal = existente
                ? (tipo_ocorrencia !== undefined ? tipo_ocorrencia : antes.tipo_ocorrencia)
                : (tipo_ocorrencia ?? null);
            const ausenciasFinais = ausenciasInfo === null
                ? (antes?.ausencias || [])
                : ausenciasInfo;

            validarAusenciasDoDia(comMinutos(ausenciasFinais), entrada, saida, tipoFinal);

            let id;
            const criado = !existente;

            if (existente) {
                await Assiduidade.update(existente.id, {
                    hora_entrada_real: entrada,
                    hora_saida_real: saida,
                    tipo_ocorrencia
                }, tx);
                id = existente.id;
            } else {
                id = await Assiduidade.create({
                    funcionario_id: funcionarioId,
                    data,
                    hora_entrada_real: entrada,
                    hora_saida_real: saida,
                    tipo_ocorrencia,
                    registado_por: req.user.id
                }, tx);
            }

            if (ausenciasInfo !== null) {
                await Assiduidade.substituirAusencias(
                    id,
                    ausenciasInfo,
                    req.user.id,
                    tx
                );
            }

            const depois = await Assiduidade.findById(id, tx);
            await AuditoriaService.registar({
                id_utilizador: req.user.id,
                entidade: "assiduidade",
                id_registo: id,
                operacao: criado ? "criar" : "atualizar",
                antes,
                depois
            }, tx);

            await SalarioService.aplicarReducoesAssiduidade(
                data.slice(0, 7),
                req.user.id,
                tx
            );

            return { criado, depois };
        });

        res.status(resultado.criado ? 201 : 200).json(resultado.depois);
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
