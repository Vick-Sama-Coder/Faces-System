import db from '../db/client.js';
import Fidelizacao from '../repository/fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';
import {
    LIMITE_FIDELIZACAO,
    META_FIDELIZACAO,
    servicoContaParaFidelizacao
} from '../utils/validacoes.js';

//numero de marcas que gera um beneficio
const META = META_FIDELIZACAO;

//o beneficio cobre um unico servico elegivel, ate este valor
const LIMITE_BENEFICIO = LIMITE_FIDELIZACAO;

//limite por operacao de preenchimento manual, para evitar erros de digitacao
const MAX_MARCAS_MANUAIS = 20;

//saldos do cartao. Enquanto houver um beneficio por usar, o cartao continua
//visualmente completo (5/5); o 6.º servico e que o consome e reinicia o ciclo.
const saldosCartao = async (executor, cliente_id) => {
    const cartao = await Fidelizacao.getOrCreateCartao(executor, cliente_id);
    const ganhos = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_ganho");
    const utilizados = await Fidelizacao.countPorTipo(executor, cartao.id, "beneficio_utilizado");
    const pendentes = ganhos - utilizados;

    return {
        cartao,
        ganhos,
        utilizados,
        pendentes,
        //enquanto o 6.º serviço estiver pendente, o ciclo actual ainda e o
        //ciclo completo (5/5). So depois de o consumir e que avanca.
        ciclo: pendentes > 0 ? Math.max(ganhos, 1) : ganhos + 1
    };
};

//regista um servico elegivel. Idempotente por atendimento_servico_id.
//Recebe o executor porque e chamado dentro da transacao do atendimento.
//As marcas manuais usam a mesma logica, mas nao passam pela regra diaria nem
//pelo ramo de servico gratuito.
const registarCorte = async (executor, {
    cliente_id,
    atendimento_servico_id = null,
    valor_final,
    registado_por,
    origem = 'atendimento',
    usar_beneficio = false,
    observacao
}) => {
    const {
        cartao,
        pendentes: disponiveis,
        ciclo
    } = await saldosCartao(executor, cliente_id);

    //servico gratuito: consome um beneficio e nao cria marca no ciclo seguinte.
    //O cliente escolhe apenas um servico elegivel, ate ao limite definido.
    if (usar_beneficio) {
        if (disponiveis <= 0) {
            throw criarErro(409, "O cliente nao tem beneficios de fidelizacao disponiveis");
        }

        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            origem,
            observacao: observacao || `Servico gratuito ate ${LIMITE_BENEFICIO} MT`
        });

        return { marca: false, beneficio: false, beneficio_utilizado: true, ciclo };
    }

    //um servico com valor final zero nao e um servico pago e, por isso,
    //nao conta como marca (o gratis tem de ser indicado explicitamente).
    if (origem === 'atendimento' && Number(valor_final) <= 0) {
        return { marca: false, beneficio: false, ciclo };
    }

    //uma marca de atendimento por cliente por dia, mesmo com varios servicos (RN17).
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

    //5.ª marca do ciclo -> deixa o 6.º servico gratuito pendente (RN18).
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

