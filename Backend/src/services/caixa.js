import pool from '../config/database.js';
import Caixa from '../repository/caixa.js';
import { criarErro } from '../utils/erro.js';

//abre uma nova sessao; bloqueia se ja existir uma aberta (RN09/RN10)
const abrir = async ({ saldo_inicial, aberto_por }) => {
    const aberta = await Caixa.findSessaoAberta();
    if (aberta) {
        throw criarErro(409, "Ja existe uma sessao de caixa aberta; feche-a antes de abrir outra");
    }

    const caixa = await Caixa.caixaPrincipal();
    if (!caixa) {
        throw criarErro(409, "Nao existe caixa ativo");
    }

    return Caixa.abrir({ caixa_id: caixa.id, saldo_inicial: Number(saldo_inicial) || 0, aberto_por });
};

//estado atual: sessao aberta (se houver) + saldo esperado
const atual = async () => {
    const sessao = await Caixa.findSessaoAberta();

    if (!sessao) {
        return { aberta: false, sessao: null, saldo_esperado: null };
    }

    const saldo_esperado = await Caixa.saldoEsperado(pool, sessao.id);
    return { aberta: true, sessao, saldo_esperado };
};

//levantamento: saida de dinheiro do caixa (RN12)
const levantamento = async ({ valor, descricao, registado_por }) => {
    const sessao = await Caixa.findSessaoAberta();
    if (!sessao) {
        throw criarErro(409, "Nao existe caixa aberto");
    }

    const client = await pool.connect();

    try {
        await client.query('begin');
        await Caixa.inserirMovimento(client, {
            id_sessao: sessao.id,
            tipo_movimento: "Levantamento",
            valor,
            descricao,
            origem: "Levantamento",
            registado_por
        });
        await client.query('commit');
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

//fecho: contagem fisica + diferenca (RN11)
const fechar = async ({ valor_contado, observacoes, fechado_por }) => {
    const sessao = await Caixa.findSessaoAberta();
    if (!sessao) {
        throw criarErro(409, "Nao existe caixa aberto");
    }

    const client = await pool.connect();

    try {
        await client.query('begin');

        const valor_esperado = await Caixa.saldoEsperado(client, sessao.id);
        await Caixa.fechar(client, sessao.id, {
            valor_esperado,
            valor_contado,
            diferenca: Number(valor_contado) - valor_esperado,
            observacoes,
            fechado_por
        });

        await client.query('commit');
        return Caixa.findById(sessao.id);
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const movimentos = async () => {
    const sessao = await Caixa.findSessaoAberta();
    if (!sessao) {
        throw criarErro(404, "Nao existe caixa aberto");
    }

    return { sessao_id: sessao.id, movimentos: await Caixa.movimentos(sessao.id) };
};

const CaixaService = {
    abrir,
    atual,
    levantamento,
    fechar,
    movimentos
};

export default CaixaService;
