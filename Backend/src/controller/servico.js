import Servico from "../repository/servico.js";
import { validarElegibilidadeFidelizacao } from "../utils/validacoes.js";
import { codigoPostgres, constraintPostgres } from "../utils/erro.js";

// Valores aceites em servico.faixa_etaria (mesma convencao das modalidades).
const FAIXAS_ETARIAS = ["Geral", "Adulto", "Crianca"];

function faixaEtariaInvalida(faixa_etaria) {
    return faixa_etaria !== undefined && faixa_etaria !== null && !FAIXAS_ETARIAS.includes(faixa_etaria);
}

const MENSAGEM_FAIXA = "Faixa etaria invalida: use 'Geral', 'Adulto' ou 'Crianca'";

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
        const { nome, descricao, valor, duracao_min, faixa_etaria, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id } = req.body;

        if (!nome || valor === undefined || !categoria_id) {
            return res.status(400).json({ message: "Os campos nome, valor e categoria_id sao obrigatorios" });
        }

        if (valor !== undefined && Number(valor) < 0) {
            return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
        }

        if (faixaEtariaInvalida(faixa_etaria)) {
            return res.status(400).json({ field: "faixa_etaria", message: MENSAGEM_FAIXA });
        }

        const servico = await Servico.create({ nome, descricao, valor, duracao_min, faixa_etaria, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id });

        res.status(201).json(servico);
    } catch (error) {
        //23503 = a categoria informada nao existe
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ field: "categoria_id", message: "Categoria nao encontrada" });
        }
        //23505 = ja existe um servico ativo com este nome
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe um servico ativo com este nome" });
        }
        //23514 = check constraint violado
        if (codigoPostgres(error) === "23514") {
            if (error.message.includes('servico_tipo_servico_check')) {
                return res.status(400).json({ field: "tipo_servico", message: "Tipo de servico invalido: use 'Servico' ou 'Aplicacao'" });
            }
            if (error.message.includes('servico_faixa_etaria_check')) {
                return res.status(400).json({ field: "faixa_etaria", message: MENSAGEM_FAIXA });
            }
            if (error.message.includes('servico_valor_check')) {
                return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
            }
        }
        next(error);
    }
};

const updateServico = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, descricao, valor, duracao_min, faixa_etaria, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id } = req.body;

        if (nome === undefined && descricao === undefined && valor === undefined &&
            duracao_min === undefined && faixa_etaria === undefined && tipo_preco === undefined &&
            tipo_servico === undefined && permite_aplicacoes === undefined &&
            elegivel_fidelizacao === undefined && categoria_id === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        if (valor !== undefined && Number(valor) < 0) {
            return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
        }

        if (faixaEtariaInvalida(faixa_etaria)) {
            return res.status(400).json({ field: "faixa_etaria", message: MENSAGEM_FAIXA });
        }

        const atual = await Servico.findById(id);
        if (!atual) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        const servico = await Servico.update(id, { nome, descricao, valor, duracao_min, faixa_etaria, tipo_preco, tipo_servico, permite_aplicacoes, elegivel_fidelizacao, categoria_id });

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
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ field: "categoria_id", message: "Categoria nao encontrada" });
        }
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe um servico ativo com este nome" });
        }
        if (codigoPostgres(error) === "23514") {
            if (error.message.includes('servico_tipo_servico_check')) {
                return res.status(400).json({ field: "tipo_servico", message: "Tipo de servico invalido: use 'Servico' ou 'Aplicacao'" });
            }
            if (error.message.includes('servico_faixa_etaria_check')) {
                return res.status(400).json({ field: "faixa_etaria", message: MENSAGEM_FAIXA });
            }
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
        if (codigoPostgres(error) === "23505") {
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
        //23503 = o servico ainda tem registos dependentes
        if (codigoPostgres(error) === "23503") {
            const constraint = constraintPostgres(error) || "";

            if (constraint.includes("historico_preco_servico")) {
                return res.status(409).json({ message: "Nao e possivel apagar: o servico tem historico de precos. Desativa-o em vez de o apagar" });
            }
            if (constraint.includes("servico_modalidade")) {
                return res.status(409).json({ message: "Nao e possivel apagar: existem modalidades associadas a este servico" });
            }
            if (constraint.includes("servico_aplicacao")) {
                return res.status(409).json({ message: "Nao e possivel apagar: existem aplicacoes associadas a este servico" });
            }

            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este servico" });
        }
        next(error);
    }
};

