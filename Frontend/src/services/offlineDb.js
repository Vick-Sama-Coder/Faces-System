import localforage from 'localforage';

export const CACHE_VERSION = 1;
// Alinhado com a validade do cookie de sessao (10 dias). Um valor menor
// impedia restaurar a sessao offline antes de a sessao expirar.
export const AUTH_CACHE_MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = `faces.api.v${CACHE_VERSION}`;
const MAX_CACHE_ENTRIES = 2000;
const PODA_INTERVALO = 200;

let gravacoesDesdePoda = 0;

export const apiCache = localforage.createInstance({
    name: 'faces-system',
    storeName: 'api_cache'
});

export const queueStore = localforage.createInstance({
    name: 'faces-system',
    storeName: 'offline_queue'
});

export const metaStore = localforage.createInstance({
    name: 'faces-system',
    storeName: 'offline_meta'
});

let ownerId = null;

function normalizarId(valor) {
    return valor === null || valor === undefined ? null : String(valor);
}

export function getOfflineOwner() {
    return ownerId;
}

export async function setOfflineOwner(valor) {
    ownerId = normalizarId(valor);

    if (ownerId) {
        await metaStore.setItem('lastOwner', ownerId);
    } else {
        await metaStore.removeItem('lastOwner');
    }
}

export async function restoreOfflineOwner() {
    if (ownerId) return ownerId;
    const ultimo = await metaStore.getItem('lastOwner');
    ownerId = normalizarId(ultimo);
    return ownerId;
}

export async function getLastOwner() {
    return normalizarId(await metaStore.getItem('lastOwner'));
}

function serializarParams(params) {
    if (!params || typeof params !== 'object') return '';
    const chaves = Object.keys(params).sort();
    if (chaves.length === 0) return '';

    const normalizado = {};
    for (const chave of chaves) {
        const valor = params[chave];
        if (valor !== undefined) normalizado[chave] = valor;
    }
    return JSON.stringify(normalizado);
}

export function construirChaveCache(owner, url, params) {
    const query = serializarParams(params);
    return `${CACHE_PREFIX}:${owner || 'anon'}:${url}${query ? `?${query}` : ''}`;
}

export async function garantirVersaoCache() {
    const versao = await metaStore.getItem('cacheVersion');
    if (versao === CACHE_VERSION) return;

    await apiCache.clear();
    await metaStore.setItem('cacheVersion', CACHE_VERSION);
}

export async function lerCache(owner, url, params) {
    if (!owner) return null;
    return apiCache.getItem(construirChaveCache(owner, url, params));
}

// Remove as entradas mais antigas quando o cache de um utilizador cresce
// demasiado. Sem isto, o prefetch continuo acabava por encher a quota do
// IndexedDB e as gravacoes passavam a falhar em silencio.
async function podarCache(owner) {
    const prefixo = `${CACHE_PREFIX}:${owner || 'anon'}:`;
    const chaves = (await apiCache.keys()).filter((chave) => chave.startsWith(prefixo));
    if (chaves.length <= MAX_CACHE_ENTRIES) return;

    const entradas = [];
    for (const chave of chaves) {
        const entrada = await apiCache.getItem(chave);
        entradas.push({ chave, updatedAt: Number(entrada?.updatedAt || 0) });
    }

    entradas.sort((a, b) => a.updatedAt - b.updatedAt);
    const excedente = entradas.slice(0, chaves.length - MAX_CACHE_ENTRIES);

    for (const entrada of excedente) {
        await apiCache.removeItem(entrada.chave);
    }
}

// Remove as entradas mais antigas de um utilizador para libertar quota.
// Usado como ultimo recurso quando a fila ou o cache nao conseguem gravar.
export async function libertarEspacoCache(owner) {
    const prefixo = `${CACHE_PREFIX}:${owner || 'anon'}:`;
    const chaves = (await apiCache.keys()).filter((chave) => chave.startsWith(prefixo));
    if (chaves.length === 0) return 0;

    const entradas = [];
    for (const chave of chaves) {
        const entrada = await apiCache.getItem(chave);
        entradas.push({ chave, updatedAt: Number(entrada?.updatedAt || 0) });
    }

    entradas.sort((a, b) => a.updatedAt - b.updatedAt);
    const remover = entradas.slice(0, Math.max(1, Math.ceil(chaves.length * 0.25)));

    for (const entrada of remover) {
        await apiCache.removeItem(entrada.chave);
    }

    return remover.length;
}

