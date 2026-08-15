import {
    LayoutDashboardIcon,
    Users,
    UserRound,
    ScissorsIcon,
    CalendarPlus,
    ChartNoAxesCombinedIcon,
    Receipt, } from "lucide-react"

import Photo from '../../assets/logo/faces-logo.png'
import './sidebar.css'

function SideBar(){
    return(
        <>
            <aside className='sidebar'>
                <header>
                    <h1>
                        <span className="img"><img  className="logo" src={Photo} alt='Faces-logo' /></span>
                    </h1>
                </header>
                <p className= "p">
                    <span className="block"></span>
                    <span className="icon"><LayoutDashboardIcon/></span>
                    <span className="info">DashBoard</span>
                </p >
                <p className= "p">
                    <span className="icon"><CalendarPlus/></span>
                    <span className="info">Novo Atendimento</span>
                </p>
                <p className= "p">
                    <span className="icon"><Users/></span>
                    <span className="info">Funcionarios</span>
                </p >
                <p className= "p">
                    <span className="icon"><UserRound/></span>
                    <span className="info">Clientes</span>
                </p>
                <p className= "p">
                    <span className="icon"><ScissorsIcon/></span>
                    <span className="info">Servicos</span>
                </p>
                <p className= "p">
                    <span className="icon"><ChartNoAxesCombinedIcon/></span>
                    <span className="info">Relatorio</span>
                </p>
                <p className= "p">
                    <span className="icon"><Receipt/></span>
                    <span className="info">Despesas</span>
                </p>
            </aside>
            <div></div>
        </>
    )
}
export default SideBar