//regista a fidelizacao de um atendimento completo. E chamado depois de todas
//as linhas serem inseridas para que a regra seja independente da ordem dos
//servicos no pedido:
//- com o cartao completo (5/5), um servico elegivel tem de ser gratuito;
//- esse servico consome o beneficio e nenhum servico do atendimento gera marca;
//- sem beneficio pendente, o atendimento gera no maximo uma marca por dia.
const registarAtendimento = async (executor, {
    cliente_id,
    itens,
    registado_por,
    selecao_explicita = false
}) => {
    // Aplicacoes nunca contam para fidelizacao; o servico tem de ser principal,
    // elegivel e pago.
    const elegiveis = itens.filter((item) => (
        item.tipo_servico !== 'Aplicacao'
        && servicoContaParaFidelizacao(item.servico)
    ));

    if (elegiveis.length === 0) {
        return { marca: false, beneficio: false, beneficio_utilizado: false };
    }

    const gratuitos = elegiveis.filter((item) => item.usar_beneficio);
    if (gratuitos.length > 1) {
        throw criarErro(409, "So e possivel usar um beneficio gratuito por cliente");
    }

    const selecionados = elegiveis.filter((item) => item.fidelizacao_selecionada === true);
    if (selecionados.length > 1) {
        throw criarErro(409, "So e possivel escolher um servico para fidelizacao por cliente");
    }

    //um servico com valor final zero nao e um servico pago e nao pode gerar
    //marca, mesmo que o servico do catalogo seja elegivel.
    const elegiveisPagos = elegiveis.filter((item) => (
        !item.usar_beneficio && Number(item.valor_final) > 0
    ));

    const gratuito = gratuitos[0] || null;
    const {
        cartao,
        pendentes,
        ciclo
    } = await saldosCartao(executor, cliente_id);

    if (pendentes > 0) {
        if (!gratuito) {
            //se so houver linhas elegiveis a zero, nao ha um servico pago para
            //consumir o 6.º gratuito; o beneficio mantem-se pendente.
            if (elegiveisPagos.length === 0) {
                return { marca: false, beneficio: false, beneficio_utilizado: false, ciclo };
            }

            const erro = criarErro(
                409,
                "O cartao esta completo (5/5): o 6.º servico elegivel tem de ser gratuito. Selecione o servico que sera oferecido"
            );
            erro.field = "servicos";
            throw erro;
        }

        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id: gratuito.atendimento_servico_id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            origem: "atendimento",
            observacao: `6.º servico gratuito ate ${LIMITE_BENEFICIO} MT`
        });

        return { marca: false, beneficio: false, beneficio_utilizado: true, ciclo };
    }

    if (gratuito) {
        throw criarErro(409, "O cliente ainda nao tem o 6.º servico gratuito disponivel");
    }

    if (elegiveisPagos.length === 0) {
        return { marca: false, beneficio: false, ciclo };
    }

    // Seleccao explicita: so o servico escolhido conta. Sem escolha, nao ha
    // marca (o utilizador pode optar por nao usar a fidelizacao neste
    // atendimento). Pedidos antigos, sem a propriedade, mantem o
    // comportamento anterior de escolher o primeiro servico elegivel.
    if (selecao_explicita && selecionados.length === 0) {
        return { marca: false, beneficio: false, ciclo };
    }

    const primeiro = selecao_explicita ? selecionados[0] : elegiveisPagos[0];

    if (!primeiro || !elegiveisPagos.includes(primeiro)) {
        return { marca: false, beneficio: false, ciclo };
    }

    if (await Fidelizacao.existeMarcaHoje(executor, cartao.id)) {
        return { marca: false, beneficio: false, ciclo };
    }

    await Fidelizacao.insertMovimento(executor, {
        cartao_id: cartao.id,
        atendimento_servico_id: primeiro.atendimento_servico_id,
        tipo_movimento: "marca",
        ciclo,
        registado_por,
        origem: "atendimento",
        observacao: "Marca de atendimento"
    });

    const marcas = await Fidelizacao.marcasNoCiclo(executor, cartao.id, ciclo);
    if (marcas >= META) {
        await Fidelizacao.insertMovimento(executor, {
            cartao_id: cartao.id,
            atendimento_servico_id: primeiro.atendimento_servico_id,
            tipo_movimento: "beneficio_ganho",
            ciclo,
            registado_por,
            origem: "atendimento",
            observacao: `${META} marcas no ciclo ${ciclo}`
        });
        return { marca: true, beneficio: true, ciclo };
    }

    return { marca: true, beneficio: false, ciclo };
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
            limite_beneficio: LIMITE_BENEFICIO,
            marcas_no_ciclo: 0,
            beneficios_disponiveis: 0,
            beneficios_utilizados: 0,
            beneficio_pendente: false,
            historico: []
        };
    }

    const ganhos = await Fidelizacao.countPorTipo(db, cartao.id, "beneficio_ganho");
    const utilizados = await Fidelizacao.countPorTipo(db, cartao.id, "beneficio_utilizado");
    const pendentes = ganhos - utilizados;
    //com o 6.º servico pendente, o cartao ainda mostra o ciclo completo (5/5).
    //So depois de o usar e que o ciclo seguinte comeca em 0.
    const ciclo = pendentes > 0 ? Math.max(ganhos, 1) : ganhos + 1;

    return {
        cliente_id,
        cartao,
        ciclo_atual: ciclo,
        meta: META,
        limite_beneficio: LIMITE_BENEFICIO,
        marcas_no_ciclo: await Fidelizacao.marcasNoCiclo(db, cartao.id, ciclo),
        beneficios_disponiveis: pendentes,
        beneficios_utilizados: utilizados,
        beneficio_pendente: pendentes > 0,
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

//preenchimento manual: o administrador acrescenta marcas ao cartao.
//O cartao tem no maximo 5 marcas; com o 6.º servico pendente, e obrigatorio
//registar primeiro a utilizacao do beneficio antes de acrescentar mais marcas.
const marcarManual = async (cliente_id, { quantidade, confirmar_beneficio }, registado_por) => {
    const total = Number(quantidade);

    if (!Number.isInteger(total) || total < 1 || total > MAX_MARCAS_MANUAIS) {
        throw criarErro(400, `A quantidade de marcas deve ser um numero inteiro entre 1 e ${MAX_MARCAS_MANUAIS}`);
    }

    const resultado = await db.transaction(async (tx) => {
        const {
            cartao,
            ganhos,
            utilizados,
            pendentes,
            ciclo
        } = await saldosCartao(tx, cliente_id);

        if (pendentes > 0) {
            throw criarErro(
                409,
                "O cartao esta completo (5/5). Registe a utilizacao do 6.º servico gratuito antes de adicionar novas marcas"
            );
        }

        const marcasAtuais = await Fidelizacao.marcasNoCiclo(tx, cartao.id, ciclo);

        if (marcasAtuais + total > META) {
            throw criarErro(
                409,
                `O cartao so pode ter ${META} marcas neste ciclo. Acrescente no maximo ${Math.max(META - marcasAtuais, 0)} marca(s)`
            );
        }

        const beneficiosAGerar = marcasAtuais + total === META ? 1 : 0;

        if (beneficiosAGerar > 0 && confirmar_beneficio !== true) {
            const erro = criarErro(
                409,
                "Esta operacao completa o cartao e deixa o 6.º servico gratuito. Confirme para continuar."
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

//remocao de uma marca do ciclo actual, quer tenha sido introduzida manualmente
//quer tenha vindo de um atendimento. Ciclos ja fechados nao sao alterados:
//para esses casos existe a correcao de fidelizacao.
const removerMarca = async (cliente_id, movimento_id, registado_por) => {
    await db.transaction(async (tx) => {
        const cartao = await Fidelizacao.getOrCreateCartao(tx, cliente_id);
        const { ciclo } = await saldosCartao(tx, cliente_id);
        const movimentos = await Fidelizacao.findMovimentos(tx, cartao.id);
        const alvo = movimentos.find((movimento) => String(movimento.id) === String(movimento_id));

        if (!alvo) {
            throw criarErro(404, "Movimento de fidelizacao nao encontrado");
        }
        if (alvo.tipo_movimento !== "marca") {
            throw criarErro(409, "Apenas marcas podem ser removidas do cartao");
        }
        if (Number(alvo.ciclo) !== Number(ciclo)) {
            throw criarErro(
                409,
                "So e possivel remover marcas do ciclo actual. Use a correcao de fidelizacao para ciclos anteriores."
            );
        }

        const beneficiosDoCiclo = movimentos.filter((movimento) => (
            movimento.tipo_movimento === "beneficio_ganho"
            && Number(movimento.ciclo) === Number(ciclo)
        ));

        const marcasAntes = await Fidelizacao.marcasNoCiclo(tx, cartao.id, ciclo);
        const idsParaApagar = [
            alvo.id,
            ...beneficiosDoCiclo.map((movimento) => movimento.id)
        ];

        await Fidelizacao.deleteMovimentos(tx, idsParaApagar);

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "fidelizacao",
            id_registo: cartao.id,
            operacao: "remover_marca",
            antes: {
                movimento_id: alvo.id,
                origem: alvo.origem,
                ciclo,
                marcas_no_ciclo: marcasAntes
            },
            depois: {
                beneficios_pendentes_removidos: beneficiosDoCiclo.length,
                marcas_no_ciclo: await Fidelizacao.marcasNoCiclo(tx, cartao.id, ciclo)
            }
        }, tx);
    });

    return progresso(cliente_id);
};

//regista a utilizacao do 6.º servico gratuito que esta pendente no cartao.
//Nao cria marca: fecha o ciclo completo e o cartao reinicia em 0/5.
const utilizarBeneficioManual = async (cliente_id, { observacao } = {}, registado_por) => {
    await db.transaction(async (tx) => {
        const {
            cartao,
            pendentes,
            ciclo
        } = await saldosCartao(tx, cliente_id);

        if (pendentes <= 0) {
            throw criarErro(409, "O cliente nao tem o 6.º servico gratuito pendente");
        }

        const nota = observacao ? String(observacao).trim().slice(0, 255) : null;

        await Fidelizacao.insertMovimento(tx, {
            cartao_id: cartao.id,
            tipo_movimento: "beneficio_utilizado",
            ciclo,
            registado_por,
            origem: "manual",
            observacao: nota || "6.º servico gratuito utilizado (registo manual)"
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "fidelizacao",
            id_registo: cartao.id,
            operacao: "utilizar_beneficio_manual",
            antes: { beneficios_pendentes: pendentes },
            depois: { beneficios_pendentes: pendentes - 1, observacao: nota }
        }, tx);
    });

    return progresso(cliente_id);
};

const FidelizacaoService = {
    META,
    LIMITE_BENEFICIO,
    MAX_MARCAS_MANUAIS,
    saldosCartao,
    registarCorte,
    registarAtendimento,
    progresso,
    corrigir,
    marcarManual,
    removerMarca,
    utilizarBeneficioManual
};

export default FidelizacaoService;
