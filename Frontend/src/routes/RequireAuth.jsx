import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import AuthLoading from '../pages/auth/AuthLoading.jsx';

//contas com a senha padrao (primeiro acesso) tem de definir uma nova senha
function precisaDefinirSenha(user){
    return Boolean(user?.deve_alterar_senha || user?.alteracao_obrigatoria_senha);
}

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

    if(precisaDefinirSenha(user)){
        return <Navigate to="/primeiro-acesso" replace/>;
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

    if(precisaDefinirSenha(user)){
        return <Navigate to="/primeiro-acesso" replace/>;
    }

    const efetivas = user.permissoes || [];

    if(permissoes && permissoes.length > 0 && !permissoes.some((codigo) => efetivas.includes(codigo))){
        return <Navigate to="/dashboard" replace/>;
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

    if(precisaDefinirSenha(user)){
        return <Navigate to="/primeiro-acesso" replace/>;
    }

    if(perfis && !perfis.includes(user.perfil)){
        //sem autorizacao: volta ao dashboard (rota acessivel a qualquer sessao)
        return <Navigate to="/dashboard" replace/>;
    }

    return children;
}

//Para rotas publicas de auth (/login, /register) — ja logado vai directo ao painel
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
        return <Navigate to={precisaDefinirSenha(user) ? "/primeiro-acesso" : "/dashboard"} replace/>;
    }

    return children;
}

//Exige apenas sessao activa (usado pela pagina de primeiro acesso)
export function RequireSession({ children }){
    const { user, initialized, checkAuth } = useAuthStore();

    useEffect(() => {
        if(!initialized){
            checkAuth();
        }
    }, [initialized, checkAuth]);

    if(!initialized){
        return <AuthLoading/>;
    }

    if(!user){
        return <Navigate to="/login" replace/>;
    }

    return children;
}
