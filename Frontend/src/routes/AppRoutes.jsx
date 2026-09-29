import { Routes, Route, Navigate } from "react-router-dom";

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
import { RequireAuth, RequireRole, RedirectIfAuth } from "./RequireAuth.jsx"


export default function AppRoutes(){
    return(
        <Routes>
            {/* --- rotas publicas (so para quem nao esta logado) --- */}
            <Route path='/' element={<RedirectIfAuth><Home/></RedirectIfAuth>}/>
            <Route path="/login" element={<Navigate to="/" replace/>} />
            <Route path="/register" element={<RedirectIfAuth><Register/></RedirectIfAuth>} />
            <Route path="/forgotpass" element={<ForgotPass/>}/>

            {/* --- rotas autenticadas --- */}
            <Route path="/dashboard" element={<RequireAuth><DashBoard/></RequireAuth>} />
            <Route path="/clientes" element={<RequireAuth><Clientes/></RequireAuth>}/>
            <Route path="/novoAtendimento" element={<RequireAuth><NovoAtendimento/></RequireAuth>}/>
            <Route path="/servicos" element={<RequireAuth><Servico/></RequireAuth>}/>
            <Route path="/relatorio" element={<RequireAuth><Relatorio/></RequireAuth>}/>
            <Route path="/despesas" element={<RequireAuth><Despesas/></RequireAuth>}/>

            {/* --- restritas ao Administrador --- */}
            <Route path="/funcionarios" element={
                <RequireRole perfis={["Administrador"]}><Funcionarios/></RequireRole>
            }/>
        </Routes>
    )
}
