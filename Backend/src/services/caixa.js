import db from '../db/client.js';
import Caixa from '../repository/caixa.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';

export const METODOS_PAGAMENTO = [
    'Dinheiro',
    'M-Pesa',
    'e-Mola',
    'Cartao',
    'Transferencia',
    'Outro'
];

function validarMetodoPagamento(metodo) {
    if (!METODOS_PAGAMENTO.includes(metodo)) {
        throw criarErro(400, 'Metodo de pagamento invalido');
    }
}

export function calcularSaldosPorMetodo(saldos, saldoInicial = 0) {
    const saldoPorNome = new Map(
        saldos.map((item) => [item.metodo_pagamento, Number(item.saldo)])
    );
    saldoPorNome.set(
        'Dinheiro',
        (saldoPorNome.get('Dinheiro') ?? 0) + Number(saldoInicial)
    );
    const metodos = new Set([...METODOS_PAGAMENTO, ...saldoPorNome.keys()]);

    return [...metodos].map((metodo_pagamento) => ({
        metodo_pagamento,
        saldo: saldoPorNome.get(metodo_pagamento) ?? 0,
        conferido_no_fecho: metodo_pagamento === 'Dinheiro'
    }));
}

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

    return db.transaction(async (tx) => {
        const sessao = await Caixa.abrir({
            caixa_id: caixa.id,
            saldo_inicial: Number(saldo_inicial) || 0,
            aberto_por
        }, tx);

        await AuditoriaService.registar({
            id_utilizador: aberto_por,
            entidade: "caixa_sessao",
            id_registo: sessao.id,
            operacao: "criar",
            depois: { caixa_id: caixa.id, saldo_inicial: Number(saldo_inicial) || 0 }
        }, tx);

        return sessao;
    });
};

//devolver o saldo esperado aqui evita que a UI tenha de recalcular os movimentos
const atual = async () => {
    const sessao = await Caixa.findSessaoAberta();

    if (!sessao) {
        return { aberta: false, sessao: null, saldo_esperado: null };
    }

    const [saldo_esperado, saldos] = await Promise.all([
        Caixa.saldoEsperado(db, sessao.id),
        Caixa.saldosPorMetodo(db, sessao.id)
    ]);
    const saldo_por_metodo = calcularSaldosPorMetodo(saldos, sessao.saldo_inicial);

    return { aberta: true, sessao, saldo_esperado, saldo_por_metodo };
};

//levantamento: saida de dinheiro do caixa (RN12)
const levantamento = async ({ valor, metodo_pagamento, descricao, registado_por }) => {
    validarMetodoPagamento(metodo_pagamento);
    const sessao = await Caixa.findSessaoAberta();
    if (!sessao) {
        throw criarErro(409, "Nao existe caixa aberto");
    }

    return db.transaction(async (tx) => {
        const movimento_id = await Caixa.inserirMovimento(tx, {
            id_sessao: sessao.id,
            tipo_movimento: "Levantamento",
            metodo_pagamento,
            valor,
            descricao,
            origem: "Levantamento",
            registado_por
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "movimento_caixa",
            id_registo: movimento_id,
            operacao: "criar",
            depois: { id_sessao: sessao.id, tipo_movimento: "Levantamento", metodo_pagamento, valor, descricao }
        }, tx);
    });
};

//fecho: contagem fisica + diferenca (RN11)
const fechar = async ({ valor_contado, observacoes, fechado_por }) => {
    const sessao = await Caixa.findSessaoAberta();
    if (!sessao) {
        throw criarErro(409, "Nao existe caixa aberto");
    }

    await db.transaction(async (tx) => {
        const valor_esperado = await Caixa.saldoEsperado(tx, sessao.id);
        const saldos_por_metodo = calcularSaldosPorMetodo(
            await Caixa.saldosPorMetodo(tx, sessao.id),
            sessao.saldo_inicial
        );
        const diferenca = Number(valor_contado) - valor_esperado;

        await Caixa.fechar(tx, sessao.id, {
            valor_esperado,
            valor_contado,
            diferenca,
            saldos_por_metodo,
            observacoes,
            fechado_por
        });

        await AuditoriaService.registar({
            id_utilizador: fechado_por,
            entidade: "caixa_sessao",
            id_registo: sessao.id,
            operacao: "fechar",
            depois: { valor_esperado, valor_contado, diferenca, saldos_por_metodo, observacoes }
        }, tx);
    });

    return Caixa.findById(sessao.id);
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
