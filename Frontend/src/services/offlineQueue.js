import {
    CACHE_VERSION,
    apiCache,
    getOfflineOwner,
    listarCache,
    metaStore,
    queueStore
} from './offlineDb.js';
import {
    entidadeOtimista,
    gerarIdTemporario,
    normalizarCaminho,
    obterIdAlvo,
    obterOperacao,
    obterRecurso,
    parseCorpo,
    respostaOtimista,
    substituirIds
} from './offlineUtils.js';

let cadeia = Promise.resolve();

function comBloqueio(tarefa) {
    const proxima = cadeia.then(tarefa, tarefa);
    cadeia = proxima.catch(() => {});
    return proxima;
}

function chaveFila(ownerId) {
    return `queue:${ownerId}`;
}

function notificarAlteracao() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('faces:offline-queue-changed'));
    }
}

export async function lerFila(ownerId) {
    if (!ownerId) return [];
    return (await queueStore.getItem(chaveFila(ownerId))) || [];
}

async function gravarFila(ownerId, fila) {
    if (!ownerId) return;
    await queueStore.setItem(chaveFila(ownerId), fila);
    notificarAlteracao();
}

function colecaoDaMutacao(path, operacao, recurso) {
    if (operacao !== 'create') return null;
    if (/\/(?:modalidades|aplicacoes|horarios)$/.test(path)) return path;
    if (/^api\/(?:estoque\/)?(?:entrada|saida|ajuste)$/.test(path)) return 'api/movimentos';
    return `api/${recurso}`;
}

function filhosTemporarios(entidade, path) {
    if (path !== 'api/atendimentos' || !Array.isArray(entidade?.servicos)) return [];
    return entidade.servicos.map((servico, indice) => ({
        tempId: servico.id,
        indice,
        servicoId: servico.servico_id
    }));
}

export async function criarItemFila({ ownerId, config, idempotencyKey }) {
    const url = normalizarCaminho(config.url);
    const method = String(config.method || 'POST').toUpperCase();
    const operacao = obterOperacao(method, url);
    const recurso = obterRecurso(url);
    const corpo = parseCorpo(config.data);
    const tempId = operacao === 'create' ? gerarIdTemporario() : null;
    const targetId = operacao === 'create' ? tempId : obterIdAlvo(url);
    const entidade = operacao === 'create'
        ? entidadeOtimista({ ...config, url }, tempId)
        : respostaOtimista({ ...config, url }, tempId, operacao);

    return {
        id: idempotencyKey,
        ownerId: String(ownerId),
        method,
        url,
        params: config.params || null,
        data: corpo,
        corpo,
        operacao,
        recurso,
        targetId,
        tempId,
        temporarios: filhosTemporarios(entidade, url),
        entidade,
        colecao: colecaoDaMutacao(url, operacao, recurso),
        idempotencyKey,
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

export async function adicionarItemFila(item) {
    return comBloqueio(async () => {
        const fila = await lerFila(item.ownerId);
        fila.push(item);
        await gravarFila(item.ownerId, fila);
        return item;
    });
}

export async function atualizarItemFila(ownerId, itemId, alteracoes) {
    return comBloqueio(async () => {
        const fila = await lerFila(ownerId);
        const indice = fila.findIndex((item) => item.id === itemId);
        if (indice === -1) return null;

        fila[indice] = {
            ...fila[indice],
            ...alteracoes,
            updatedAt: Date.now()
        };
        await gravarFila(ownerId, fila);
        return fila[indice];
    });
}

export async function substituirReferenciasTemporarias(ownerId, mapa) {
    if (!mapa || Object.keys(mapa).length === 0) return;

    return comBloqueio(async () => {
        const fila = await lerFila(ownerId);
        const atualizada = fila.map((item) => ({
            ...item,
            url: substituirIds(item.url, mapa),
            params: substituirIds(item.params, mapa),
            data: substituirIds(item.data, mapa),
            corpo: substituirIds(item.corpo, mapa),
            targetId: substituirIds(item.targetId, mapa),
            entidade: substituirIds(item.entidade, mapa)
        }));
        await gravarFila(ownerId, atualizada);
    });
}

export async function removerItemFila(ownerId, itemId) {
    return comBloqueio(async () => {
        const fila = await lerFila(ownerId);
        const atualizada = fila.filter((item) => item.id !== itemId);
        await gravarFila(ownerId, atualizada);
        return atualizada;
    });
}

export async function removerFalhados(ownerId) {
    return comBloqueio(async () => {
        const fila = await lerFila(ownerId);
        const atualizada = fila.filter((item) => item.status !== 'failed');
        await gravarFila(ownerId, atualizada);
        return atualizada;
    });
}

export async function reporFalhados(ownerId) {
    return comBloqueio(async () => {
        const fila = await lerFila(ownerId);
        const atualizada = fila.map((item) => (
            item.status === 'failed'
                ? { ...item, status: 'pending', lastError: null, attempts: 0, updatedAt: Date.now() }
                : item
        ));
        await gravarFila(ownerId, atualizada);
        return atualizada;
    });
}

export async function estatisticasFila(ownerId) {
    const fila = await lerFila(ownerId);
    return {
        total: fila.length,
        pending: fila.filter((item) => item.status !== 'failed').length,
        failed: fila.filter((item) => item.status === 'failed').length
    };
}

export async function limparFila(ownerId) {
    if (!ownerId) return;
    await queueStore.removeItem(chaveFila(ownerId));
    notificarAlteracao();
}

// Função para exportar dados de backup
export async function exportarDadosBackup(ownerId) {
    const owner = ownerId || getOfflineOwner();
    if (!owner) return { fila: [], cache: [], meta: {} };

    const [fila, cache, meta] = await Promise.all([
        lerFila(owner),
        listarCache(owner),
        metaStore.getAll()
    ]);

    return { fila, cache, meta };
}

// Função para importar dados de backup
export async function importarDadosBackup(backup, ownerId) {
    const owner = ownerId || getOfflineOwner();
    if (!owner) return false;

    try {
        // Importar fila
        if (backup.fila && backup.fila.length > 0) {
            await gravarFila(owner, backup.fila);
        }

        // Importar cache
        if (backup.cache && backup.cache.length > 0) {
            await apiCache.clear();
            for (const entrada of backup.cache) {
                const chave = entrada.chave || `faces.api.v1:${owner}:${entrada.url}`;
                await apiCache.setItem(chave, {
                    ...entrada,
                    updatedAt: entrada.updatedAt || Date.now(),
                    version: CACHE_VERSION
                });
            }
        }

        // Importar meta
        if (backup.meta) {
            await metaStore.setItem('lastOwner', backup.meta.lastOwner);
            if (backup.meta.cacheVersion) {
                await metaStore.setItem('cacheVersion', backup.meta.cacheVersion);
            }
        }

        return true;
    } catch (error) {
        console.error('[offline] Backup import failed:', error);
        return false;
    }
}

