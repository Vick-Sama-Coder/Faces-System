import Servico from "../repository/servico.js";
import { validarElegibilidadeFidelizacao } from "../utils/validacoes.js";

const getServicos = async (req, res, next) => {
    try {
        res.status(200).json(await Servico.findAll({ estado: req.query.estado }));
    } catch (error) {
        next(error);
    }
};

const getServicoById = async (req, res, next) => {
    try {
        const servico = await Servico.findById(req.params.id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(servico);
    } catch (error) {
        next(error);
    }
};

const createServico = async (req, res, next) => {
    try {
        const { nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id } = req.body;

        if (!nome || valor === undefined || !categoria_id) {
            return res.status(400).json({ message: "Os campos nome, valor e categoria_id sao obrigatorios" });
        }

        const erroFidelizacao = validarElegibilidadeFidelizacao(valor, elegivel_fidelizacao);
        if (erroFidelizacao) {
            return res.status(400).json({ field: "elegivel_fidelizacao", message: erroFidelizacao });
        }

        const servico = await Servico.create({ nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id });

        res.status(201).json(servico);
    } catch (error) {
        //23503 = a categoria informada nao existe
        if (error.code === "23503") {
            return res.status(400).json({ field: "categoria_id", message: "Categoria nao encontrada" });
        }
        //23505 = ja existe um servico ativo com este nome
        if (error.code === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe um servico ativo com este nome" });
        }
        next(error);
    }
};

const updateServico = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id } = req.body;

        if (nome === undefined && descricao === undefined && valor === undefined &&
            duracao_min === undefined && tipo_preco === undefined &&
            elegivel_fidelizacao === undefined && categoria_id === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const atual = await Servico.findById(id);
        if (!atual) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        //ao alterar o preco ou a elegibilidade, valida o estado final do servico
        const erroFidelizacao = validarElegibilidadeFidelizacao(
            valor !== undefined && valor !== null ? valor : atual.valor,
            elegivel_fidelizacao !== undefined && elegivel_fidelizacao !== null
                ? elegivel_fidelizacao
                : atual.elegivel_fidelizacao
        );
        if (erroFidelizacao) {
            return res.status(400).json({ field: "elegivel_fidelizacao", message: erroFidelizacao });
        }

        const servico = await Servico.update(id, { nome, descricao, valor, duracao_min, tipo_preco, elegivel_fidelizacao, categoria_id });

        //alterar o preco grava historico e nao afeta atendimentos passados (RN15/RN19/RN20)
        if (valor !== undefined && valor !== null && Number(valor) !== atual.valor) {
            await Servico.registrarHistoricoPreco({
                servico_id: id,
                valor_anterior: atual.valor,
                valor_novo: valor,
                alterado_por: req.user.id
            });
        }

        res.status(200).json(servico);
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ field: "categoria_id", message: "Categoria nao encontrada" });
        }
        if (error.code === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe um servico ativo com este nome" });
        }
        next(error);
    }
};

const updateEstadoServico = async (req, res, next) => {
    try {
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: "O campo estado e obrigatorio" });
        }

        const servico = await Servico.updateEstado(req.params.id, estado);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(servico);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe um servico ativo com este nome" });
        }
        next(error);
    }
};

const getHistoricoPrecos = async (req, res, next) => {
    try {
        const { id } = req.params;
        const servico = await Servico.findById(id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(await Servico.findHistoricoPrecos(id));
    } catch (error) {
        next(error);
    }
};

const deleteServico = async (req, res, next) => {
    try {
        const apagado = await Servico.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem atendimentos com este servico
        if (error.code === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este servico" });
        }
        next(error);
    }
};

const ServicoController = {
    getServicos,
    getServicoById,
    createServico,
    updateServico,
    updateEstadoServico,
    getHistoricoPrecos,
    deleteServico
};

export default ServicoController;
