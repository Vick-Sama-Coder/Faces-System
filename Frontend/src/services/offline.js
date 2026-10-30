import axios from 'axios';
import server, { syncServer } from './http.js';
import {
    AUTH_CACHE_MAX_AGE_MS,
    adicionarMapeamentoId,
    garantirVersaoCache,
    getLastOwner,
    getOfflineOwner,
    gravarCache,
    gravarMapaIds,
    lerCache,
    libertarEspacoCache,
    obterMapaIds,
    setOfflineOwner
} from './offlineDb.js';
import {
    adicionarItemFila,
    atualizarItemFila,
    criarItemFila,
    lerFila,
    removerItemFila,
    substituirReferenciasTemporarias
} from './offlineQueue.js';
import { aplicarMapaIdsNoCache, aplicarMutacaoCache } from './offlineCache.js';
import {
    aplicarMapaNaConfig,
    endpointSomenteOnline,
    gerarChaveIdempotencia,
    metodoComEscrita,
    normalizarCaminho,
    parseCorpo,
    substituirIds
} from './offlineUtils.js';
import { useOfflineStore } from '../store/offlineStore.js';

const adaptadorOriginal = axios.getAdapter(server.defaults.adapter);
const RETRY_MS = 30000;
// Dados operacionais muito antigos deixam de ser servidos offline. Evita
// mostrar listagens de meses atras como se fossem o estado atual do salao.
const DATA_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let instalado = false;
let sincronizando = false;
let temporizadorRetry = null;

function estaOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function criarErro(codigo, mensagem, config) {
    const erro = new Error(mensagem);
    erro.code = codigo;
    erro.isAxiosError = true;
    erro.config = config;
    return erro;
}

function eErroDeRede(erro) {
    if (!erro) return false;
    if (erro.code === 'ERR_OFFLINE') return true;

    // Um pedido cancelado pelo cliente (navegacao, desmontagem do componente)
    // nao e uma falha de rede e nao deve entrar na fila de escrita.
    if (erro.code === 'ERR_CANCELED' || erro.config?.signal?.aborted) return false;

    if (erro.response) return false;
    return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(erro.code)
        || erro.message === 'Network Error';
}

function respostaDeCache(config, entrada) {
    return {
        data: entrada.data,
        status: entrada.status || 200,
        statusText: 'OK',
        headers: entrada.headers || {},
        config,
        request: { fromCache: true, offline: true },
        cached: true
    };
}

function respostaOtimista(config, dados, status = 202) {
    return {
        data: dados,
        status,
        statusText: 'Accepted',
        headers: { 'x-faces-offline': 'queued' },
        config,
        request: { offline: true, queued: true },
        cached: false,
        offlineQueued: true
    };
}

async function ownerDoPedido(url) {
    const atual = getOfflineOwner();
    if (atual) return atual;

    const caminho = normalizarCaminho(url);
    if (caminho.startsWith('api/public/')) return 'public';

    // Arranque a frio offline: a sessao ainda nao foi validada, mas o dono do
    // cache e conhecido. Sem isto, os primeiros GETs falhavam antes de o
    // checkAuth terminar e as paginas apareciam vazias.
    const ultimo = await getLastOwner();
    if (ultimo) {
        await setOfflineOwner(ultimo);
        return ultimo;
    }

    return null;
}

function cachePermitido(caminho, entrada) {
    if (!entrada) return false;

    const idade = Date.now() - Number(entrada.updatedAt || 0);
    const limite = caminho === 'api/auth/me'
        ? AUTH_CACHE_MAX_AGE_MS
        : DATA_CACHE_MAX_AGE_MS;

    return idade <= limite;
}

function obterHeaderIdempotencia(config) {
    const headers = config.headers;
    if (!headers) return null;
    if (typeof headers.get === 'function') return headers.get('Idempotency-Key');
    return headers['Idempotency-Key'] || headers['idempotency-key'] || null;
}

function definirHeaderIdempotencia(config, chave) {
    if (!chave) return;

    if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Idempotency-Key', chave);
        return;
    }

    config.headers = {
        ...(config.headers || {}),
        'Idempotency-Key': chave
    };
}

