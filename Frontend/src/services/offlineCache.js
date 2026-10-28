import {
    atualizarEntradasCache,
    lerCache,
    listarCache
} from './offlineDb.js';
import {
    normalizarCaminho,
    obterIdAlvo,
    obterRecurso,
    recursosParaInvalidar,
    substituirIds
} from './offlineUtils.js';

function mesmoId(a, b) {
    return a !== null && b !== null && a !== undefined && b !== undefined
        && String(a) === String(b);
}

function juntarEntidade(antiga, resposta, mutacao) {
    const corpo = mutacao.corpo && typeof mutacao.corpo === 'object' ? mutacao.corpo : {};
    const atualizacao = resposta && typeof resposta === 'object' ? resposta : corpo;

    return {
        ...antiga,
        ...atualizacao,
        id: atualizacao.id ?? antiga.id,
        __offline: Boolean(atualizacao.__offline)
    };
}

function subrecursoDaMutacao(caminho) {
    const path = normalizarCaminho(caminho);
    if (path.includes('/modalidades')) return 'modalidades';
    if (path.includes('/aplicacoes')) return 'aplicacoes';
    if (path.includes('/horarios')) return 'horarios';
    if (path.includes('/fidelizacao')) return 'fidelizacao';
    if (path.includes('/permissoes')) return 'permissoes';
    return null;
}

function urlCombinaComMutacao(urlEntrada, mutacao) {
    const url = normalizarCaminho(urlEntrada);
    const caminho = normalizarCaminho(mutacao.url);
    const subrecurso = subrecursoDaMutacao(caminho);

    if (mutacao.operacao === 'create') {
        return url === mutacao.colecao;
    }

    if (subrecurso) {
        return url.includes(`/${subrecurso}`);
    }

    return true;
}

function aplicarEmArray(lista, mutacao, resposta) {
    const alvo = mutacao.targetId;
    const entidadeNova = resposta || mutacao.entidade;

    if (mutacao.operacao === 'create') {
        if (!entidadeNova || entidadeNova.id === undefined) return lista;

        // Na sincronizacao o ID temporario ja foi substituido pelo real e a
        // entidade existe no cache. Substitui-la pelos dados do servidor
        // remove o marcador __offline e completa os campos calculados.
        if (lista.some((item) => mesmoId(item?.id, entidadeNova.id))) {
            return lista.map((item) => (
                mesmoId(item?.id, entidadeNova.id)
                    ? { ...item, ...entidadeNova, __offline: Boolean(entidadeNova.__offline) }
                    : item
            ));
        }

        return [...lista, entidadeNova];
    }

    if (mutacao.operacao === 'delete') {
        return lista.filter((item) => !mesmoId(item?.id, alvo));
    }

    let encontrou = false;
    const resultado = lista.map((item) => {
        if (!mesmoId(item?.id, alvo)) return item;
        encontrou = true;
        return juntarEntidade(item, resposta, mutacao);
    });

    return encontrou ? resultado : lista;
}

function aplicarEmObjeto(objeto, mutacao, resposta) {
    if (!objeto || typeof objeto !== 'object') return objeto;

    if (mesmoId(objeto.id, mutacao.targetId)) {
        if (mutacao.operacao === 'delete') return null;
        return juntarEntidade(objeto, resposta, mutacao);
    }

    if (mutacao.operacao === 'create') {
        return objeto;
    }

    // Alguns endpoints devolvem o registo dentro de uma propriedade (ex.:
    // { atendimento: {...} }). Atualizamos essa propriedade quando aplicavel.
    const resultado = { ...objeto };
    for (const [chave, valor] of Object.entries(resultado)) {
        if (Array.isArray(valor)) {
            resultado[chave] = aplicarEmArray(valor, mutacao, resposta);
        } else if (valor && typeof valor === 'object' && mesmoId(valor.id, mutacao.targetId)) {
            resultado[chave] = juntarEntidade(valor, resposta, mutacao);
        }
    }

    return resultado;
}

function dataDentroDoIntervalo(data, params) {
    if (!data || !params) return true;

    const dia = String(data).slice(0, 10);
    if (params.de && dia < String(params.de).slice(0, 10)) return false;
    if (params.ate && dia > String(params.ate).slice(0, 10)) return false;
    return true;
}

