import {
    LayoutDashboardIcon,
    Users,
    UserRound,
    ScissorsIcon,
    CalendarPlus,
    ChartNoAxesCombinedIcon,
    Receipt,
    LogOut,
    X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import Photo from '../../assets/logo/faces-logo.png'
import { useAuthStore } from '../../store/authStore.js'
import './sidebar.css'

//Seccoes da sidebar: `perfis` define quem pode ver (vazio = todos)
const SECOES = [
    { nome: "DashBoard",       path: "/dashboard",         Icone: LayoutDashboardIcon,       perfis: [] },
    { nome: "Novo Atendimento",path: "/novoAtendimento",   Icone: CalendarPlus,             perfis: [] },
    { nome: "Clientes",        path: "/clientes",          Icone: UserRound,                perfis: [] },
    { nome: "Servicos",        path: "/servicos",          Icone: ScissorsIcon,             perfis: [] },
    { nome: "Funcionarios",    path: "/funcionarios",      Icone: Users,                    perfis: ["Administrador"] },
    { nome: "Relatorio",       path: "/relatorio",         Icone: ChartNoAxesCombinedIcon,  perfis: [] },
    { nome: "Despesas",        path: "/despesas",          Icone: Receipt,                  perfis: [] },
];

function SideBar({ isOpen, setIsOpen }){
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    //so mostra as seccoes autorizadas ao perfil do utilizador
    const seccoes = SECOES.filter(
        (s) => s.perfis.length === 0 || (user && s.perfis.includes(user.perfil))
    )

    async function handleLogout(){
        await logout()
        navigate("/", { replace: true })
    }

    return(
            <>
            {isOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsOpen && setIsOpen(false)}
                />
            )}
            <aside className={`sidebar ${isOpen ? "open" : ""}`}>
                <button
                className="close-mobile"
                onClick={() => setIsOpen && setIsOpen(false)}
            >
                <X size={24} />
            </button>
            <header>
                    <h1>
                        <span className="img"><img  className="logo" src={Photo} alt='Faces-logo' /></span>
                    </h1>
                </header>

                {seccoes.map(({ nome, path, Icone }) => (
                    <Link key={path} className="side-link" to={path} onClick={() => setIsOpen && setIsOpen(false)}>
                        <p className="p">
                            <span className="icon"><Icone/></span>
                            <span className="info">{nome}</span>
                        </p>
                    </Link>
                ))}

                <button className="side-link logout-btn" onClick={handleLogout}>
                    <p className="p">
                        <span className="icon"><LogOut/></span>
                        <span className="info">Sair</span>
                    </p>
                </button>
            </aside>
            </>
    )
}
export default SideBar