async function enfileirarPedido(config, ownerId, chave) {
    const item = await criarItemFila({
        ownerId,
        config,
        idempotencyKey: chave
    });

    try {
        await adicionarItemFila(item);
    } catch {
        // Quota cheia: liberta cache antigo (nunca a fila) e tenta uma vez.
        try {
            await libertarEspacoCache(ownerId);
            await adicionarItemFila(item);
        } catch {
            throw criarErro(
                'ERR_OFFLINE_STORAGE',
                'Nao foi possivel guardar a alteracao neste dispositivo. Liberte espaco e tente novamente.',
                config
            );
        }
    }

    // A fila e o dado critico: uma falha ao atualizar o cache (quota cheia,
    // IndexedDB indisponivel) nao pode impedir que a escrita fique guardada.
    try {
        await aplicarMutacaoCache(item);
    } catch {
        // O cache e reconciliado quando a sincronizacao terminar.
    }

    await useOfflineStore.getState().atualizar().catch(() => {});

    if (!estaOffline()) {
        setTimeout(() => {
            flushOfflineQueue().catch(() => {});
        }, 50);
    }

    return respostaOtimista(config, item.entidade);
}

function donoAindaAtivo(owner) {
    const atual = getOfflineOwner();
    return owner === atual || (owner === 'public' && !atual);
}

async function tratarGet(config, adaptador) {
    const caminho = normalizarCaminho(config.url);
    const owner = await ownerDoPedido(caminho);

    if (estaOffline()) {
        const entrada = owner ? await lerCache(owner, caminho, config.params).catch(() => null) : null;
        if (cachePermitido(caminho, entrada)) return respostaDeCache(config, entrada);

        throw criarErro(
            'ERR_OFFLINE',
            'Sem ligacao a internet e sem dados guardados para esta pagina.',
            config
        );
    }

    try {
        const resposta = await adaptador(config);
        const status = resposta?.status ?? 200;

        // Uma resposta que chega depois do logout (por exemplo, um prefetch
        // atrasado) nao pode voltar a gravar a cache do utilizador antigo.
        if (donoAindaAtivo(owner) && status >= 200 && status < 300 && resposta?.data !== undefined) {
            // Gravar o cache e uma otimizacao. Uma quota cheia ou um erro do
            // IndexedDB nunca deve transformar uma leitura bem-sucedida num
            // erro para o utilizador.
            try {
                await gravarCache(
                    owner,
                    caminho,
                    config.params,
                    resposta.data,
                    status,
                    resposta.headers ? { ...resposta.headers } : {}
                );
            } catch {
                // sem cache local; a proxima leitura volta a tentar
            }
        }

        return resposta;
    } catch (erro) {
        const status = erro?.response?.status;
        // 502/503/504 sao falhas do proxy/servidor (ex.: cold start do Render)
        // e comportam-se como indisponibilidade de rede.
        const indisponivel = [502, 503, 504].includes(status);
        if (!eErroDeRede(erro) && !indisponivel) throw erro;

        const entrada = owner ? await lerCache(owner, caminho, config.params).catch(() => null) : null;
        if (cachePermitido(caminho, entrada)) {
            return respostaDeCache(config, entrada);
        }

        if (indisponivel) throw erro;

        throw criarErro(
            'ERR_OFFLINE',
            'Sem ligacao ao servidor e sem dados guardados para esta pagina.',
            config
        );
    }
}

async function tratarEscrita(config, adaptador) {
    const metodo = String(config.method || 'POST').toUpperCase();
    const caminho = normalizarCaminho(config.url);
    const corpo = parseCorpo(config.data);
    const somenteOnline = endpointSomenteOnline(caminho, corpo);

    if (somenteOnline) {
        if (estaOffline()) {
            throw criarErro(
                'ERR_OFFLINE_WRITE',
                'Esta operacao precisa de ligacao a internet. Tente novamente quando estiver online.',
                config
            );
        }
        return adaptador(config);
    }

    if (!metodoComEscrita(metodo)) return adaptador(config);

    const owner = await ownerDoPedido(caminho);
    if (!owner) {
        throw criarErro(
            'ERR_OFFLINE_AUTH',
            'Sem sessao ativa. Inicie sessao quando houver ligacao a internet.',
            config
        );
    }

    const mapa = await obterMapaIds(owner);
    aplicarMapaNaConfig(config, mapa);

    let chave = obterHeaderIdempotencia(config) || gerarChaveIdempotencia();
    definirHeaderIdempotencia(config, chave);

    if (estaOffline()) {
        return enfileirarPedido(config, owner, chave);
    }

    try {
        return await adaptador(config);
    } catch (erro) {
        const status = erro?.response?.status;
        const indisponivel = [502, 503, 504].includes(status);
        if (!eErroDeRede(erro) && !indisponivel) throw erro;

        // Evita duplicar escritas que chegaram ao servidor mas cuja resposta
        // se perdeu: o mesmo Idempotency-Key e reenviado pela fila. O mesmo
        // se aplica a falhas do proxy (502/503/504).
        return enfileirarPedido(config, owner, chave);
    }
}

