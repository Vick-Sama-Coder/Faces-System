import { create } from 'zustand';
import { loginUser, registerUser, setFirstAccessPassword, getMe, logoutUser, getApiError, getApiErrorField } from '../services/api.js';
import { cancelarPrefetchOffline, limparPreparacaoOffline } from '../services/offlinePrefetch.js';
import { iniciarSessaoOffline } from '../services/offline.js';
import { useOfflineStore } from './offlineStore.js';
import {
    getLastOwner,
    guardarUtilizadorAutenticado,
    limparCacheAutenticacao,
    logoutPendente,
    marcarLogoutPendente,
    setOfflineOwner
} from '../services/offlineDb.js';

function estaOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

let checkAuthEmCurso = null;

export const useAuthStore = create((set, get) => ({
    user: null,
    loading: false,
    initialized: false,
    error: null,
    errorField: null,   //campo associado ao ultimo erro do backend
    sucesso: null,      //mensagem de sucesso (ex.: registo feito)

    //verifica a sessao existente no arranque da app (cookie httpOnly)
    checkAuth: async () => {
        // O App e os guards de rota podem pedir a verificacao na mesma
        // renderizacao inicial. Partilha-se a mesma promessa para nao
        // multiplicar pedidos a /api/auth/me.
        if (get().initialized) return;
        if (checkAuthEmCurso) return checkAuthEmCurso;

        checkAuthEmCurso = (async () => {
            // O armazenamento offline e opcional: uma falha do IndexedDB (modo
            // privado, quota, webview restrita) nunca pode impedir o arranque.
            let pendente = false;
            try {
                pendente = await logoutPendente();
            } catch {
                // Sem armazenamento local: assume que nao ha logout pendente.
            }

            // Se o utilizador terminou sessao sem rede, nao restauramos a sessao
            // antiga. Quando houver ligacao, o logout e concluido no servidor.
            if (pendente) {
                let logoutConcluido = false;

                if (!estaOffline()) {
                    try {
                        await logoutUser();
                        logoutConcluido = true;
                    } catch (err) {
                        // 401 significa que o cookie ja nao e valido.
                        if (err?.response?.status === 401) logoutConcluido = true;
                        // Outros erros: tentamos novamente no proximo arranque
                        // sem restaurar a sessao local.
                    }
                }

                if (logoutConcluido) await marcarLogoutPendente(false).catch(() => {});
                await setOfflineOwner(null).catch(() => {});
                await useOfflineStore.getState().atualizar().catch(() => {});
                set({ user: null, initialized: true });
                return;
            }

            try{
                const res = await getMe();
                const user = res.data.user;
                // Define o dono do cache (em memoria, de forma sincrona) antes de
                // a UI montar as paginas, para que as primeiras leituras ja sejam
                // guardadas no utilizador certo.
                setOfflineOwner(user.id).catch(() => {});
                set({ user, initialized: true });
                await iniciarSessaoOffline(user.id).catch(() => {});
                await guardarUtilizadorAutenticado(user).catch(() => {});
            }catch(err){
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    const owner = await getLastOwner().catch(() => null);
                    // Invalida o dono antes de limpar: impede que uma resposta
                    // atrasada volte a gravar cache depois da limpeza.
                    await setOfflineOwner(null).catch(() => {});
                    if (owner) {
                        await limparCacheAutenticacao(owner).catch(() => {});
                        limparPreparacaoOffline(owner);
                    }
                    await useOfflineStore.getState().atualizar().catch(() => {});
                }
                set({ user: null, initialized: true });
            }
        })();

        try {
            return await checkAuthEmCurso;
        } finally {
            checkAuthEmCurso = null;
        }
    },

    login: async (data) => {
        set({ loading: true, error: null, errorField: null, sucesso: null });
        try{
            const res = await loginUser(data);
            const user = res.data.user;
            setOfflineOwner(user.id).catch(() => {});
            set({ user, loading: false, error: null, errorField: null });
            await marcarLogoutPendente(false).catch(() => {});
            await iniciarSessaoOffline(user.id).catch(() => {});
            await guardarUtilizadorAutenticado(user).catch(() => {});
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return false;
        }
    },

    //cria a conta com a senha padrao 12345.
    //NAO inicia sessao: devolve os dados, incluindo a senha padrao a mostrar
    register: async (data) => {
        set({ loading: true, error: null, errorField: null });
        try{
            const res = await registerUser(data);
            set({ loading: false, error: null, errorField: null });
            return { ok: true, data: res.data };
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return { ok: false, data: null };
        }
    },

    //primeiro acesso: define a nova senha obrigatoria (sessao ja iniciada no login)
    definirSenhaPrimeiroAcesso: async (data) => {
        set({ loading: true, error: null, errorField: null });
        try{
            const res = await setFirstAccessPassword(data);
            const user = res.data.user;
            set({ user, loading: false, error: null, errorField: null });
            await guardarUtilizadorAutenticado(user).catch(() => {});
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return false;
        }
    },

    logout: async () => {
        cancelarPrefetchOffline();
        const owner = useAuthStore.getState().user?.id;

        try{
            await logoutUser();
            await marcarLogoutPendente(false).catch(() => {});
        }catch(err){
            // Sem rede ou com falha do servidor, a sessao local termina
            // imediatamente e o logout fica pendente para a proxima ligacao.
            // Um 401 significa que o cookie ja nao era valido.
            if (err?.response?.status !== 401) {
                await marcarLogoutPendente(true).catch(() => {});
            }
        }finally{
            // Invalida o dono antes de limpar: impede que uma resposta
            // atrasada (por exemplo, do prefetch) reponha a cache antiga.
            await setOfflineOwner(null).catch(() => {});
            if (owner) {
                await limparCacheAutenticacao(owner).catch(() => {});
                limparPreparacaoOffline(owner);
            }
            await useOfflineStore.getState().atualizar().catch(() => {});
            set({ user: null, error: null, errorField: null });
        }
    },

    //actualiza os dados do utilizador em memoria e no cache offline
    //(ex.: apos editar o perfil)
    updateUser: (dados) => set((state) => {
        const user = state.user ? { ...state.user, ...dados } : state.user;
        if (user?.id) {
            guardarUtilizadorAutenticado(user).catch(() => {});
        }
        return { user };
    }),

    clearError: () => set({ error: null, errorField: null }),
    clearSucesso: () => set({ sucesso: null }),
}));
