import Atendimento from "../repository/atendimento.js";
import Pagamento from "../repository/pagamento.js";
import AtendimentoService from "../services/atendimento.js";
import FidelizacaoService from "../services/fidelizacao.js";
import AuditoriaService from "../services/auditoria.js";
import { codigoPostgres } from "../utils/erro.js";

// Monta o detalhe completo (clientes, servicos, fidelizacao por cliente e
// pagamentos) para todas as respostas que devolvem um atendimento.
async function detalheCompleto(id) {
    const atendimento = await Atendimento.findById(id);

    if (!atendimento) return null;

    const clientes = await Atendimento.findClientes(id);
    const progressos = new Map();

    for (const cliente of clientes) {
        const progresso = await FidelizacaoService.progresso(cliente.cliente_id);
        cliente.fidelizacao = progresso;
        progressos.set(String(cliente.cliente_id), progresso);
    }

    atendimento.clientes = clientes;
    atendimento.servicos = await Atendimento.findServicos(id);
    atendimento.descontos = await Atendimento.findDescontos(id);
    atendimento.fidelizacoes = clientes.map((cliente) => ({
        cliente_id: cliente.cliente_id,
        ...cliente.fidelizacao
    }));
    // Compatibilidade com o formato anterior: fidelizacao do cliente principal.
    atendimento.fidelizacao = progressos.get(String(atendimento.cliente_id))
        || await FidelizacaoService.progresso(atendimento.cliente_id);

    const pagamentos = await Pagamento.findByAtendimento(id);
    for (const pagamento of pagamentos) {
        pagamento.parcelas = await Pagamento.findParcelas(pagamento.id);
    }
    atendimento.pagamentos = pagamentos;

    return atendimento;
}

function validarItemServico(item) {
    if (!item || !item.servico_id || item.preco_praticado === undefined) return false;

    // Aplicacoes podem herdar o funcionario do servico principal.
    const aplicacao = item.tipo_servico === 'Aplicacao';
    return aplicacao || Boolean(item.funcionario_id);
}

// Aceita { clientes: [{ cliente_id, servicos }] } ou o formato legado
// { cliente_id, servicos }.
function gruposDoPedido(body) {
    if (Array.isArray(body.clientes)) {
        return body.clientes.map((grupo) => ({
            cliente_id: grupo?.cliente_id,
            servicos: Array.isArray(grupo?.servicos) ? grupo.servicos : []
        }));
    }

    return [{
        cliente_id: body.cliente_id,
        servicos: Array.isArray(body.servicos) ? body.servicos : []
    }];
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
        const atendimento = await detalheCompleto(req.params.id);

        if (!atendimento) {
            return res.status(404).json({ message: "Atendimento nao encontrado" });
        }

        res.status(200).json(atendimento);
    } catch (error) {
        next(error);
    }
};

const createAtendimento = async (req, res, next) => {
    try {
        const grupos = gruposDoPedido(req.body);

        if (grupos.length === 0) {
            return res.status(400).json({ message: "O atendimento exige pelo menos um cliente" });
        }

        for (const grupo of grupos) {
            if (!grupo.cliente_id) {
                return res.status(400).json({ message: "Cada cliente do atendimento exige cliente_id" });
            }
            if (!Array.isArray(grupo.servicos) || grupo.servicos.length === 0) {
                return res.status(400).json({ message: "Cada cliente exige uma lista de servicos" });
            }

            const incompleto = grupo.servicos.find((servico) => !validarItemServico(servico));
            if (incompleto) {
                return res.status(400).json({
                    message: "Cada servico exige servico_id, funcionario_id e preco_praticado"
                });
            }
        }

        const id = await AtendimentoService.criar({
            cliente_id: grupos[0].cliente_id,
            servicos: grupos[0].servicos,
            clientes: grupos,
            registado_por: req.user.id
        });

        res.status(201).json(await detalheCompleto(id));
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
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Cliente nao encontrado" });
        }
        next(error);
    }
};

const addServico = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            cliente_id,
            servico_id,
            funcionario_id,
            preco_praticado,
            desconto,
            tipo_preco,
            tipo_servico,
            modalidade_id,
            modalidade_nome,
            servico_principal_id,
            usar_beneficio_fidelizacao,
            fidelizacao_selecionada
        } = req.body;

        if (!validarItemServico({ servico_id, funcionario_id, preco_praticado, tipo_servico })) {
            return res.status(400).json({
                message: "servico_id, preco_praticado e (para servicos) funcionario_id sao obrigatorios"
            });
        }

        await AtendimentoService.adicionarServico(
            id,
            {
                cliente_id,
                servico_id,
                funcionario_id,
                preco_praticado,
                desconto,
                tipo_preco,
                tipo_servico,
                modalidade_id,
                modalidade_nome,
                servico_principal_id,
                usar_beneficio_fidelizacao,
                fidelizacao_selecionada
            },
            req.user.id
        );

        res.status(201).json(await detalheCompleto(id));
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

// Aplicar desconto a um servico ou atendimento (rota legada; o fluxo actual
// de atendimento nao disponibiliza descontos).
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

        res.status(200).json(await detalheCompleto(id));
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