async function adicionarMapeamentos(ownerId, item, resposta) {
    const mapa = await obterMapaIds(ownerId);
    let alterou = false;

    const idReal = resposta?.id
        ?? resposta?.cliente?.id
        ?? resposta?.servico?.id
        ?? resposta?.funcionario?.id
        ?? resposta?.despesa?.id
        ?? resposta?.categoria?.id
        ?? resposta?.atendimento?.id;

    if (item.tempId && idReal !== undefined && idReal !== null) {
        mapa[String(item.tempId)] = String(idReal);
        alterou = true;
    }

    const servicosResposta = resposta?.servicos
        || resposta?.atendimento?.servicos
        || [];

    if (Array.isArray(item.temporarios) && item.temporarios.length > 0) {
        for (const filho of item.temporarios) {
            const servico = servicosResposta[filho.indice];
            if (servico?.id !== undefined && servico?.id !== null) {
                mapa[String(filho.tempId)] = String(servico.id);
                alterou = true;
            }
        }
    }

    if (alterou) {
        await gravarMapaIds(mapa, ownerId);
        await substituirReferenciasTemporarias(ownerId, mapa);
        await aplicarMapaIdsNoCache(ownerId, mapa);
    }

    return { mapa, idReal };
}

function mensagemErro(erro) {
    return erro?.response?.data?.message
        || erro?.message
        || 'Falha ao sincronizar.';
}

async function executarFlush(ownerId) {
    if (sincronizando || estaOffline()) return;
    sincronizando = true;
    useOfflineStore.setState({ syncing: true });

    let sincronizouAlgo = false;

    try {
        while (!estaOffline()) {
            const fila = await lerFila(ownerId);
            const item = fila.find((entrada) => entrada.status !== 'failed');

            if (!item) {
                const comErro = fila.find((entrada) => entrada.status === 'failed');
                if (comErro) {
                    useOfflineStore.setState({
                        lastError: comErro.lastError || 'Existe uma alteracao com erro.'
                    });
                }
                break;
            }

            const mapa = await obterMapaIds(ownerId);
            const url = substituirIds(item.url, mapa);
            const data = substituirIds(item.data, mapa);
            const params = substituirIds(item.params, mapa);

            try {
                const resposta = await syncServer.request({
                    method: item.method,
                    url,
                    data,
                    params,
                    headers: {
                        'Idempotency-Key': item.idempotencyKey
                    }
                });

                const dados = resposta?.data;
                let itemAplicado = { ...item, url, data, targetId: substituirIds(item.targetId, mapa) };

                // A escrita ja foi aceite pelo servidor. Uma falha a atualizar
                // o cache local (quota, IndexedDB) nao pode manter a operacao
                // na fila para sempre.
                try {
                    if (item.operacao === 'create') {
                        const { idReal } = await adicionarMapeamentos(ownerId, itemAplicado, dados);
                        if (idReal !== undefined && idReal !== null) {
                            itemAplicado = {
                                ...itemAplicado,
                                targetId: idReal,
                                entidade: dados
                            };
                        }
                    }

                    await aplicarMutacaoCache(
                        itemAplicado,
                        dados ?? (item.operacao === 'delete' ? null : itemAplicado.entidade)
                    );
                } catch {
                    // O cache sera corrigido na proxima leitura online.
                }

                await removerItemFila(ownerId, item.id);
                sincronizouAlgo = true;
                useOfflineStore.setState({
                    lastSyncAt: Date.now(),
                    lastError: null
                });
            } catch (erro) {
                const status = erro?.response?.status;

                if (status === 404 && item.operacao === 'delete') {
                    await aplicarMutacaoCache(
                        { ...item, targetId: substituirIds(item.targetId, mapa) },
                        null
                    ).catch(() => {});
                    await removerItemFila(ownerId, item.id);
                    sincronizouAlgo = true;
                    continue;
                }

                const mensagem = mensagemErro(erro);
                const tentativas = Number(item.attempts || 0) + 1;
                // 5xx e 429 sao transitorios: o backend apaga o registo de
                // idempotencia nesses casos, pelo que o retry e seguro.
                const transitorio = !erro.response
                    || [408, 425, 429].includes(status)
                    || (status >= 500 && status <= 599)
                    || (status === 409 && String(mensagem).toLowerCase().includes('processamento'));

                await atualizarItemFila(ownerId, item.id, {
                    status: transitorio ? 'pending' : 'failed',
                    attempts: tentativas,
                    lastError: mensagem
                });

                useOfflineStore.setState({ lastError: mensagem });

                // Erros transitorios param a fila para preservar a ordem e
                // ser tentados mais tarde. Erros definitivos (400/404/409)
                // ficam marcados como falhados sem bloquear as restantes
                // operacoes pendentes.
                if (transitorio) break;
            }
        }
    } finally {
        sincronizando = false;
        useOfflineStore.setState({ syncing: false });
        await useOfflineStore.getState().atualizar().catch(() => {});

        if (sincronizouAlgo && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('faces:offline-synced'));
        }

        const estatisticas = await useOfflineStore.getState().atualizar()
            .catch(() => ({ pending: 0 }));
        if (estatisticas.pending > 0 && !estaOffline()) {
            agendarRetry();
        }
    }
}

