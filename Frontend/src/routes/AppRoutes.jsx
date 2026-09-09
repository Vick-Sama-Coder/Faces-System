import { Routes, Route } from "react-router-dom";

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


export default function AppRoutes(){
    return(
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path="/register" element={<Register/>} />
            <Route path="/forgotpass" element={<ForgotPass/>}/><Route path="/dashboard" element={<DashBoard/>} />
            <Route path="/clientes" element={<Clientes/>}/>
            <Route path="/despesas" element={<Despesas/>}/>
            <Route path="/funcionarios" element={<Funcionarios/>}/>
            <Route path="/novoAtendimento" element={<NovoAtendimento/>}/>
            <Route path="/relatorio" element={<Relatorio/>}/>
            <Route path="/servicos" element={<Servico/>}/>
        </Routes>
    )
}
