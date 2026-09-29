import {
    LayoutDashboardIcon,
    Users,
    UserRound,
    UserCog,
    ScissorsIcon,
    CalendarPlus,
    ChartNoAxesCombinedIcon,
    Receipt,
    ShieldCheck,
    LogOut,
    X } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import Photo from '../../assets/logo/faces-logo.png'
import { useAuthStore } from '../../store/authStore.js'
import './sidebar.css'

//Seccoes da sidebar agrupadas: `perfis` define quem pode ver (vazio = todos)
const GRUPOS = [
    {
        titulo: "Operacao",
        itens: [
            { nome: "DashBoard",        path: "/",                    Icone: LayoutDashboardIcon, perfis: [] },
            { nome: "Novo Atendimento", path: "/novoAtendimento",     Icone: CalendarPlus,       perfis: [] },
            { nome: "Clientes",         path: "/clientes",            Icone: UserRound,          perfis: [] },
            { nome: "Servicos",         path: "/servicos",            Icone: ScissorsIcon,       perfis: [] },
        ]
    },
    {
        titulo: "Financeiro",
        itens: [
            { nome: "Relatorio",        path: "/relatorio",           Icone: ChartNoAxesCombinedIcon, perfis: [] },
            { nome: "Despesas",         path: "/despesas",            Icone: Receipt,             perfis: [] },
        ]
    },
    {
        titulo: "Administracao",
        itens: [
            { nome: "Funcionarios",           path: "/funcionarios",        Icone: Users,         perfis: ["Administrador"] },
            { nome: "Gestao de Utilizadores", path: "/gestao-utilizadores", Icone: UserCog,       perfis: ["Administrador"] },
            { nome: "Permissoes",             path: "/permissoes",          Icone: ShieldCheck,   perfis: ["Administrador"] },
        ]
    },
];

function SideBar({ isOpen, setIsOpen }){
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    function fechar(){
        if(setIsOpen) setIsOpen(false)
    }

    //filtra grupo a grupo: esconde itens e grupos vazios sem autorizacao
    const grupos = GRUPOS
        .map((g) => ({
            ...g,
            itens: g.itens.filter(
                (s) => s.perfis.length === 0 || (user && s.perfis.includes(user.perfil))
            )
        }))
        .filter((g) => g.itens.length > 0)

    async function handleLogout(){
        await logout()
        navigate("/login", { replace: true })
    }

    return(
            <>
            {isOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={fechar}
                />
            )}
            <aside className={`sidebar ${isOpen ? "open" : ""}`}>
                <button
                className="close-mobile"
                onClick={fechar}
                aria-label="Fechar menu"
            >
                <X size={24} />
            </button>
            <header className="sidebar-brand">
                    <h1 className="sidebar-title">
                        <span className="img"><img  className="logo" src={Photo} alt='Faces-logo' /></span>
                    </h1>
                </header>

                {grupos.map((grupo) => (
                    <nav key={grupo.titulo} className="sidebar-group" aria-label={grupo.titulo}>
                        <p className="sidebar-group-title">{grupo.titulo}</p>
                        {grupo.itens.map(({ nome, path, Icone }) => (
                            <NavLink
                                key={path}
                                to={path}
                                onClick={fechar}
                                className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
                            >
                                <p className="p">
                                    <span className="icon"><Icone/></span>
                                    <span className="info">{nome}</span>
                                </p>
                            </NavLink>
                        ))}
                    </nav>
                ))}

                <button className="side-link logout-btn" onClick={handleLogout} aria-label="Sair da conta">
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