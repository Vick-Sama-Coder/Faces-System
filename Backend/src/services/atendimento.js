import pool from '../config/database.js';
import Atendimento from '../repository/atendimento.js';
import Servico from '../repository/servico.js';
import FidelizacaoService from './fidelizacao.js';
import { criarErro } from '../utils/erro.js';

//calcula os totais do cabecalho a partir das linhas (valor_final = preco - desconto)
function somar(servicos) {
    return servicos.reduce(
        (totais, s) => {
            const preco = Number(s.preco_praticado);
            const desconto = Number(s.desconto || 0);

            return {
                bruto: totais.bruto + preco,
                desconto: totais.desconto + desconto,
                total: totais.total + preco - desconto
            };
        },
        { bruto: 0, desconto: 0, total: 0 }
    );
}

//o servico tem de existir e estar ativo para ser selecionado (RN18)
async function validarServicoAtivo(servico_id) {
    const servico = await Servico.findById(servico_id);

    if (!servico) {
        throw criarErro(400, "Servico nao encontrado");
    }
    if (servico.estado !== "Ativo") {
        throw criarErro(409, `O servico "${servico.nome}" esta inativo`);
    }

    return servico;
}

//registar as marcas de fidelizacao dos servicos elegiveis (cortes)
async function registarFidelizacao(client, servico, { cliente_id, atendimento_servico_id, valor_final, registado_por }) {
    if (servico.elegivel_fidelizacao) {
        await FidelizacaoService.registarCorte(client, {
            cliente_id,
            atendimento_servico_id,
            valor_final,
            registado_por
        });
    }
}

const criar = async ({ cliente_id, servicos, registado_por }) => {
    const validados = [];

    for (const servico of servicos) {
        validados.push(await validarServicoAtivo(servico.servico_id));
    }

    const client = await pool.connect();

    try {
        await client.query('begin');

        const totais = somar(servicos);
        const atendimento_id = await Atendimento.insertHeader(client, {
            cliente_id,
            valor_bruto: totais.bruto,
            valor_desconto: totais.desconto,
            valor_total: totais.total,
            registado_por
        });

        for (let i = 0; i < servicos.length; i++) {
            const preco = Number(servicos[i].preco_praticado);
            const desconto = Number(servicos[i].desconto || 0);

            const item_id = await Atendimento.insertServico(client, {
                atendimento_id,
                servico_id: servicos[i].servico_id,
                funcionario_id: servicos[i].funcionario_id,
                preco_original: preco,
                tipo_preco: servicos[i].tipo_preco,
                valor_desconto: desconto,
                valor_final: preco - desconto,
                registado_por
            });

            await registarFidelizacao(client, validados[i], {
                cliente_id,
                atendimento_servico_id: item_id,
                valor_final: preco - desconto,
                registado_por
            });
        }

        await client.query('commit');
        return atendimento_id;
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const adicionarServico = async (atendimento_id, dados, registado_por) => {
    const atendimento = await Atendimento.findById(atendimento_id);

    if (!atendimento) {
        throw criarErro(404, "Atendimento nao encontrado");
    }
    if (atendimento.estado === "Anulado") {
        throw criarErro(409, "Um atendimento anulado nao pode ser alterado");
    }

    const servico = await validarServicoAtivo(dados.servico_id);
    const preco = Number(dados.preco_praticado);
    const desconto = Number(dados.desconto || 0);
    const client = await pool.connect();

    try {
        await client.query('begin');

        const item_id = await Atendimento.insertServico(client, {
            atendimento_id,
            servico_id: dados.servico_id,
            funcionario_id: dados.funcionario_id,
            preco_original: preco,
            tipo_preco: dados.tipo_preco,
            valor_desconto: desconto,
            valor_final: preco - desconto,
            registado_por
        });

        await registarFidelizacao(client, servico, {
            cliente_id: atendimento.cliente_id,
            atendimento_servico_id: item_id,
            valor_final: preco - desconto,
            registado_por
        });

        await Atendimento.recalcular(client, atendimento_id);

        await client.query('commit');
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const removerServico = async (item_id) => {
    const client = await pool.connect();

    try {
        await client.query('begin');

        const item = await Atendimento.findServicoItem(client, item_id);
        if (!item) {
            throw criarErro(404, "Servico do atendimento nao encontrado");
        }

        await Atendimento.deleteServicoItem(client, item_id);
        await Atendimento.recalcular(client, item.atendimento_id);

        await client.query('commit');
        return item.atendimento_id;
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const AtendimentoService = {
    criar,
    adicionarServico,
    removerServico
};

export default AtendimentoService;
