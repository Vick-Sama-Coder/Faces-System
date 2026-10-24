import db from '../db/client.js';
import Fidelizacao from '../repository/fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';
import Cliente from '../repository/cliente.js';

//verifica se o cliente e do sexo masculino (apenas homens podem ter cartao)
const verificarSexoMasculino = async (cliente_id) => {
    const cliente = await Cliente.findById(cliente_id);
    if (!cliente) return false;
    return cliente.sexo === 'M';
};

//numero de marcas que gera um beneficio
const META = 5;

//limite por operacao de preenchimento manual, para evitar erros de digitacao
const MAX_MARCAS_MANUAIS = 20;

//regista um corte elegivel. Idempotente por atendimento_servico_id.
//Recebe o executor porque e chamado dentro da transacao do atendimento.
//As marcas manuais usam a mesma logica, mas nao passam pela regra diaria nem
//pelo ramo de corte gratuito.
const registarCorte = async (executor, {
    cliente_id,
    atendimento_servico_id = null,
    valor_final,
    registado_por,
    origem = 'atendimento',
    observacao
}) => {
    if (!(await verificarSexoMasculino(cliente_id))) {
        return { marca: false, beneficio: false, ciclo: null, erro: "Apenas clientes do sexo masculino podem ter cartão de fidelização" };
    }

    const cartao = await Fidelizacao.getOrCreateCartao(executor, cliente_id);
    const ganhos = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_ganho");
    const utilizados = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_utilizado");
    const ciclo = ganhos + 1;

    //corte gratuito: so consome beneficio se houver um disponivel.
    //Conta para o ciclo seguinte, sem marca visivel no atual (RN20).
    if (origem === 'atendimento' && Number(valor_final) === 0 && ganhos - utilizados > 0) {
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            origem,
            observacao: "Corte gratuito"
        });
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "marca",
            ciclo: ciclo + 1,
            registado_por,
            origem,
            observacao: "Corte gratuito (conta para o ciclo seguinte)"
        });
        return { marca: false, beneficio: false, ciclo };
    }

    //uma marca de atendimento por cliente por dia, mesmo com varios cortes (RN17).
    //Marcas manuais nao bloqueiam o atendimento do mesmo dia.
    if (origem === 'atendimento' && await Fidelizacao.existeMarcaHoje(executor, cartao.id)) {
        return { marca: false, beneficio: false, ciclo };
    }

    await Fidelizacao.insertMovimento(executor, {
        cartao_id: cartao.id,
        atendimento_servico_id,
        tipo_movimento: "marca",
        ciclo,
        registado_por,
        origem,
        observacao
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
            origem,
            observacao: `${META} marcas no ciclo ${ciclo}`
        });
        return { marca: true, beneficio: true, ciclo };
    }

    return { marca: true, beneficio: false, ciclo };
};

//progresso do cliente: ciclo atual, marcas, beneficios e historico
const progresso = async (cliente_id) => {
    if (!(await verificarSexoMasculino(cliente_id))) {
        return {
            cliente_id,
            cartao: null,
            ciclo_atual: 1,
            meta: META,
            marcas_no_ciclo: 0,
            beneficios_disponiveis: 0,
            beneficios_utilizados: 0,
            historico: [],
            erro: "Apenas clientes do sexo masculino podem ter cartão de fidelização"
        };
    }

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
    if (!(await verificarSexoMasculino(cliente_id))) {
        throw criarErro(403, "Apenas clientes do sexo masculino podem ter cartão de fidelização");
    }

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

//preenchimento manual: o administrador acrescenta marcas ao cartao.
//Cada marca passa por registarCorte, pelo que contribui para o ciclo e pode
//gerar beneficio exactamente como uma marca de atendimento.
const marcarManual = async (cliente_id, { quantidade, confirmar_beneficio }, registado_por) => {
    if (!(await verificarSexoMasculino(cliente_id))) {
        throw criarErro(403, "Apenas clientes do sexo masculino podem ter cartão de fidelização");
    }

    const total = Number(quantidade);

    if (!Number.isInteger(total) || total < 1 || total > MAX_MARCAS_MANUAIS) {
        throw criarErro(400, `A quantidade de marcas deve ser um numero inteiro entre 1 e ${MAX_MARCAS_MANUAIS}`);
    }

    const resultado = await db.transaction(async (tx) => {
        const cartao = await Fidelizacao.getOrCreateCartao(tx, cliente_id);
        const ganhos = await Fidelizacao.countPorTipo(tx, cartao.id, "beneficio_ganho");
        const utilizados = await Fidelizacao.countPorTipo(tx, cartao.id, "beneficio_utilizado");
        const ciclo = ganhos + 1;
        const marcasAtuais = await Fidelizacao.marcasNoCiclo(tx, cartao.id, ciclo);
        const beneficiosAGerar = Math.floor((marcasAtuais + total) / META);

        if (beneficiosAGerar > 0 && confirmar_beneficio !== true) {
            const erro = criarErro(
                409,
                `Esta operacao gera ${beneficiosAGerar} beneficio(s) de fidelizacao. Confirme para continuar.`
            );
            erro.details = {
                requer_confirmacao: true,
                beneficios_a_gerar: beneficiosAGerar,
                marcas_no_ciclo: marcasAtuais,
                marcas_apos: marcasAtuais + total
            };
            throw erro;
        }

        let beneficiosGerados = 0;

        for (let i = 0; i < total; i++) {
            const marca = await registarCorte(tx, {
                cliente_id,
                origem: 'manual',
                registado_por,
                observacao: 'Preenchimento manual do cartao (administrador)'
            });

            if (marca.beneficio) beneficiosGerados++;
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "fidelizacao",
            id_registo: cartao.id,
            operacao: "marcar_manual",
            antes: {
                ciclo,
                marcas_no_ciclo: marcasAtuais,
                beneficios_disponiveis: ganhos - utilizados
            },
            depois: {
                quantidade: total,
                beneficios_gerados: beneficiosGerados
            }
        }, tx);

        return { beneficiosGerados };
    });

    return {
        ...(await progresso(cliente_id)),
        beneficios_gerados: resultado.beneficiosGerados
    };
};

