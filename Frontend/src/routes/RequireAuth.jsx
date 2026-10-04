import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

//Enquanto nao se confere a sessao (/me), mostra o ecra de espera
function Waiting(){
    return (
        <section className="container">
            <p className="text">A verificar sessao...</p>
        </section>
    );
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
        return <Waiting/>;
    }

    if(!user){
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
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
        return <Waiting/>;
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
        return <Waiting/>;
    }

    if(user){
        return <Navigate to="/" replace/>;
    }

    return children;
}