function aplicarNaEntrada(entrada, mutacao, resposta) {
    const url = normalizarCaminho(entrada.url);
    const caminhoMutacao = normalizarCaminho(mutacao.url);

    // A pagina de horarios grava o conjunto completo de horarios do
    // funcionario de uma so vez. O cache deve substituir a lista inteira.
    if (/^api\/funcionarios\/-?\d+\/horarios$/.test(caminhoMutacao)) {
        const horarios = Array.isArray(resposta)
            ? resposta
            : (resposta?.horarios || mutacao.corpo?.horarios);

        if (Array.isArray(horarios)) {
            return { ...entrada, data: horarios };
        }
    }

    // A assiduidade diaria e enviada como uma acao sem id de registo. Nesse
    // caso atualizamos (ou acrescentamos) o dia correspondente na lista.
    if (/^api\/assiduidade\/dia$/.test(caminhoMutacao)) {
        const corpo = mutacao.corpo && typeof mutacao.corpo === 'object'
            ? mutacao.corpo
            : {};
        const dados = resposta && typeof resposta === 'object' && !resposta.__offline
            ? resposta
            : corpo;

        if (Array.isArray(entrada.data) && dataDentroDoIntervalo(dados.data, entrada.params)) {
            const indice = entrada.data.findIndex((item) => (
                String(item?.funcionario_id) === String(dados.funcionario_id)
                && String(item?.data).slice(0, 10) === String(dados.data).slice(0, 10)
            ));

            if (indice >= 0) {
                const lista = entrada.data.slice();
                lista[indice] = {
                    ...lista[indice],
                    ...dados,
                    id: dados.id ?? lista[indice].id
                };
                return { ...entrada, data: lista };
            }

            return {
                ...entrada,
                data: [
                    ...entrada.data,
                    {
                        ...dados,
                        id: dados.id ?? `offline-${dados.funcionario_id}-${dados.data}`,
                        __offline: true
                    }
                ]
            };
        }
    }

    if (url.includes('/fidelizacao') && mutacao.recurso === 'fidelizacao') {
        // As respostas offline sao apenas o corpo enviado (ex.: { quantidade }).
        // O progresso do cartao tem outra forma; so o substituimos quando o
        // servidor devolve o estado completo.
        if (!resposta || typeof resposta !== 'object' || resposta.__offline) {
            return entrada;
        }

        return {
            ...entrada,
            data: { ...entrada.data, ...resposta }
        };
    }

    // Descontos: a resposta real traz o atendimento completo. Offline,
    // aplicamos o desconto ao servico correspondente para o total nao ficar
    // desatualizado antes da sincronizacao.
    if (url.includes('/atendimentos') && /\/descontos$/.test(normalizarCaminho(mutacao.url))) {
        function atualizarDesconto(item) {
            if (!mesmoId(item?.id, mutacao.targetId)) return item;

            if (resposta?.servicos && typeof resposta === 'object') {
                return { ...item, ...resposta };
            }

            const corpo = mutacao.corpo && typeof mutacao.corpo === 'object'
                ? mutacao.corpo
                : {};
            const servicoAlvo = corpo.atendimento_servico_id;
            const servicos = Array.isArray(item.servicos)
                ? item.servicos.map((servico) => (
                    mesmoId(servico.id, servicoAlvo)
                        ? {
                            ...servico,
                            valor_desconto: Number(corpo.valor_desconto || 0),
                            valor_final: Number(corpo.valor_final || 0),
                            __offline: true
                        }
                        : servico
                ))
                : item.servicos;

            const valorTotal = Array.isArray(servicos)
                ? servicos.reduce((total, servico) => total + Number(servico.valor_final || 0), 0)
                : item.valor_total;

            return {
                ...item,
                servicos,
                valor_total: valorTotal,
                __offline: true
            };
        }

        if (Array.isArray(entrada.data)) {
            return { ...entrada, data: entrada.data.map(atualizarDesconto) };
        }
        if (entrada.data && typeof entrada.data === 'object') {
            return { ...entrada, data: atualizarDesconto(entrada.data) };
        }
    }

    // Pagamentos: a resposta e o pagamento, mas o cache guarda o atendimento.
    if (url.includes('/atendimentos') && /\/pagamentos$/.test(normalizarCaminho(mutacao.url))) {
        const valorPago = Number(
            (resposta?.valor)
            ?? (Array.isArray(resposta?.parcelas)
                ? resposta.parcelas.reduce((total, parcela) => total + Number(parcela.valor || 0), 0)
                : 0)
        );

        // A sincronizacao devolve o estado absoluto do atendimento. Usar esse
        // valor evita somar o pagamento duas vezes (criacao otimista + sync).
        const atendimentoServidor = resposta?.atendimento;

        const valorPagoAbsoluto = atendimentoServidor?.valor_pago !== undefined
            ? Number(atendimentoServidor.valor_pago)
            : null;

        // Compatibilidade com um backend antigo (sem o snapshot absoluto): a
        // criacao otimista ja somou o pagamento, por isso nao voltamos a somar
        // na sincronizacao. A proxima leitura online corrige o valor.
        if (resposta && !resposta.__offline && valorPagoAbsoluto === null) {
            return entrada;
        }

        function atualizarAtendimento(item) {
            if (!mesmoId(item?.id, mutacao.targetId)) return item;
            const total = Number(item.valor_total || 0);
            const atual = Number(item.valor_pago || 0);
            // Nunca deixar o cache regredir: uma resposta idempotente antiga
            // nao pode apagar um pagamento que ja esteja refletido localmente.
            const pago = valorPagoAbsoluto !== null
                ? Math.max(atual, valorPagoAbsoluto)
                : atual + valorPago;
            const estado = (valorPagoAbsoluto !== null && valorPagoAbsoluto >= atual
                ? atendimentoServidor.estado
                : null)
                || (pago >= total ? 'Pago' : (item.estado || 'Em andamento'));
            return {
                ...item,
                valor_pago: pago,
                estado,
                metodos_pagamento: [
                    item.metodos_pagamento,
                    resposta?.metodo_pagamento
                        || resposta?.metodo
                        || resposta?.parcelas?.[0]?.metodo_pagamento
                ].filter(Boolean).filter((valor, indice, lista) => lista.indexOf(valor) === indice).join(', ')
            };
        }

        if (Array.isArray(entrada.data)) {
            return { ...entrada, data: entrada.data.map(atualizarAtendimento) };
        }
        if (entrada.data && typeof entrada.data === 'object') {
            return { ...entrada, data: atualizarAtendimento(entrada.data) };
        }
    }

    if (Array.isArray(entrada.data)) {
        return { ...entrada, data: aplicarEmArray(entrada.data, mutacao, resposta) };
    }

    if (entrada.data && typeof entrada.data === 'object') {
        return { ...entrada, data: aplicarEmObjeto(entrada.data, mutacao, resposta) };
    }

    return entrada;
}