function agendarRetry() {
    if (temporizadorRetry) return;
    temporizadorRetry = setTimeout(() => {
        temporizadorRetry = null;
        flushOfflineQueue().catch(() => {});
    }, RETRY_MS);
}

export async function flushOfflineQueue() {
    const ownerId = getOfflineOwner() || await getLastOwner();
    if (!ownerId || estaOffline()) return;

    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request('faces-offline-sync', () => executarFlush(ownerId));
    }

    return executarFlush(ownerId);
}

export async function iniciarSessaoOffline(userId) {
    // O armazenamento offline nunca deve impedir a sessao de arrancar.
    try {
        await setOfflineOwner(userId);
    } catch {
        // sem persistencia do dono; a sessao em memoria continua
    }

    await useOfflineStore.getState().atualizar().catch(() => {});

    if (!estaOffline()) {
        flushOfflineQueue().catch(() => {});
    }
}

export function installOfflineSupport() {
    if (instalado || typeof window === 'undefined') return;
    instalado = true;

    garantirVersaoCache().catch(() => {});
    useOfflineStore.setState({ online: !estaOffline() });
    useOfflineStore.getState().atualizar().catch(() => {});

    // Pede ao browser para nao despejar o IndexedDB sob pressao de espaco.
    if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => {});
    }

    const aoMudarLigacao = () => {
        useOfflineStore.setState({ online: !estaOffline() });
        useOfflineStore.getState().atualizar().catch(() => {});

        if (!estaOffline()) {
            flushOfflineQueue().catch(() => {});
        }
    };

    const aoVoltarVisivel = () => {
        if (document.visibilityState === 'visible' && !estaOffline()) {
            flushOfflineQueue().catch(() => {});
        }
    };

    window.addEventListener('online', aoMudarLigacao);
    window.addEventListener('offline', aoMudarLigacao);
    window.addEventListener('faces:offline-queue-changed', () => {
        useOfflineStore.getState().atualizar().catch(() => {});
    });
    document.addEventListener('visibilitychange', aoVoltarVisivel);

    // Retry periodico enquanto a app estiver aberta.
    setInterval(() => {
        if (!estaOffline() && getOfflineOwner()) {
            flushOfflineQueue().catch(() => {});
        }
    }, RETRY_MS);
}
function montarAdapter() {
    return async (config) => {
        const metodo = String(config.method || 'GET').toUpperCase();

        if (metodo === 'GET') return tratarGet(config, adaptadorOriginal);
        return tratarEscrita(config, adaptadorOriginal);
    };
}

server.defaults.adapter = montarAdapter();

export { adicionarMapeamentoId };

