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
    Tag,
    X } from "lucide-react"
import { NavLink, useNavigate } from "react-router"
import Photo from '../../assets/logo/faces-logo.png'
import { useAuthStore } from '../../store/authStore.js';
import './sidebar.css'

//Seccoes da sidebar agrupadas: `perfis` define quem pode ver (vazio = todos)
const GRUPOS = [
    {
        titulo: "Operacao",
        itens: [
            { nome: "DashBoard",        path: "/",                    Icone: LayoutDashboardIcon, perfis: [], title: "DashBoard" },
            { nome: "Novo Atendimento", path: "/novoAtendimento",     Icone: CalendarPlus,       perfis: [], title: "Novo Atendimento" },
            { nome: "Clientes",         path: "/clientes",            Icone: UserRound,          perfis: [], title: "Clientes" },
            { nome: "Servicos",         path: "/servicos",            Icone: ScissorsIcon,       perfis: [], title: "Servicos" },
            { nome : "Categorias",      path: "/categorias",          Icone: Tag,       perfis:[],   title: "Categorias"},
        ]
    },
    {
        titulo: "Financeiro",
        itens: [
            { nome: "Relatorio",        path: "/relatorio",           Icone: ChartNoAxesCombinedIcon, perfis: [], title: "Relatorio" },
            { nome: "Despesas",         path: "/despesas",            Icone: Receipt,             perfis: [], title: "Despesas" },
        ]
    },
    {
        titulo: "Administracao",
        itens: [
            { nome: "Funcionarios",           path: "/funcionarios",        Icone: Users,  perfis: [], title: "Funcionarios"        },
            { nome: "Gestao de Utilizadores", path: "/gestao-utilizadores", Icone: UserCog,       perfis: [], title: "Gestao de Utilizadores" },
            { nome: "Permissoes",             path: "/permissoes",          Icone: ShieldCheck,   perfis: [], title: "Permissoes" },
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
                (s) => s.perfis.length === 0 || s.perfis.includes(user?.perfil)
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
                {/* <Link to="/dashboard" className="side-link">
                    <p title="Dashboard" className= "p">
                        <span className="block"></span>
                        <span className="icon"><LayoutDashboardIcon/></span>
                        <span className="info">DashBoard</span>
                    </p >
                </Link>
                <Link className="side-link" to='/novoAtendimento'>
                    <p title="Novo Atendimento" className= "p">
                        <span className="icon"><CalendarPlus/></span>
                        <span className="info">Novo Atendimento</span>
                    </p>
                </Link>
                <Link className="side-link" to='/funcionarios'>
                    <p title="Funcionarios" className= "p">
                        <span className="icon"><Users/></span>
                        <span className="info">Funcionarios</span>
                    </p >
                </Link>
                <Link className="side-link" to='/clientes'>
                    <p title="Clientes" className= "p">
                        <span className="icon"><UserRound/></span>
                        <span className="info">Clientes</span>
                    </p>
                </Link>
                <Link className="side-link" to='/servicos'>
                    <p title="Servicos" className= "p">
                        <span className="icon"><ScissorsIcon/></span>
                        <span className="info">Servicos</span>
                    </p>
                </Link>
                <Link className="side-link" to="/relatorio">
                    <p title="Relatorios" className= "p">
                        <span className="icon"><ChartNoAxesCombinedIcon/></span>
                        <span className="info">Relatorio</span>
                    </p>
                </Link>
                <Link className="side-link" to="/despesas">
                    <p title="Despesas" className= "p">
                        <span className="icon"><Receipt/></span>
                        <span className="info">Despesas</span>
                    </p>
                </Link>
                <Link className="side-link" to="/despesas">
                    <p className= "p">
                        <span className="icon"><Receipt/></span>
                        <span className="info">Despesas</span>
                    </p>
                </Link>
                                <Link className="side-link" to="/despesas">
                    <p className= "p">
                        <span className="icon"><Receipt/></span>
                        <span className="info">Despesas</span>
                    </p>
                </Link>
                                <Link className="side-link" to="/despesas">
                    <p className= "p">
                        <span className="icon"><Receipt/></span>
                        <span className="info">Despesas</span>
                    </p>
                </Link> */}

{grupos.map((grupo) => (
    <nav
        key={grupo.titulo}
        className="sidebar-group"
        aria-label={grupo.titulo}
    >
        <span className="sidebar-group-title">
            {grupo.titulo}
        </span>

        {grupo.itens.map(({ nome, path, Icone, title }) => (
            <NavLink
                key={path}
                to={path}
                onClick={fechar}
                className={({ isActive }) =>
                    `side-link${isActive ? " active" : ""}`
                }
            >
                <span className="p" title={title}>
                    <span className="icon">
                        <Icone />
                    </span>

                    <span className="info">
                        {nome}
                    </span>
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