// --- Modalidades ---

const getModalidades = async (req, res, next) => {
    try {
        const { id } = req.params;
        const servico = await Servico.findById(id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(await Servico.findModalidades(id));
    } catch (error) {
        next(error);
    }
};

const createModalidade = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, faixa_etaria, valor, ordem } = req.body;

        const servico = await Servico.findById(id);
        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        if (!nome || valor === undefined) {
            return res.status(400).json({ message: "Os campos nome e valor sao obrigatorios" });
        }

        if (valor !== undefined && Number(valor) < 0) {
            return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
        }

        const modalidade = await Servico.createModalidade({ servico_id: id, nome, faixa_etaria, valor, ordem });

        res.status(201).json(modalidade);
    } catch (error) {
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe uma modalidade ativa com este nome neste servico" });
        }
        if (codigoPostgres(error) === "23514") {
            if (error.message.includes('servico_modalidade_faixa_check')) {
                return res.status(400).json({ field: "faixa_etaria", message: "Faixa etaria invalida: use 'Geral', 'Adulto' ou 'Crianca'" });
            }
            if (error.message.includes('servico_modalidade_valor_check')) {
                return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
            }
        }
        next(error);
    }
};

const updateModalidade = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, faixa_etaria, valor, ordem, estado } = req.body;

        if (valor !== undefined && Number(valor) < 0) {
            return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
        }

        const modalidade = await Servico.updateModalidade(id, { nome, faixa_etaria, valor, ordem, estado });

        if (!modalidade) {
            return res.status(404).json({ message: "Modalidade nao encontrada" });
        }

        res.status(200).json(modalidade);
    } catch (error) {
        if (codigoPostgres(error) === "23505") {
            return res.status(409).json({ field: "nome", message: "Ja existe uma modalidade ativa com este nome neste servico" });
        }
        if (codigoPostgres(error) === "23514") {
            if (error.message.includes('servico_modalidade_faixa_check')) {
                return res.status(400).json({ field: "faixa_etaria", message: "Faixa etaria invalida: use 'Geral', 'Adulto' ou 'Crianca'" });
            }
            if (error.message.includes('servico_modalidade_valor_check')) {
                return res.status(400).json({ field: "valor", message: "O valor nao pode ser negativo" });
            }
        }
        next(error);
    }
};

const deleteModalidade = async (req, res, next) => {
    try {
        const apagado = await Servico.deleteModalidade(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Modalidade nao encontrada" });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// --- Aplicacoes associadas ---

const getAplicacoes = async (req, res, next) => {
    try {
        const { id } = req.params;
        const servico = await Servico.findById(id);

        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        res.status(200).json(await Servico.findAplicacoes(id));
    } catch (error) {
        next(error);
    }
};

const associarAplicacao = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { aplicacao_id } = req.body;

        const servico = await Servico.findById(id);
        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        if (!aplicacao_id) {
            return res.status(400).json({ message: "O campo aplicacao_id e obrigatorio" });
        }

        // Verificar que a aplicacao existe e e do tipo Aplicacao
        const aplicacao = await Servico.findById(aplicacao_id);
        if (!aplicacao) {
            return res.status(404).json({ message: "Aplicacao nao encontrada" });
        }
        if (aplicacao.tipo_servico !== 'Aplicacao') {
            return res.status(400).json({ message: "O servico selecionado nao e uma aplicacao" });
        }

        await Servico.associarAplicacao(id, aplicacao_id);

        res.status(200).json({ message: "Aplicacao associada com sucesso" });
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Servico ou aplicacao nao encontrado" });
        }
        if (codigoPostgres(error) === "23514") {
            return res.status(400).json({ message: "Nao e possivel associar um servico a ele proprio" });
        }
        next(error);
    }
};

const desassociarAplicacao = async (req, res, next) => {
    try {
        const { id, aplicacaoId } = req.params;

        const servico = await Servico.findById(id);
        if (!servico) {
            return res.status(404).json({ message: "Servico nao encontrado" });
        }

        await Servico.desassociarAplicacao(id, aplicacaoId);

        res.status(200).json({ message: "Aplicacao desassociada com sucesso" });
    } catch (error) {
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
    deleteServico,
    getModalidades,
    createModalidade,
    updateModalidade,
    deleteModalidade,
    getAplicacoes,
    associarAplicacao,
    desassociarAplicacao
};

export default ServicoController;