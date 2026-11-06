import Agendamento from '../repository/agendamento.js';
import Pagamento from '../repository/pagamento.js';
import AgendamentoService from '../services/agendamento.js';
import PagamentoService from '../services/pagamento.js';
import FidelizacaoService from '../services/fidelizacao.js';
import { criarErro, codigoPostgres } from '../utils/erro.js';

// A data de execucao segue a mesma regra dos atendimentos: e uma opcao
// exclusiva do Administrador. Sem data, a base aplica now().
function podeAlterarDataHora(req) {
    return req.user?.perfil === 'Administrador';
}

function normalizarDataHora(valor) {
    if (valor === undefined || valor === null || valor === '') return undefined;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw criarErro(400, 'Data e hora da execucao invalidas');
    }

    return data;
}

async function montarDetalhe(id) {
    const agendamento = await Agendamento.findById(id);

    if (!agendamento) return null;

    agendamento.servicos = await Agendamento.findServicos(id);

    const pagamentos = await Pagamento.findByAgendamento(id);
    for (const pagamento of pagamentos) {
        pagamento.parcelas = await Pagamento.findParcelas(pagamento.id);
    }
    agendamento.pagamentos = pagamentos;
    agendamento.reembolsos = await Agendamento.findReembolsos(id);
    agendamento.consumos = await Agendamento.findConsumos(id);
    agendamento.fidelizacao = await FidelizacaoService.progresso(agendamento.cliente_id);

    return agendamento;
}

const getAgendamentos = async (req, res, next) => {
    try {
        const { de, ate, cliente, estado } = req.query;

        res.status(200).json(await Agendamento.findAll({ de, ate, cliente, estado }));
    } catch (error) {
        next(error);
    }
};

const getAgendamentoById = async (req, res, next) => {
    try {
        const agendamento = await montarDetalhe(req.params.id);

        if (!agendamento) {
            return res.status(404).json({ message: 'Agendamento nao encontrado' });
        }

        res.status(200).json(agendamento);
    } catch (error) {
        next(error);
    }
};

const createAgendamento = async (req, res, next) => {
    try {
        const { cliente_id, servicos, observacoes } = req.body;

        if (!cliente_id || !Array.isArray(servicos) || servicos.length === 0) {
            return res.status(400).json({ message: 'cliente_id e uma lista de servicos sao obrigatorios' });
        }

        const incompleto = servicos.find((item) => (
            !item.servico_id
            || (item.preco_unitario === undefined && item.preco_praticado === undefined)
        ));

        if (incompleto) {
            return res.status(400).json({
                message: 'Cada servico exige servico_id, quantidade e preco_unitario'
            });
        }

        const id = await AgendamentoService.criar({
            cliente_id,
            servicos,
            observacoes,
            registado_por: req.user.id
        });

        res.status(201).json(await montarDetalhe(id));
    } catch (error) {
        if (codigoPostgres(error) === '23503') {
            return res.status(400).json({ message: 'Cliente, servico ou funcionario nao encontrado' });
        }
        next(error);
    }
};

const registrarPagamento = async (req, res, next) => {
    try {
        const { parcelas } = req.body;

        if (!Array.isArray(parcelas) || parcelas.length === 0) {
            return res.status(400).json({ message: 'E obrigatoria pelo menos uma parcela' });
        }

        const incompleta = parcelas.find((p) => !p.metodo_pagamento || p.valor === undefined);
        if (incompleta) {
            return res.status(400).json({ message: 'Cada parcela exige metodo_pagamento e valor' });
        }

        const id = await PagamentoService.registrarAgendamento(req.params.id, {
            parcelas,
            registado_por: req.user.id
        });

        const pagamento = await Pagamento.findById(id);
        pagamento.parcelas = await Pagamento.findParcelas(id);

        const agendamento = await Agendamento.findById(req.params.id);
        if (agendamento) {
            pagamento.agendamento = {
                id: agendamento.id,
                estado: agendamento.estado,
                valor_total: agendamento.valor_total,
                valor_devido: agendamento.valor_devido,
                valor_pago: agendamento.valor_pago,
                valor_reembolsado: agendamento.valor_reembolsado,
                saldo: agendamento.saldo
            };
        }

        res.status(201).json(pagamento);
    } catch (error) {
        next(error);
    }
};

const getPagamentoDoAgendamento = async (req, res, next) => {
    try {
        const agendamento = await Agendamento.findById(req.params.id);

        if (!agendamento) {
            return res.status(404).json({ message: 'Agendamento nao encontrado' });
        }

        res.status(200).json({
            agendamento_id: agendamento.id,
            valor_total: agendamento.valor_total,
            valor_devido: agendamento.valor_devido,
            valor_pago: agendamento.valor_pago,
            valor_reembolsado: agendamento.valor_reembolsado,
            saldo: agendamento.saldo,
            estado: agendamento.estado,
            pagamentos: await Pagamento.findByAgendamento(agendamento.id),
            reembolsos: await Agendamento.findReembolsos(agendamento.id)
        });
    } catch (error) {
        next(error);
    }
};

const consumir = async (req, res, next) => {
    try {
        const { itens, data_hora } = req.body;

        const dataHora = podeAlterarDataHora(req) ? normalizarDataHora(data_hora) : undefined;

        const resultado = await AgendamentoService.consumir(req.params.id, {
            itens,
            data_hora: dataHora,
            registado_por: req.user.id
        });

        const detalhe = await montarDetalhe(req.params.id);

        res.status(201).json({
            ...detalhe,
            execucao: resultado
        });
    } catch (error) {
        if (codigoPostgres(error) === '23503') {
            return res.status(400).json({ message: 'Funcionario nao encontrado' });
        }
        next(error);
    }
};

const cancelar = async (req, res, next) => {
    try {
        const { itens, motivo, metodo_pagamento } = req.body;

        const resultado = await AgendamentoService.cancelar(req.params.id, {
            itens,
            motivo,
            metodo_pagamento,
            registado_por: req.user.id
        });

        const detalhe = await montarDetalhe(req.params.id);

        res.status(200).json({
            ...detalhe,
            cancelamento: resultado
        });
    } catch (error) {
        next(error);
    }
};

const AgendamentoController = {
    getAgendamentos,
    getAgendamentoById,
    createAgendamento,
    registrarPagamento,
    getPagamentoDoAgendamento,
    consumir,
    cancelar
};

export default AgendamentoController;
