import Atendimento from "../repository/atendimento.js";
import Pagamento from "../repository/pagamento.js";
import AtendimentoService from "../services/atendimento.js";
import FidelizacaoService from "../services/fidelizacao.js";
import AuditoriaService from "../services/auditoria.js";

const getAtendimentos = async (req, res, next) => {
    try {
        const { de, ate, cliente, funcionario, estado } = req.query;

        res.status(200).json(await Atendimento.findAll({ de, ate, cliente, funcionario, estado }));
    } catch (error) {
        next(error);
    }
};

const getAtendimentoById = async (req, res, next) => {
    try {
        const atendimento = await Atendimento.findById(req.params.id);

        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        atendimento.servicos = await Atendimento.findServicos(atendimento.id);

        const pagamentos = await Pagamento.findByAtendimento(atendimento.id);
        for (const pagamento of pagamentos) {
            pagamento.parcelas = await Pagamento.findParcelas(pagamento.id);
        }
        atendimento.pagamentos = pagamentos;
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);

        res.status(200).json(atendimento);
    } catch (error) {
        next(error);
    }
};

const createAtendimento = async (req, res, next) => {
    try {
        const { cliente_id, servicos } = req.body;

        if (!cliente_id || !Array.isArray(servicos) || servicos.length === 0) {
            return res.status(400).json({ message: "cliente_id e uma lista de servicos sao obrigatorios" });
        }

        const incompleto = servicos.find((s) => !s.servico_id || !s.funcionario_id || s.preco_praticado === undefined);
        if (incompleto) {
            return res.status(400).json({ message: "Cada servico exige servico_id, funcionario_id e preco_praticado" });
        }

        const id = await AtendimentoService.criar({ cliente_id, servicos, registado_por: req.user.id });

        const atendimento = await Atendimento.findById(id);
        atendimento.servicos = await Atendimento.findServicos(id);
        //devolve o progresso ja actualizado para a UI reflectir o reset do
        //cartao logo apos o 6.º servico gratuito.
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);
        res.status(201).json(atendimento);
    } catch (error) {
        //23503 = cliente ou funcionario inexistente
        if (error.code === "23503") {
            return res.status(400).json({ message: "Cliente ou funcionario nao encontrado" });
        }
        next(error);
    }
};

const updateAtendimento = async (req, res, next) => {
    try {
        const { cliente_id } = req.body;

        if (cliente_id === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const atendimento = await Atendimento.updateHeader(req.params.id, { cliente_id });
        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        res.status(200).json(await Atendimento.findById(req.params.id));
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ message: "Cliente nao encontrado" });
        }
        next(error);
    }
};

const addServico = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            servico_id,
            funcionario_id,
            preco_praticado,
            desconto,
            tipo_preco,
            usar_beneficio_fidelizacao
        } = req.body;

        if (!servico_id || !funcionario_id || preco_praticado === undefined) {
            return res.status(400).json({ message: "servico_id, funcionario_id e preco_praticado sao obrigatorios" });
        }

        await AtendimentoService.adicionarServico(
            id,
            {
                servico_id,
                funcionario_id,
                preco_praticado,
                desconto,
                tipo_preco,
                usar_beneficio_fidelizacao
            },
            req.user.id
        );

        const atendimento = await Atendimento.findById(id);
        atendimento.servicos = await Atendimento.findServicos(id);
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);
        res.status(201).json(atendimento);
    } catch (error) {
        if (error.code === "23503") {
            return res.status(400).json({ message: "Servico ou funcionario nao encontrado" });
        }
        next(error);
    }
};

const removeServico = async (req, res, next) => {
    try {
        await AtendimentoService.removerServico(req.params.itemId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const concluirAtendimento = async (req, res, next) => {
    try {
        const atendimento = await Atendimento.updateEstado(req.params.id, { estado: "Concluido" });

        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        res.status(200).json(atendimento);
    } catch (error) {
        next(error);
    }
};

const anularAtendimento = async (req, res, next) => {
    try {
        const { motivo } = req.body;

        if (!motivo) {
            return res.status(400).json({ message: "O motivo da anulacao e obrigatorio" });
        }

        const atendimento = await Atendimento.updateEstado(req.params.id, { estado: "Anulado", motivo_anulacao: motivo });

        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "atendimento",
            id_registo: atendimento.id,
            operacao: "anular",
            depois: { estado: "Anulado" },
            motivo
        });

        res.status(200).json(atendimento);
    } catch (error) {
        next(error);
    }
};

const AtendimentoController = {
    getAtendimentos,
    getAtendimentoById,
    createAtendimento,
    updateAtendimento,
    addServico,
    removeServico,
    concluirAtendimento,
    anularAtendimento
};

export default AtendimentoController;