async function enriquecerEntidade(entidade, mutacao, owner) {
    if (!entidade || typeof entidade !== 'object') return entidade;

    try {
        if (mutacao.recurso === 'servicos' && entidade.categoria_id) {
            const categorias = await lerCache(owner, 'api/categorias', null);
            const categoria = Array.isArray(categorias?.data)
                ? categorias.data.find((item) => mesmoId(item.id, entidade.categoria_id))
                : null;
            if (categoria) return { ...entidade, categoria_nome: categoria.nome };
        }

        if (mutacao.recurso === 'despesas' && entidade.categoria_id) {
            const categorias = await lerCache(owner, 'api/categorias-despesa', null);
            const categoria = Array.isArray(categorias?.data)
                ? categorias.data.find((item) => mesmoId(item.id, entidade.categoria_id))
                : null;
            if (categoria) return { ...entidade, categoria_nome: categoria.nome };
        }

        if (mutacao.recurso === 'atendimentos' && entidade.cliente_id) {
            const clientes = await lerCache(owner, 'api/clientes', null);
            const cliente = Array.isArray(clientes?.data)
                ? clientes.data.find((item) => mesmoId(item.id, entidade.cliente_id))
                : null;
            if (cliente) {
                return {
                    ...entidade,
                    cliente_nome: cliente.nome,
                    cliente_apelido: cliente.apelido,
                    cliente_telefone: cliente.telefone
                };
            }
        }
    } catch {
        // O enriquecimento e apenas cosmetico; nunca bloqueia a gravacao local.
    }

    return entidade;
}

export async function aplicarMutacaoCache(mutacao, resposta = null) {
    const owner = mutacao.ownerId;
    if (!owner) return;

    const recurso = obterRecurso(mutacao.url);
    const agregados = recursosParaInvalidar(recurso);
    const entidade = await enriquecerEntidade(
        resposta || mutacao.entidade,
        { ...mutacao, recurso },
        owner
    );

    const mutacaoAplicada = {
        ...mutacao,
        recurso,
        entidade,
        targetId: mutacao.targetId ?? obterIdAlvo(mutacao.url)
    };

    await atualizarEntradasCache(owner, (entrada) => {
        const recursoEntrada = obterRecurso(entrada.url);

        if (agregados.has(recursoEntrada)) {
            return { ...entrada, stale: true, staleAt: Date.now() };
        }

        // Nunca aplicar uma mutacao a entradas de outro recurso. Sem esta
        // guarda, um update de, por exemplo, o cliente 1 poderia alterar
        // qualquer lista que tivesse um registo com o mesmo id numerico.
        if (recursoEntrada !== recurso) {
            return entrada;
        }

        if (!urlCombinaComMutacao(entrada.url, mutacaoAplicada)) {
            return entrada;
        }

        return aplicarNaEntrada(entrada, mutacaoAplicada, entidade);
    });
}

export async function aplicarMapaIdsNoCache(owner, mapa) {
    if (!owner || !mapa || Object.keys(mapa).length === 0) return;

    await atualizarEntradasCache(owner, (entrada) => ({
        ...entrada,
        data: substituirIds(entrada.data, mapa)
    }));
}

export async function marcarCacheStale(owner, recursos) {
    if (!owner) return;
    const alvos = new Set(recursos);
    await atualizarEntradasCache(owner, (entrada) => (
        alvos.has(obterRecurso(entrada.url))
            ? { ...entrada, stale: true, staleAt: Date.now() }
            : entrada
    ));
}

export async function existeCache(owner) {
    return (await listarCache(owner)).length > 0;
}
