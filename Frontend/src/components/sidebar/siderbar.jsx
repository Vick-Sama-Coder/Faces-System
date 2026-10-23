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
    Tags,
    ScrollText,
    LogOut,
    X } from "lucide-react"
import { NavLink, useNavigate } from "react-router"
import Photo from '../../assets/logo/faces-logo.png'
import { useAuthStore } from '../../store/authStore.js';
import './sidebar.css'

//Seccoes da sidebar agrupadas: `permissoes` define quem pode ver (vazio = todos)
const GRUPOS = [
    {
        titulo: "Operacao",
        itens: [
            { nome: "DashBoard",        path: "/",                    Icone: LayoutDashboardIcon, permissoes: [] },
            { nome: "Novo Atendimento", path: "/novoAtendimento",     Icone: CalendarPlus,       permissoes: ["atendimentos:escrever"] },
            { nome: "Clientes",         path: "/clientes",            Icone: UserRound,          permissoes: ["clientes:ler", "clientes:escrever"] },
            { nome: "Servicos",         path: "/servicos",            Icone: ScissorsIcon,       permissoes: ["servicos:ler", "servicos:escrever"] },
            { nome: "Categorias",       path: "/categorias",          Icone: Tags,               permissoes: ["servicos:escrever"] },
        ]
    },
    {
        titulo: "Financeiro",
        itens: [
            { nome: "Relatorio",        path: "/relatorio",           Icone: ChartNoAxesCombinedIcon, permissoes: ["relatorios:ler"] },
            { nome: "Despesas",         path: "/despesas",            Icone: Receipt,             permissoes: ["despesas:escrever"] },
        ]
    },
    {
        titulo: "Administracao",
        itens: [
            { nome: "Funcionarios",           path: "/funcionarios",        Icone: Users,         permissoes: ["funcionarios:ler", "funcionarios:escrever"] },
            { nome: "Gestao de Utilizadores", path: "/gestao-utilizadores", Icone: UserCog,       permissoes: ["contas:gerir"] },
            { nome: "Permissoes",             path: "/permissoes",          Icone: ShieldCheck,   permissoes: ["contas:gerir"] },
            { nome: "Logs",                   path: "/logs",                Icone: ScrollText,    permissoes: ["auditoria:ler"] },
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
    const permissoes = user?.permissoes || []

    const grupos = GRUPOS
        .map((g) => ({
            ...g,
            itens: g.itens.filter(
                (s) => s.permissoes.length === 0
                    || s.permissoes.some((codigo) => permissoes.includes(codigo))
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
                        <span className="img"><img className="logo" src={Photo} alt="Faces-logo" loading="lazy" /></span>
                    </h1>
                </header>

                {grupos.map((grupo) => (
                    <nav key={grupo.titulo} className="sidebar-group" aria-label={grupo.titulo}>
                        <span className="sidebar-group-title">{grupo.titulo}</span>
                        {grupo.itens.map(({ nome, path, Icone }) => (
                            <NavLink
                                key={path}
                                to={path}
                                onClick={fechar}
                                title={nome}
                                aria-label={nome}
                                className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
                            >
                                <span className="p">
                                    <span className="icon"><Icone/></span>
                                    <span className="info">{nome}</span>
                                </span>
                            </NavLink>
                        ))}
                    </nav>
                ))}

                <button className="side-link logout-btn" onClick={handleLogout} aria-label="Sair da conta">
                    <span className="p">
                        <span className="icon"><LogOut/></span>
                        <span className="info">Sair</span>
                    </span>
                </button>

            </aside>
            </>
    )
}
export default SideBar
