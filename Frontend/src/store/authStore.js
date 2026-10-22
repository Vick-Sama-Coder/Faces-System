import { create } from 'zustand';
import { loginUser, registerUser, requestPasswordReset, resetPassword, getMe, logoutUser, getApiError, getApiErrorField } from '../services/api.js';

export const useAuthStore = create((set) => ({
    user: null,
    loading: false,
    initialized: false,
    error: null,
    errorField: null,   //campo associado ao ultimo erro do backend
    sucesso: null,      //mensagem de sucesso (ex.: registo feito)

    //verifica a sessao existente no arranque da app (cookie httpOnly)
    checkAuth: async () => {
        try{
            const res = await getMe();
            set({ user: res.data.user, initialized: true });
        }catch{
            set({ user: null, initialized: true });
        }
    },

    login: async (data) => {
        set({ loading: true, error: null, errorField: null, sucesso: null });
        try{
            const res = await loginUser(data);
            set({ user: res.data.user, loading: false, error: null, errorField: null });
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return false;
        }
    },

    //cria a conta mas NAO inicia sessao — a autenticacao e feita no /login
    register: async (data) => {
        set({ loading: true, error: null, errorField: null });
        try{
            await registerUser(data);
            set({ loading: false, error: null, errorField: null });
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return false;
        }
    },

    logout: async () => {
        try{
            await logoutUser();
        }finally{
            set({ user: null, error: null, errorField: null });
        }
    },

    //recuperacao de senha (passo 1): pede o codigo por SMS; devolve { ok, codigo }
    //(o codigo so vem preenchido em desenvolvimento, para testes sem SMS real)
    recuperarSenha: async (data) => {
        set({ loading: true, error: null, errorField: null });
        try{
            const res = await requestPasswordReset(data);
            set({ loading: false, error: null, errorField: null });
            return { ok: true, codigo: res.data?.codigo || null };
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return { ok: false, codigo: null };
        }
    },

    //recuperacao de senha (passo 2): valida o codigo e define a nova senha
    redefinirSenha: async (data) => {
        set({ loading: true, error: null, errorField: null });
        try{
            await resetPassword(data);
            set({ loading: false, error: null, errorField: null });
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err), errorField: getApiErrorField(err) });
            return false;
        }
    },

    clearError: () => set({ error: null, errorField: null }),
    clearSucesso: () => set({ sucesso: null }),
}));
