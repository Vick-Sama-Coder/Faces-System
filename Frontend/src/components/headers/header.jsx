import { MenuIcon, UserCircle, Bell, LogOut } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import ThemeToggle from "../ThemeToggle/ThemeToggle.jsx"
import { useAuthStore } from "../../store/authStore.js"
import './header.css'

function Headers({heady, title, h1Class, menuClass, userClass, bellClass, pClass, onMenuClick}){
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const nome = user?.nome || "Visitante"
    const perfil = user?.perfil || (user ? "Sessão ativa" : "Sem sessão")
    const partesNome = nome.trim().split(/\s+/).filter(Boolean)
    const iniciais = (partesNome.length > 1
        ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`
        : partesNome[0]?.[0] || ""
    ).toUpperCase()

    async function handleLogout(){
        await logout()
        navigate("/", { replace: true })
    }

    return(
        <header className={`app-header ${heady || ""}`}>
            <div className={`app-header-title ${h1Class || ""}`} id="asided">
                <button
                    type="button"
                    className={`app-header-menu ${menuClass || ""}`}
                    onClick={onMenuClick}
                    aria-label="Abrir menu de navegação"
                    title="Abrir menu"
                >
                    <MenuIcon size={20} strokeWidth={2.2} />
                </button>

                <span className="app-header-accent" aria-hidden="true" />

                <div className="app-header-title-text">
                    <span className="app-header-kicker">Faces System</span>
                    <h1 title={title}>{title}</h1>
                </div>
            </div>

            <div className={`app-header-user ${userClass || ""}`}>
                <ThemeToggle />

                <span className={`app-header-bell ${bellClass || ""}`} aria-hidden="true">
                    <Bell size={18} />
                </span>

                <span className="app-header-divider" aria-hidden="true" />

                <Link
                    to="/perfil"
                    className={`app-header-profile app-header-profile-link ${pClass || ""}`}
                    aria-label={`Abrir o perfil de ${nome}`}
                    title="O Meu Perfil"
                >
                    <span className="app-header-avatar" aria-hidden="true">
                        {iniciais || <UserCircle size={20} />}
                    </span>
                    <span className="app-header-identity">
                        <strong className="app-header-name" title={nome}>{nome}</strong>
                        <span className="app-header-role">{perfil}</span>
                    </span>
                </Link>

                <button
                    type="button"
                    className="app-header-logout logout-icon"
                    onClick={handleLogout}
                    aria-label="Terminar sessão"
                    title="Terminar sessão"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    )
}
export default Headers
