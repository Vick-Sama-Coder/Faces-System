import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import AuthLoading from '../pages/auth/AuthLoading.jsx';

//Exige sessao activa — redireciona para /login se nao houver
export function RequireAuth({ children }){
    const { user, initialized, checkAuth } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        if(!initialized){
            checkAuth();
        }
    }, [initialized, checkAuth]);

    if(!initialized){
        return <AuthLoading/>;
    }

    if(!user){
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    }

    return children;
}

//Exige pelo menos uma das permissoes indicadas — ex.: <RequirePermission permissoes={["clientes:ler"]}>
export function RequirePermission({ children, permissoes }){
    const { user, initialized, checkAuth } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        if(!initialized){
            checkAuth();
        }
    }, [initialized, checkAuth]);

    if(!initialized){
        return <AuthLoading/>;
    }

    if(!user){
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    }

    const efetivas = user.permissoes || [];

    if(permissoes && permissoes.length > 0 && !permissoes.some((codigo) => efetivas.includes(codigo))){
        return <Navigate to="/" replace/>;
    }

    return children;
}

//Exige um perfil especifico — ex.: <RequireRole perfis={["Administrador"]}>
export function RequireRole({ children, perfis }){
    const { user, initialized, checkAuth } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        if(!initialized){
            checkAuth();
        }
    }, [initialized, checkAuth]);

    if(!initialized){
        return <AuthLoading/>;
    }

    if(!user){
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    }

    if(perfis && !perfis.includes(user.perfil)){
        //sem autorizacao: volta ao dashboard (index, rota acessivel a todos)
        return <Navigate to="/" replace/>;
    }

    return children;
}

//Para rotas publicas (/login, /register) — ja logado vai directo ao dashboard (index)
export function RedirectIfAuth({ children }){
    const { user, initialized, checkAuth } = useAuthStore();

    useEffect(() => {
        if(!initialized){
            checkAuth();
        }
    }, [initialized, checkAuth]);

    if(!initialized){
        return <AuthLoading/>;
    }

    if(user){
        return <Navigate to="/" replace/>;
    }

    return children;
}
