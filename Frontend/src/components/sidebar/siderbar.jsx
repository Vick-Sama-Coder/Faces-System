import {
    LayoutDashboardIcon,
    Users,
    UserRound,
    ScissorsIcon,
    CalendarPlus,
    ChartNoAxesCombinedIcon,
    Receipt, } from "lucide-react"
import { Link } from "react-router-dom"
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
                <Link to="/dashboard" className="side-link">
                    <p className= "p">
                        <span className="block"></span>
                        <span className="icon"><LayoutDashboardIcon/></span>
                        <span className="info">DashBoard</span>
                    </p >
                </Link>
                <Link className="side-link" to='/novoAtendimento'>
                    <p className= "p">
                        <span className="icon"><CalendarPlus/></span>
                        <span className="info">Novo Atendimento</span>
                    </p>
                </Link>
                <Link className="side-link" to='/funcionarios'>
                    <p className= "p">
                        <span className="icon"><Users/></span>
                        <span className="info">Funcionarios</span>
                    </p >
                </Link>
                <Link className="side-link" to='/clientes'>
                    <p className= "p">
                        <span className="icon"><UserRound/></span>
                        <span className="info">Clientes</span>
                    </p>
                </Link>
                <Link className="side-link" to='/servicos'>
                    <p className= "p">
                        <span className="icon"><ScissorsIcon/></span>
                        <span className="info">Servicos</span>
                    </p>
                </Link>
                <Link className="side-link" to="/relatorio">
                    <p className= "p">
                        <span className="icon"><ChartNoAxesCombinedIcon/></span>
                        <span className="info">Relatorio</span>
                    </p>
                </Link>
                <Link className="side-link" to="/despesas">
                    <p className= "p">
                        <span className="icon"><Receipt/></span>
                        <span className="info">Despesas</span>
                    </p>
                </Link>
            </aside>
            <div></div>
        </>
    )
}
export default SideBar