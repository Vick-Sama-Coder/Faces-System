import Atendimento from "../repository/atendimento.js";
import Pagamento from "../repository/pagamento.js";
import AtendimentoService from "../services/atendimento.js";
import FidelizacaoService from "../services/fidelizacao.js";
import AuditoriaService from "../services/auditoria.js";
import { criarErro, codigoPostgres } from "../utils/erro.js";

// A data do atendimento e uma opcao exclusiva do Administrador.
function podeAlterarDataHora(req) {
    return req.user?.perfil === "Administrador";
}

function normalizarDataHora(valor) {
    if (valor === undefined || valor === null || valor === "") return undefined;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw criarErro(400, "Data e hora do atendimento invalidas");
    }

    return data;
}

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
        atendimento.descontos = await Atendimento.findDescontos(atendimento.id);

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
        const { cliente_id, servicos, data_hora } = req.body;

        if (!cliente_id || !Array.isArray(servicos) || servicos.length === 0) {
            return res.status(400).json({ message: "cliente_id e uma lista de servicos sao obrigatorios" });
        }

        const incompleto = servicos.find((s) => !s.servico_id || !s.funcionario_id || s.preco_praticado === undefined || s.preco_praticado === null);
        
        if (incompleto) {
            return res.status(400).json({ message: "Cada servico exige servico_id, funcionario_id e preco_praticado" });
        }

        const dataHora = podeAlterarDataHora(req) ? normalizarDataHora(data_hora) : undefined;
        const id = await AtendimentoService.criar({ cliente_id, servicos, data_hora: dataHora, registado_por: req.user.id });

        const atendimento = await Atendimento.findById(id);
        atendimento.servicos = await Atendimento.findServicos(id);
        atendimento.descontos = await Atendimento.findDescontos(id);
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);
        res.status(201).json(atendimento);
    } catch (error) {
        //23503 = cliente ou funcionario inexistente
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Cliente ou funcionario nao encontrado" });
        }
        next(error);
    }
};

const updateAtendimento = async (req, res, next) => {
    try {
        const { cliente_id, data_hora, servicos } = req.body;
        const admin = podeAlterarDataHora(req);
        const enviouServicos = servicos !== undefined;

        if (cliente_id === undefined && !enviouServicos && !(admin && data_hora !== undefined)) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        await AtendimentoService.atualizar(req.params.id, {
            cliente_id,
            // A data continua a ser uma opcao exclusiva do Administrador.
            data_hora: admin ? normalizarDataHora(data_hora) : undefined,
            servicos
        }, req.user.id);

        const atendimento = await Atendimento.findById(req.params.id);
        atendimento.servicos = await Atendimento.findServicos(atendimento.id);
        atendimento.descontos = await Atendimento.findDescontos(atendimento.id);

        const pagamentos = await Pagamento.findByAtendimento(atendimento.id);
        for (const pagamento of pagamentos) {
            pagamento.parcelas = await Pagamento.findParcelas(pagamento.id);
        }
        atendimento.pagamentos = pagamentos;
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);

        res.status(200).json(atendimento);
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Cliente, servico ou funcionario nao encontrado" });
        }
        next(error);
    }
};

const addServico = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { servico_id, funcionario_id, preco_praticado, desconto, tipo_preco, tipo_servico, modalidade_id, modalidade_nome, servico_principal_id, usar_beneficio_fidelizacao } = req.body;

        if (!servico_id || !funcionario_id || preco_praticado === undefined) {
            return res.status(400).json({ message: "servico_id, funcionario_id e preco_praticado sao obrigatorios" });
        }

        await AtendimentoService.adicionarServico(
            id,
            { servico_id, funcionario_id, preco_praticado, desconto, tipo_preco, tipo_servico, modalidade_id, modalidade_nome, servico_principal_id, usar_beneficio_fidelizacao },
            req.user.id
        );

        const atendimento = await Atendimento.findById(id);
        atendimento.servicos = await Atendimento.findServicos(id);
        atendimento.descontos = await Atendimento.findDescontos(id);
        atendimento.fidelizacao = await FidelizacaoService.progresso(atendimento.cliente_id);
        res.status(201).json(atendimento);
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
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
        const atual = await Atendimento.findById(req.params.id);

        if (!atual) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }
        if (atual.estado === "Anulado") {
            return res.status(409).json({ message: "Um atendimento anulado nao pode ser concluido" });
        }

        const atendimento = await Atendimento.updateEstado(req.params.id, { estado: "Concluido" });

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

// Aplicar desconto a um servico ou atendimento
const aplicarDesconto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { atendimento_servico_id, escopo, tipo, percentagem, valor_bruto, valor_desconto, valor_final } = req.body;

        if (!atendimento_servico_id || !escopo || !tipo || valor_bruto === undefined || valor_desconto === undefined || valor_final === undefined) {
            return res.status(400).json({ message: "Campos obrigatorios: atendimento_servico_id, escopo, tipo, valor_bruto, valor_desconto, valor_final" });
        }

        await AtendimentoService.aplicarDesconto(
            id,
            { atendimento_servico_id, escopo, tipo, percentagem, valor_bruto, valor_desconto, valor_final },
            req.user.id
        );

        const atendimento = await Atendimento.findById(id);
        atendimento.servicos = await Atendimento.findServicos(id);
        atendimento.descontos = await Atendimento.findDescontos(id);
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
    anularAtendimento,
    aplicarDesconto
};

export default AtendimentoController;