//remocao de uma marca manual, com recalculo do trecho manual a partir do ciclo
//onde a marca se encontra. Para nao reescrever historico de atendimento, a
//operacao e bloqueada se existirem atendimentos ou beneficios utilizados no
//mesmo ciclo ou em ciclos posteriores.
const removerMarcaManual = async (cliente_id, movimento_id, registado_por) => {
    if (!(await verificarSexoMasculino(cliente_id))) {
        throw criarErro(403, "Apenas clientes do sexo masculino podem ter cartão de fidelização");
    }

    await db.transaction(async (tx) => {
        const cartao = await Fidelizacao.getOrCreateCartao(tx, cliente_id);
        const movimentos = await Fidelizacao.findMovimentos(tx, cartao.id);
        const alvo = movimentos.find((movimento) => String(movimento.id) === String(movimento_id));

        if (!alvo) {
            throw criarErro(404, "Movimento de fidelizacao nao encontrado");
        }
        if (alvo.tipo_movimento !== "marca" || alvo.origem !== "manual") {
            throw criarErro(409, "Apenas marcas introduzidas manualmente podem ser removidas");
        }

        const ciclo = alvo.ciclo;
        const temAtendimentoNoCicloOuDepois = movimentos.some((movimento) => (
            movimento.tipo_movimento === "marca"
            && movimento.origem === "atendimento"
            && movimento.ciclo >= ciclo
        ));
        const temBeneficioUtilizadoNoCicloOuDepois = movimentos.some((movimento) => (
            movimento.tipo_movimento === "beneficio_utilizado"
            && movimento.ciclo >= ciclo
        ));

        if (temAtendimentoNoCicloOuDepois || temBeneficioUtilizadoNoCicloOuDepois) {
            throw criarErro(
                409,
                "Nao e possivel remover esta marca: ja existem atendimentos ou beneficios utilizados neste ciclo. Use a correcao de fidelizacao."
            );
        }

        const marcasAntes = await Fidelizacao.marcasNoCiclo(tx, cartao.id, ciclo);
        const manuaisNoTrecho = movimentos.filter((movimento) => (
            movimento.tipo_movimento === "marca"
            && movimento.origem === "manual"
            && movimento.ciclo >= ciclo
        ));
        const beneficiosManuaisNoTrecho = movimentos.filter((movimento) => (
            movimento.tipo_movimento === "beneficio_ganho"
            && movimento.origem === "manual"
            && movimento.ciclo >= ciclo
        ));
        const idsParaApagar = [
            ...manuaisNoTrecho.map((movimento) => movimento.id),
            ...beneficiosManuaisNoTrecho.map((movimento) => movimento.id)
        ];
        const restantes = manuaisNoTrecho.filter(
            (movimento) => String(movimento.id) !== String(movimento_id)
        );

        await Fidelizacao.deleteMovimentos(tx, idsParaApagar);

        for (let i = 0; i < restantes.length; i++) {
            await registarCorte(tx, {
                cliente_id,
                origem: 'manual',
                registado_por,
                observacao: 'Preenchimento manual do cartao (administrador)'
            });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "fidelizacao",
            id_registo: cartao.id,
            operacao: "remover_marca_manual",
            antes: { movimento_id: alvo.id, ciclo, marcas_no_ciclo: marcasAntes },
            depois: {
                marcas_manuais_recalculadas: restantes.length,
                beneficios_manuais_removidos: beneficiosManuaisNoTrecho.length
            }
        }, tx);
    });

    return progresso(cliente_id);
};

//regista a utilizacao de um beneficio que ja existe no cartao.
//Nao cria marca: serve para corrigir o saldo de beneficios disponiveis.
const utilizarBeneficioManual = async (cliente_id, { observacao } = {}, registado_por) => {
    if (!(await verificarSexoMasculino(cliente_id))) {
        throw criarErro(403, "Apenas clientes do sexo masculino podem ter cartão de fidelização");
    }

    await db.transaction(async (tx) => {
        const cartao = await Fidelizacao.getOrCreateCartao(tx, cliente_id);
        const ganhos = await Fidelizacao.countPorTipo(tx, cartao.id, "beneficio_ganho");
        const utilizados = await Fidelizacao.countPorTipo(tx, cartao.id, "beneficio_utilizado");

        if (ganhos - utilizados <= 0) {
            throw criarErro(409, "O cliente nao tem beneficios disponiveis para utilizar");
        }

        const ciclo = ganhos + 1;
        const nota = observacao ? String(observacao).trim().slice(0, 255) : null;

        await Fidelizacao.insertMovimento(tx, {
            cartao_id: cartao.id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            origem: "manual",
            observacao: nota || "Beneficio utilizado (registo manual)"
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "fidelizacao",
            id_registo: cartao.id,
            operacao: "utilizar_beneficio_manual",
            antes: { beneficios_disponiveis: ganhos - utilizados },
            depois: { beneficios_disponiveis: ganhos - utilizados - 1, observacao: nota }
        }, tx);
    });

    return progresso(cliente_id);
};

const FidelizacaoService = {
    META,
    MAX_MARCAS_MANUAIS,
    registarCorte,
    progresso,
    corrigir,
    marcarManual,
    removerMarcaManual,
    utilizarBeneficioManual
};

export default FidelizacaoService;
