import { create } from 'zustand';
import { estatisticasFila, removerFalhados, reporFalhados } from '../services/offlineQueue.js';
import { getLastOwner, getOfflineOwner } from '../services/offlineDb.js';

async function ownerAtual() {
    return getOfflineOwner() || await getLastOwner();
}

export const useOfflineStore = create((set, get) => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    ready: false,
    pending: 0,
    failed: 0,
    syncing: false,
    lastSyncAt: null,
    lastError: null,

    setOnline: (online) => set({ online: Boolean(online) }),
    setSyncing: (syncing) => set({ syncing: Boolean(syncing) }),
    setSyncResult: ({ lastError = null, lastSyncAt = null } = {}) => set((estado) => ({
        lastError,
        lastSyncAt: lastSyncAt ?? estado.lastSyncAt
    })),

    atualizar: async () => {
        const owner = await ownerAtual();
        const estatisticas = await estatisticasFila(owner);
        set({
            pending: estatisticas.pending,
            failed: estatisticas.failed,
            ready: true
        });
        return estatisticas;
    },

    tentarNovamente: async () => {
        const owner = await ownerAtual();
        await reporFalhados(owner);
        await get().atualizar();
    },

    descartarFalhadas: async () => {
        const owner = await ownerAtual();
        await removerFalhados(owner);
        await get().atualizar();
    }
}));
