import pool from '../config/database.js';
import Salario from '../repository/salario.js';
import { criarErro } from '../utils/erro.js';

//converte 'AAAA-MM' no primeiro e ultimo dia do mes
function periodoMensal(periodo) {
    const match = /^(\d{4})-(\d{2})$/.exec(periodo || "");

    if (!match) {
        throw criarErro(400, "O periodo deve estar no formato AAAA-MM");
    }

    const mes = Number(match[2]);
    if (mes < 1 || mes > 12) {
        throw criarErro(400, "Mes invalido");
    }

    const ultimoDia = new Date(Number(match[1]), mes, 0).getDate();
    return {
        inicio: `${match[1]}-${match[2]}-01`,
        fim: `${match[1]}-${match[2]}-${String(ultimoDia).padStart(2, "0")}`
    };
}

//gera o processamento do periodo para todos os funcionarios ativos (RF17)
const processar = async (periodo) => {
    const { inicio, fim } = periodoMensal(periodo);
    const client = await pool.connect();

    try {
        await client.query('begin');

        const funcionarios = await Salario.findFuncionariosAtivos(client);
        const criados = [];

        for (const funcionario of funcionarios) {
            const comissoes = await Salario.somaComissoes(client, funcionario.id, inicio, fim);
            const base = funcionario.salario;

            const id = await Salario.inserirProcessamento(client, {
                funcionario_id: funcionario.id,
                periodo_inicio: inicio,
                periodo_fim: fim,
                salario_base: base,
                total_comissoes: comissoes,
                total_deducoes: 0,
                total_a_pagar: base + comissoes
            });

            if (id) {
                criados.push(id);
            }
        }

        await client.query('commit');
        return criados;
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

//substitui as deducoes e recalcula o total (so em Preparado)
const atualizarDeducoes = async (processamento_id, deducoes, registado_por) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Preparado") {
        throw criarErro(409, "So processamentos em Preparado podem ser alterados");
    }

    const client = await pool.connect();

    try {
        await client.query('begin');
        await Salario.substituirDeducoes(client, processamento_id, deducoes, registado_por);
        await Salario.recalcular(client, processamento_id);
        await client.query('commit');

        return Salario.findProcessamentoById(processamento_id);
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

//Preparado -> Aprovado (RF19; requer salarios:aprovar)
const aprovar = async (processamento_id, aprovado_por) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Preparado") {
        throw criarErro(409, "So processamentos em Preparado podem ser aprovados");
    }

    await Salario.aprovar(processamento_id, aprovado_por);
    return Salario.findProcessamentoById(processamento_id);
};

//Aprovado -> Pago (marca as comissoes do periodo como pagas)
const pagar = async (processamento_id) => {
    const processamento = await Salario.findProcessamentoById(processamento_id);

    if (!processamento) {
        throw criarErro(404, "Processamento nao encontrado");
    }
    if (processamento.estado !== "Aprovado") {
        throw criarErro(409, "So processamentos aprovados podem ser pagos");
    }

    const client = await pool.connect();

    try {
        await client.query('begin');
        await Salario.pagar(processamento_id, client);
        await Salario.marcarComissoesPagas(client, processamento.funcionario_id, processamento.periodo_inicio, processamento.periodo_fim);
        await client.query('commit');

        return Salario.findProcessamentoById(processamento_id);
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const SalarioService = {
    processar,
    atualizarDeducoes,
    aprovar,
    pagar
};

export default SalarioService;
