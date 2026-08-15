import { Routes, Route } from "react-router-dom";

import Home from '../pages/home.jsx'
import Register from "../pages/auth/Resgister/SignUp.jsx";
import ForgotPass from "../pages/auth/ForgotPassword/forgotPass.jsx";
import DashBoard from "../pages/dashboard/dashboard.jsx";


export default function AppRoutes(){
    return(
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path="/register" element={<Register/>} />
            <Route path="/forgotpass" element={<ForgotPass/>}/><Route path="/dashboard" element={<DashBoard/>} />
        </Routes>
    )
}
