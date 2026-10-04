import { Routes, Route } from "react-router";

import Home from '../pages/home.jsx'
import Register from "../pages/auth/Resgister/SignUp.jsx";
import ForgotPass from "../pages/auth/ForgotPassword/forgotPass.jsx";
import DashBoard from "../pages/dashboard/dashboard.jsx";
import Clientes from "../pages/clientes/clientes.jsx";
import Despesas from "../pages/despesas/despesas.jsx"
import Funcionarios from "../pages/funcionarios/funcionarios.jsx"
import NovoAtendimento from "../pages/novoAtendimento/novoAtendimento.jsx"
import Relatorio from "../pages/relatorio/relatorio.jsx"
import Servico from "../pages/servicos/servicos.jsx"
import GestaoUtilizadores from "../pages/admin/GestaoUtilizadores.jsx"
import Permissoes from "../pages/admin/Permissoes.jsx"
import { RequireAuth, RequireRole, RedirectIfAuth } from "./RequireAuth.jsx"


export default function AppRoutes(){
    return(
        <Routes>
            {/* --- dashboard e o index: unica rota protegida por sessao --- */}
            <Route path='/' element={<RequireAuth><DashBoard/></RequireAuth>}/>

            {/* --- rotas publicas de auth --- */}
            <Route path="/login" element={<RedirectIfAuth><Home/></RedirectIfAuth>}/>
            <Route path="/register" element={<RedirectIfAuth><Register/></RedirectIfAuth>} />
            <Route path="/forgotpass" element={<ForgotPass/>}/>

            {/* --- rotas de operacao (publicas, sem protecao de rota) --- */}
            <Route path="/clientes" element={<Clientes/>}/>
            <Route path="/novoAtendimento" element={<NovoAtendimento/>}/>
            <Route path="/servicos" element={<Servico/>}/>
            <Route path="/relatorio" element={<Relatorio/>}/>
            <Route path="/despesas" element={<Despesas/>}/>

            {/* --- reservadas ao Administrador --- */}
            <Route path="/funcionarios" element={
                <RequireRole perfis={["Administrador"]}><Funcionarios/></RequireRole>
            }/>
            <Route path="/gestao-utilizadores" element={
                <RequireRole perfis={["Administrador"]}><GestaoUtilizadores/></RequireRole>
            }/>
            <Route path="/permissoes" element={
                <RequireRole perfis={["Administrador"]}><Permissoes/></RequireRole>
            }/>
        </Routes>
    )
}
