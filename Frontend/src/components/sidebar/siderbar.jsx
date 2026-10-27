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
    UserCircle,
    X,
    LogsIcon
} from "lucide-react"
import { NavLink, useNavigate } from "react-router"
import Photo from '../../assets/logo/faces-logo.png'
import { useAuthStore } from '../../store/authStore.js';
import './sidebar.css'

//Seccoes da sidebar agrupadas: `perfis` define quem pode ver (vazio = todos)
//`permissoes` define quais permissoes serao necessarias para ver o modulo (opcional)
const GRUPOS = [
    {
        titulo: "Operacao",
        itens: [
            { nome: "DashBoard",        path: "/dashboard",            Icone: LayoutDashboardIcon, perfis: [], permissoes: [], title: "DashBoard" },
            { nome: "Novo Atendimento", path: "/novoAtendimento",     Icone: CalendarPlus,       perfis: [], permissoes: [], title: "Novo Atendimento" },
            { nome: "Clientes",         path: "/clientes",            Icone: UserRound,          perfis: [], permissoes: ["clientes:escrever"], title: "Clientes" },
            { nome: "Servicos",         path: "/servicos",            Icone: ScissorsIcon,       perfis: [], permissoes: ["servicos:escrever"], title: "Servicos" },
            { nome: "Categorias",      path: "/categorias",          Icone: Tag,       perfis: [], permissoes: ["servicos:escrever"], title: "Categorias"},
        ]
    },
    {
        titulo: "Financeiro",
        itens: [
            { nome: "Relatorio",        path: "/relatorio",           Icone: ChartNoAxesCombinedIcon, perfis: [], permissoes: [], title: "Relatorio" },
            { nome: "Despesas",         path: "/despesas",            Icone: Receipt,             perfis: [], permissoes: ["despesas:escrever"], title: "Despesas" },
        ]
    },
    {
        titulo: "Administracao",
        itens: [
            { nome: "Funcionarios",           path: "/funcionarios",        Icone: Users,  perfis: [], permissoes: ["funcionarios:escrever"], title: "Funcionarios"        },
            { nome: "Gestao de Utilizadores", path: "/gestao-utilizadores", Icone: UserCog,       perfis: [], permissoes: ["contas:gerir"], title: "Gestao de Utilizadores" },
            { nome: "Permissoes",             path: "/permissoes",          Icone: ShieldCheck,   perfis: [], permissoes: ["contas:gerir"], title: "Permissoes" },
            { nome: "Horários",                    path: "/horarios",                  Icone: CalendarPlus,  perfis: [], permissoes: ["horarios:gerir"], title: "Horários" },
            { nome: "Logs",             path: "/logs",          Icone: LogsIcon,   perfis: [], permissoes: ["auditoria:ler"], title: "logs" }
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
    //Verifica permissao por perfil (perfis) ou por permissao especifica (permissoes)
    const grupos = GRUPOS
        .map((g) => ({
            ...g,
            itens: g.itens.filter(
                (s) => s.perfis.length === 0 || s.perfis.includes(user?.perfil) || (s.permissoes && user?.permissoes && s.permissoes.some((p) => user.permissoes.includes(p)))
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

                <NavLink
                    to="/perfil"
                    onClick={fechar}
                    className={({ isActive }) => `side-link sidebar-account-link${isActive ? " active" : ""}`}
                    aria-label="Abrir o meu perfil"
                >
                    <span className="p" title="O Meu Perfil">
                        <span className="icon"><UserCircle /></span>
                        <span className="info">O Meu Perfil</span>
                    </span>
                </NavLink>

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