export async function gravarCache(owner, url, params, dados, status = 200, headers = {}) {
    if (!owner) return null;

    const entrada = {
        owner,
        url,
        params: params || null,
        data: dados,
        status,
        headers,
        updatedAt: Date.now(),
        version: CACHE_VERSION
    };

    await apiCache.setItem(construirChaveCache(owner, url, params), entrada);

    gravacoesDesdePoda += 1;
    if (gravacoesDesdePoda >= PODA_INTERVALO) {
        gravacoesDesdePoda = 0;
        await podarCache(owner).catch(() => {});
    }

    return entrada;
}

export async function removerCache(owner, url, params) {
    if (!owner) return;
    await apiCache.removeItem(construirChaveCache(owner, url, params));
}

export async function listarCache(owner) {
    const prefixo = `${CACHE_PREFIX}:${owner || 'anon'}:`;
    const chaves = await apiCache.keys();
    const entradas = [];

    for (const chave of chaves) {
        if (!chave.startsWith(prefixo)) continue;
        const entrada = await apiCache.getItem(chave);
        if (entrada) entradas.push({ chave, ...entrada });
    }

    return entradas;
}

export async function atualizarEntradasCache(owner, transformar) {
    const entradas = await listarCache(owner);

    for (const entrada of entradas) {
        // Add version and timestamp for conflict resolution
        const entradaAtualizada = {
            ...entrada,
            __version: entrada.__version || CACHE_VERSION,
            __lastSyncAt: entrada.__lastSyncAt || Date.now(),
        };

        const transformado = transformar(entradaAtualizada);
        if (!transformado) continue;

        await apiCache.setItem(entrada.chave, {
            ...transformado,
            updatedAt: transformado.updatedAt || Date.now(),
            version: CACHE_VERSION,
            __offline: transformado.__offline !== undefined ? transformado.__offline : entrada.__offline,
        });
    }
}

export async function removerEntradasCache(owner, deveRemover) {
    const entradas = await listarCache(owner);

    for (const entrada of entradas) {
        if (deveRemover(entrada)) {
            await apiCache.removeItem(entrada.chave);
        }
    }
}

export async function limparCacheAutenticacao(owner) {
    if (!owner) return;

    // Ao terminar sessao (ou quando o servidor rejeita o cookie), os dados
    // locais desse utilizador deixam de ser restaurados. A fila de escritas
    // pendentes e o mapa de IDs temporarios ficam intactos para a fila poder
    // ser sincronizada no proximo login do mesmo utilizador.
    await removerEntradasCache(owner, () => true);
}

export async function guardarUtilizadorAutenticado(user) {
    if (!user?.id) return;

    const owner = String(user.id);
    await setOfflineOwner(owner);
    await gravarCache(owner, 'api/auth/me', null, { user }, 200, {});
}

export async function obterMapaIds(owner = ownerId) {
    if (!owner) return {};
    return (await metaStore.getItem(`idMap:${owner}`)) || {};
}

export async function gravarMapaIds(mapa, owner = ownerId) {
    if (!owner) return;
    await metaStore.setItem(`idMap:${owner}`, mapa || {});
}

export async function adicionarMapeamentoId(tempId, realId, owner = ownerId) {
    if (!owner || tempId === null || tempId === undefined || realId === null || realId === undefined) {
        return {};
    }

    const mapa = await obterMapaIds(owner);
    mapa[String(tempId)] = String(realId);
    await gravarMapaIds(mapa, owner);
    return mapa;
}

export async function marcarLogoutPendente(pendente) {
    if (pendente) {
        await metaStore.setItem('logoutPending', true);
    } else {
        await metaStore.removeItem('logoutPending');
    }
}

export async function logoutPendente() {
    return Boolean(await metaStore.getItem('logoutPending'));
}
