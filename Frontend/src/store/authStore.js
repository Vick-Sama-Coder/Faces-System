import { create } from 'zustand';
import { loginUser, registerUser, setFirstAccessPassword, getMe, logoutUser, getApiError, getApiErrorField } from '../services/api.js';

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
            set({ user: res.data.user, loading: false, error: null, errorField: null });
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

    //actualiza apenas os dados do utilizador em memoria (ex.: apos editar o perfil)
    updateUser: (dados) => set((state) => ({
        user: state.user ? { ...state.user, ...dados } : state.user
    })),

    clearError: () => set({ error: null, errorField: null }),
    clearSucesso: () => set({ sucesso: null }),
}));
