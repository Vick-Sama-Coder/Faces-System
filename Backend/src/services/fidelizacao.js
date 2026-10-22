import db from '../db/client.js';
import Fidelizacao from '../repository/fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';

//numero de marcas que gera um beneficio
const META = 5;

//regista um corte elegivel. Idempotente por atendimento_servico_id.
//Recebe o executor porque e chamado dentro da transacao do atendimento.
const registarCorte = async (executor, { cliente_id, atendimento_servico_id, valor_final, registado_por }) => {
    const cartao = await Fidelizacao.getOrCreateCartao(executor, cliente_id);
    const ganhos = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_ganho");
    const utilizados = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_utilizado");
    const ciclo = ganhos + 1;

    //corte gratuito: so consome beneficio se houver um disponivel.
    //Conta para o ciclo seguinte, sem marca visivel no atual (RN20).
    if (Number(valor_final) === 0 && ganhos - utilizados > 0) {
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            observacao: "Corte gratuito"
        });
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "marca",
            ciclo: ciclo + 1,
            registado_por,
            observacao: "Corte gratuito (conta para o ciclo seguinte)"
        });
        return;
    }

    //uma marca por cliente por dia, mesmo com varios cortes (RN17)
    if (await Fidelizacao.existeMarcaHoje(executor, cartao.id)) {
        return;
    }

    await Fidelizacao.insertMovimento(executor, {
        cartao_id: cartao.id,
        atendimento_servico_id,
        tipo_movimento: "marca",
        ciclo,
        registado_por
    });

    //5.ª marca do ciclo -> gera beneficio (RN18); os beneficios acumulam (RN19)
    const marcas = await Fidelizacao.marcasNoCiclo(executor, cartao.id, ciclo);
    if (marcas >= META) {
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "beneficio_ganho",
            ciclo,
            registado_por,
            observacao: `${META} marcas no ciclo ${ciclo}`
        });
    }
};

//progresso do cliente: ciclo atual, marcas, beneficios e historico
const progresso = async (cliente_id) => {
    const cartao = await Fidelizacao.findCartao(db, cliente_id);

    if (!cartao) {
        return {
            cliente_id,
            cartao: null,
            ciclo_atual: 1,
            meta: META,
            marcas_no_ciclo: 0,
            beneficios_disponiveis: 0,
            beneficios_utilizados: 0,
            historico: []
        };
    }

    const ganhos = await Fidelizacao.countPorTipo(db, cartao.id, "beneficio_ganho");
    const utilizados = await Fidelizacao.countPorTipo(db, cartao.id, "beneficio_utilizado");
    const ciclo = ganhos + 1;

    return {
        cliente_id,
        cartao,
        ciclo_atual: ciclo,
        meta: META,
        marcas_no_ciclo: await Fidelizacao.marcasNoCiclo(db, cartao.id, ciclo),
        beneficios_disponiveis: ganhos - utilizados,
        beneficios_utilizados: utilizados,
        historico: await Fidelizacao.findMovimentos(db, cartao.id)
    };
};

//correcao manual autorizada (fidelizacao:corrigir)
const corrigir = async (cliente_id, { tipo_movimento, ciclo, observacao }, registado_por) => {
    const cartao = await Fidelizacao.getOrCreateCartao(db, cliente_id);

    await Fidelizacao.insertMovimento(db, {
        cartao_id: cartao.id,
        atendimento_servico_id: null,
        tipo_movimento: tipo_movimento || "correcao",
        ciclo: ciclo ?? 1,
        registado_por,
        observacao
    });

    await AuditoriaService.registar({
        id_utilizador: registado_por,
        entidade: "fidelizacao",
        id_registo: cartao.id,
        operacao: "corrigir",
        depois: { cliente_id, tipo_movimento: tipo_movimento || "correcao", ciclo: ciclo ?? 1, observacao }
    });
};

const FidelizacaoService = {
    META,
    registarCorte,
    progresso,
    corrigir
};

export default FidelizacaoService;
