import { UserCircle, LogOut } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import ThemeToggle from "../ThemeToggle/ThemeToggle.jsx"
import { useAuthStore } from "../../store/authStore.js"
import './header.css'

function Headers({ title = "Faces System" }) {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const nome = user?.nome || "Visitante"
    const perfil = user?.perfil || (user ? "Sessão ativa" : "Sem sessão")
    const partesNome = nome.trim().split(/\s+/).filter(Boolean)
    const iniciais = (partesNome.length > 1
        ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`
        : partesNome[0]?.[0] || ""
    ).toUpperCase()

    async function handleLogout() {
        await logout()
        navigate("/", { replace: true })
    }

    return (
        <header className="app-header">
            <div className="app-header-title">
                <span className="app-header-accent" aria-hidden="true" />

                <div className="app-header-title-text">
                    <span className="app-header-kicker">Faces System</span>
                    <h1 title={title}>{title}</h1>
                </div>
            </div>

            <div className="app-header-user">
                <ThemeToggle />

                <Link
                    to="/perfil"
                    className="app-header-profile app-header-profile-link"
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
