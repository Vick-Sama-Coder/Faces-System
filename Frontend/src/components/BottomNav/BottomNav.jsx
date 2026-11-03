import { NavLink, useLocation } from "react-router-dom"
import {
    CalendarPlus,
    LayoutDashboard,
    MoreHorizontal,
    Receipt,
    UserRound
} from "lucide-react"
import { useAuthStore } from "../../store/authStore.js"
import { canAccessItem } from "../Sidebar/navigation.js"
import "./bottomNav.css"

const PRIMARY_ITEMS = [
    {
        to: "/dashboard",
        label: "Início",
        icon: LayoutDashboard
    },
    {
        to: "/novoAtendimento",
        label: "Atender",
        icon: CalendarPlus,
        permissions: ["atendimentos:escrever"]
    },
    {
        to: "/clientes",
        label: "Clientes",
        icon: UserRound,
        permissions: ["clientes:ler", "clientes:escrever"]
    },
    {
        to: "/caixa",
        label: "Caixa",
        icon: Receipt,
        permissions: ["caixa:operar", "caixa:levantar", "caixa:fechar", "relatorios:ler"]
    }
]

export default function BottomNav({ onMore, menuOpen = false }) {
    const user = useAuthStore((state) => state.user)
    const { pathname } = useLocation()
    const normalizedPath = pathname.replace(/\/+$/, "") || "/"
    const items = PRIMARY_ITEMS.filter((item) => canAccessItem(user, item))
    const onPrimaryRoute = items.some((item) => item.to === normalizedPath)
    const moreActive = menuOpen || !onPrimaryRoute

    return (
        <nav className="bottom-nav" aria-label="Navegação rápida">
            {items.map((item) => {
                const Icon = item.icon

                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `bottom-nav__item${isActive ? " is-active" : ""}`
                        }
                    >
                        <Icon size={20} strokeWidth={2} aria-hidden="true" />
                        <span>{item.label}</span>
                    </NavLink>
                )
            })}

            <button
                type="button"
                className={`bottom-nav__item${moreActive ? " is-active" : ""}`}
                onClick={onMore}
                aria-label="Abrir todos os módulos"
                aria-controls="app-sidebar"
                aria-expanded={menuOpen}
            >
                <MoreHorizontal size={20} strokeWidth={2} aria-hidden="true" />
                <span>Mais</span>
            </button>
        </nav>
    )
}
