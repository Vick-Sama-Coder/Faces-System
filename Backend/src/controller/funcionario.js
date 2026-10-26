import Funcionario from "../repository/funcionario.js";
import ComissaoConfig from "../repository/comissao_config.js";
import { codigoPostgres } from "../utils/erro.js";

//arredonda valores monetarios a 2 casas
const arredondar = (valor) => Math.round(valor * 100) / 100;

const getFuncionarios = async (req, res, next) => {
    try {
        res.status(200).json(await Funcionario.findAll());
    } catch (error) {
        next(error);
    }
};

const getFuncionarioById = async (req, res, next) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(funcionario);
    } catch (error) {
        next(error);
    }
};

const createFuncionario = async (req, res, next) => {
    try {
        const { nome, salario } = req.body;

        if (!nome || salario === undefined) {
            return res.status(400).json({ message: "Os campos nome e salario sao obrigatorios" });
        }

        const { telefone, cargo, data_admissao, comissao_percentual } = req.body;

        res.status(201).json(await Funcionario.create({
            nome, telefone, cargo, data_admissao, salario, comissao_percentual
        }));
    } catch (error) {
        next(error);
    }
};

const updateFuncionario = async (req, res, next) => {
    try {
        const { nome, telefone, cargo, data_admissao, salario, comissao_percentual } = req.body;

        if (nome === undefined && telefone === undefined &&
            cargo === undefined && data_admissao === undefined && salario === undefined &&
            comissao_percentual === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const funcionario = await Funcionario.update(req.params.id, {
            nome, telefone, cargo, data_admissao, salario, comissao_percentual
        });

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(funcionario);
    } catch (error) {
        next(error);
    }
};

const updateEstadoFuncionario = async (req, res, next) => {
    try {
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: "O campo estado e obrigatorio" });
        }

        const funcionario = await Funcionario.updateEstado(req.params.id, estado);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json(funcionario);
    } catch (error) {
        next(error);
    }
};

const deleteFuncionario = async (req, res, next) => {
    try {
        const apagado = await Funcionario.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem atendimentos associados a este funcionario
        if (codigoPostgres(error) === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este funcionario" });
        }
        next(error);
    }
};

const getComissao = async (req, res, next) => {
    try {
        const { id } = req.params;
        const funcionario = await Funcionario.findById(id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        res.status(200).json({
            comissao_percentual: funcionario.comissao_percentual,
            configuracoes: await ComissaoConfig.findByFuncionario(id)
        });
    } catch (error) {
        next(error);
    }
};

//substitui a configuracao de comissao do funcionario (geral e/ou por servico)
const updateComissao = async (req, res, next) => {
    try {
        const { id } = req.params;
        const funcionario = await Funcionario.findById(id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const { configuracoes } = req.body;
        if (!Array.isArray(configuracoes)) {
            return res.status(400).json({ message: "O campo configuracoes deve ser uma lista" });
        }

        await ComissaoConfig.substituir(id, configuracoes);

        res.status(200).json({
            message: "Configuracao de comissao atualizada",
            configuracoes: await ComissaoConfig.findByFuncionario(id)
        });
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ field: "servico_id", message: "Servico nao encontrado" });
        }
        next(error);
    }
};

//servicos realizados e comissao no periodo (RN26)
const getDesempenho = async (req, res, next) => {
    try {
        const { id } = req.params;
        const funcionario = await Funcionario.findById(id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const { de, ate } = req.query;
        const linhas = await Funcionario.findDesempenho(id, { de, ate });

        //a taxa especifica por servico sobrepoe-se a geral do funcionario (RN27)
        const taxas = new Map(
            (await ComissaoConfig.findByFuncionario(id))
                .filter((c) => c.servico_id !== null)
                .map((c) => [c.servico_id, Number(c.taxa_percentual)])
        );

        const geral = Number(funcionario.comissao_percentual);
        let totalServicos = 0;
        let totalValor = 0;
        let totalComissao = 0;

        const servicos = linhas.map((linha) => {
            const taxa = taxas.get(linha.servico_id) ?? geral;
            const comissao = linha.total * taxa / 100;

            totalServicos += linha.quantidade;
            totalValor += linha.total;
            totalComissao += comissao;

            return { ...linha, taxa_percentual: taxa, comissao: arredondar(comissao) };
        });

        res.status(200).json({
            periodo: { de: de || null, ate: ate || null },
            total_servicos: totalServicos,
            total_valor: totalValor,
            total_comissao: arredondar(totalComissao),
            servicos
        });
    } catch (error) {
        next(error);
    }
};

const FuncionarioController = {
    getFuncionarios,
    getFuncionarioById,
    createFuncionario,
    updateFuncionario,
    updateEstadoFuncionario,
    deleteFuncionario,
    getComissao,
    updateComissao,
    getDesempenho
};

export default FuncionarioController;
