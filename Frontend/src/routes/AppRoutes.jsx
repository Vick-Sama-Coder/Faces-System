import { Routes, Route } from "react-router";

import Home from '../pages/home.jsx'
import Register from "../pages/auth/Resgister/SignUp.jsx";
import FirstAccess from "../pages/auth/FirstAccess/FirstAccess.jsx";
import DashBoard from "../pages/dashboard/dashboard.jsx";
import Clientes from "../pages/clientes/clientes.jsx";
import Despesas from "../pages/despesas/despesas.jsx"
import Funcionarios from "../pages/funcionarios/funcionarios.jsx"
import NovoAtendimento from "../pages/novoAtendimento/novoAtendimento.jsx"
import Relatorio from "../pages/relatorio/relatorio.jsx"
import Servico from "../pages/servicos/servicos.jsx"
import Categorias from "../pages/categorias/categorias.jsx"
import Logs from "../pages/logs/logs.jsx"
import GestaoUtilizadores from "../pages/admin/GestaoUtilizadores.jsx"
import Permissoes from "../pages/admin/Permissoes.jsx"
import Perfil from "../pages/perfil/Perfil.jsx"
import HorarioPage from "../pages/horario/HorarioPage.jsx"
import { RequireAuth, RequirePermission, RequireSession, RedirectIfAuth } from "./RequireAuth.jsx"


export default function AppRoutes(){
    return(
        <Routes>
            {/* --- dashboard e o index: rota protegida por sessao --- */}
            <Route path='/' element={<RequireAuth><DashBoard/></RequireAuth>}/>

            {/* --- conta do utilizador autenticado --- */}
            <Route path="/perfil" element={<RequireAuth><Perfil/></RequireAuth>}/>

            {/* --- primeiro acesso: sessao iniciada, mas senha padrao por trocar --- */}
            <Route path="/primeiro-acesso" element={<RequireSession><FirstAccess/></RequireSession>}/>

            {/* --- rotas publicas de auth --- */}
            <Route path="/login" element={<RedirectIfAuth><Home/></RedirectIfAuth>}/>
            <Route path="/register" element={<RedirectIfAuth><Register/></RedirectIfAuth>} />

            {/* --- rotas de operacao: exigem a permissao correspondente --- */}
            <Route path="/clientes" element={
                <RequirePermission permissoes={["clientes:ler", "clientes:escrever"]}><Clientes/></RequirePermission>
            }/>
            <Route path="/novoAtendimento" element={
                <RequirePermission permissoes={["atendimentos:escrever"]}><NovoAtendimento/></RequirePermission>
            }/>
            <Route path="/servicos" element={
                <RequirePermission permissoes={["servicos:ler", "servicos:escrever"]}><Servico/></RequirePermission>
            }/>
            <Route path="/categorias" element={
                <RequirePermission permissoes={["servicos:escrever"]}><Categorias/></RequirePermission>
            }/>
            <Route path="/relatorio" element={
                <RequirePermission permissoes={["relatorios:ler"]}><Relatorio/></RequirePermission>
            }/>
            <Route path="/despesas" element={
                <RequirePermission permissoes={["despesas:escrever"]}><Despesas/></RequirePermission>
            }/>

            {/* --- administracao: permissao de gestao de contas --- */}
            <Route path="/funcionarios" element={
                <RequirePermission permissoes={["funcionarios:ler", "funcionarios:escrever"]}><Funcionarios/></RequirePermission>
            }/>
            <Route path="/gestao-utilizadores" element={
                <RequirePermission permissoes={["contas:gerir"]}><GestaoUtilizadores/></RequirePermission>
            }/>
            <Route path="/permissoes" element={
                <RequirePermission permissoes={["contas:gerir"]}><Permissoes/></RequirePermission>
            }/>
            <Route path="/logs" element={
                <RequirePermission permissoes={["auditoria:ler"]}><Logs/></RequirePermission>
            }/>
            <Route path="/horarios" element={
                <RequirePermission permissoes={["assiduidade:gerir"]}><HorarioPage/></RequirePermission>
            }/>
            <Route path="*" element={<h1>Not Found</h1>}/>
        </Routes>
    )
}
