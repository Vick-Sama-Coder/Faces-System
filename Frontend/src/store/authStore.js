import { create } from 'zustand';
import { loginUser, registerUser, getMe, logoutUser, getApiError } from '../services/api.js';

export const useAuthStore = create((set) => ({
    user: null,
    loading: false,
    initialized: false,
    error: null,

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
        set({ loading: true, error: null });
        try{
            const res = await loginUser(data);
            set({ user: res.data.user, loading: false, error: null });
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err) });
            return false;
        }
    },

    register: async (data) => {
        set({ loading: true, error: null });
        try{
            const res = await registerUser(data);
            set({ user: res.data.user, loading: false, error: null });
            return true;
        }catch(err){
            set({ loading: false, error: getApiError(err) });
            return false;
        }
    },

    logout: async () => {
        try{
            await logoutUser();
        }finally{
            set({ user: null, error: null });
        }
    },

    clearError: () => set({ error: null }),
}));
