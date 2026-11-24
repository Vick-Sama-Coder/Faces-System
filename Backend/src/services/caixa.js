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

function diaLocal(data) {
    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) return null;

    return [
        valor.getFullYear(),
        String(valor.getMonth() + 1).padStart(2, '0'),
        String(valor.getDate()).padStart(2, '0')
    ].join('-');
}

// Hora local a partir da qual o caixa deve estar aberto automaticamente.
export const HORA_ABERTURA_PADRAO = 8;

// Decide a acao automatica da rotina: fechar a sessao do dia anterior apos a
// meia-noite e abrir a sessao do dia a partir das 08h (uma unica vez por dia).
export function decidirAcaoAutomatica({
    agora = new Date(),
    sessaoAberta = null,
    existeSessaoHoje = false,
    horaAbertura = HORA_ABERTURA_PADRAO
} = {}) {
    if (sessaoAberta) {
        return diaLocal(sessaoAberta.data_abertura) === diaLocal(agora) ? null : 'fechar';
    }

    if (agora.getHours() >= horaAbertura && !existeSessaoHoje) {
        return 'abrir';
    }

    return null;
}

// O fecho e diario (RF11). Se a sessao aberta pertence a outro dia, as
// operacoes financeiras ficam bloqueadas ate o administrador a fechar.
export function validarSessaoDoDia(sessao) {
    if (!sessao) {
        throw criarErro(409, 'Nao existe caixa aberto');
    }

    if (diaLocal(sessao.data_abertura) !== diaLocal(new Date())) {
        throw criarErro(
            409,
            'Existe uma sessao de caixa de um dia anterior aberta. Feche-a antes de continuar'
        );
    }

    return sessao;
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

    const sessao_anterior = diaLocal(sessao.data_abertura) !== diaLocal(new Date());

    const [saldo_esperado, saldos] = await Promise.all([
        Caixa.saldoEsperado(db, sessao.id),
        Caixa.saldosPorMetodo(db, sessao.id)
    ]);
    const saldo_por_metodo = calcularSaldosPorMetodo(saldos, sessao.saldo_inicial);

    return { aberta: true, sessao, sessao_anterior, saldo_esperado, saldo_por_metodo };
};

//levantamento: saida de dinheiro do caixa (RN12)
const levantamento = async ({ valor, metodo_pagamento, descricao, registado_por }) => {
    validarMetodoPagamento(metodo_pagamento);
    const sessao = validarSessaoDoDia(await Caixa.findSessaoAberta());

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

//executa o fecho dentro de uma transacao ja aberta
async function registarFecho(sessao, { valor_contado, observacoes, fechado_por, usarEsperado = false }, tx) {
    const valor_esperado = await Caixa.saldoEsperado(tx, sessao.id);
    const saldos_por_metodo = calcularSaldosPorMetodo(
        await Caixa.saldosPorMetodo(tx, sessao.id),
        sessao.saldo_inicial
    );
    const contado = usarEsperado ? valor_esperado : Number(valor_contado);
    const diferenca = contado - valor_esperado;

    await Caixa.fechar(tx, sessao.id, {
        valor_esperado,
        valor_contado: contado,
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
        depois: { valor_esperado, valor_contado: contado, diferenca, saldos_por_metodo, observacoes }
    }, tx);
}

//fecho: contagem fisica + diferenca (RN11)
const fechar = async ({ valor_contado, observacoes, fechado_por }) => {
    const sessao = validarSessaoDoDia(await Caixa.findSessaoAberta());

    await db.transaction(async (tx) => {
        await registarFecho(sessao, { valor_contado, observacoes, fechado_por }, tx);
    });

    return Caixa.findById(sessao.id);
};

//fecho automatico a meia-noite: encerra a sessao do dia anterior assumindo o
//saldo esperado como valor contado (sem contagem fisica nem utilizador).
const fecharAutomaticamente = async () => {
    const sessao = await Caixa.findSessaoAberta();

    if (!sessao || diaLocal(sessao.data_abertura) === diaLocal(new Date())) {
        return null;
    }

    await db.transaction(async (tx) => {
        await registarFecho(sessao, {
            usarEsperado: true,
            observacoes: 'Fecho automatico (00h)',
            fechado_por: null
        }, tx);
    });

    return Caixa.findById(sessao.id);
};

//abertura automatica as 08h: so abre se ainda nao houve sessao nesse dia,
//para nao reabrir um caixa que o utilizador tenha fechado manualmente.
const abrirAutomaticamente = async () => {
    const agora = new Date();

    if (await Caixa.findSessaoAberta()) return null;

    if (await Caixa.existeSessaoNoDia(diaLocal(agora))) return null;

    return abrir({ saldo_inicial: 0, aberto_por: null });
};

//rotina periodica chamada pelo agendador; devolve a acao executada ou null.
const executarRotinaAutomatica = async ({ agora = new Date(), horaAbertura = HORA_ABERTURA_PADRAO } = {}) => {
    const sessaoAberta = await Caixa.findSessaoAberta();
    const existeSessaoHoje = Boolean(sessaoAberta) || await Caixa.existeSessaoNoDia(diaLocal(agora));
    const acao = decidirAcaoAutomatica({ agora, sessaoAberta, existeSessaoHoje, horaAbertura });

    if (acao === 'fechar') {
        await fecharAutomaticamente();
        return acao;
    }

    if (acao === 'abrir') {
        await abrirAutomaticamente();
        return acao;
    }

    return null;
};

const movimentos = async () => {
    const sessao = validarSessaoDoDia(await Caixa.findSessaoAberta());

    return { sessao_id: sessao.id, movimentos: await Caixa.movimentos(sessao.id) };
};

const CaixaService = {
    abrir,
    atual,
    levantamento,
    fechar,
    fecharAutomaticamente,
    abrirAutomaticamente,
    executarRotinaAutomatica,
    movimentos
};

export default CaixaService;
