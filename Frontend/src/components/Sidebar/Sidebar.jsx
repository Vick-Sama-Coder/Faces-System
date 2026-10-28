import { useCallback, useEffect, useMemo, useRef } from "react"
import { NavLink, useNavigate } from "react-router"
import { LogOut, UserCircle, X } from "lucide-react"
import Photo from "../../assets/logo/faces-logo.png"
import { useAuthStore } from "../../store/authStore.js"
import { useMediaQuery } from "../../hooks/useMediaQuery.js"
import { getVisibleGroups } from "./navigation.js"
import "./sidebar.css"

const MOBILE_QUERY = "(max-width: 677px)"
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container) {
    if (!container) return []

    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getClientRects().length > 0
    )
}

function SidebarLink({ to, icon: Icon, label, onNavigate }) {
    return (
        <NavLink
            to={to}
            onClick={onNavigate}
            title={label}
            className={({ isActive }) =>
                `sidebar__link${isActive ? " is-active" : ""}`
            }
        >
            <span className="sidebar__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
            </span>
            <span className="sidebar__label">{label}</span>
        </NavLink>
    )
}

function Sidebar({ isOpen = false, setIsOpen }) {
    const user = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)
    const navigate = useNavigate()
    const isMobile = useMediaQuery(MOBILE_QUERY)
    const sidebarRef = useRef(null)
    const closeButtonRef = useRef(null)

    const grupos = useMemo(() => getVisibleGroups(user), [user])

    const close = useCallback(() => {
        if (setIsOpen) setIsOpen(false)
    }, [setIsOpen])

    // Ao abrir em mobile, move o foco para o botao de fechar e devolve-o
    // ao elemento anterior quando o drawer fecha.
    useEffect(() => {
        if (!isOpen || !isMobile) return undefined

        const previousFocus = document.activeElement
        closeButtonRef.current?.focus()

        return () => {
            if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
                previousFocus.focus()
            }
        }
    }, [isOpen, isMobile])

    // Evita que a pagina por tras do drawer continue a rolar.
    useEffect(() => {
        if (!isOpen || !isMobile) return undefined

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen, isMobile])

    // Escape fecha o menu; Tab fica preso dentro do drawer enquanto aberto.
    useEffect(() => {
        if (!isOpen) return undefined

        function handleKeyDown(event) {
            if (event.key === "Escape" && isMobile) {
                event.preventDefault()
                close()
                return
            }

            if (event.key !== "Tab" || !isMobile) return

            const focusable = getFocusableElements(sidebarRef.current)
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, isMobile, close])

    async function handleLogout() {
        try {
            await logout()
        } finally {
            // Mesmo que o pedido falhe, a sessao local ja foi limpa no store.
            close()
            navigate("/login", { replace: true })
        }
    }

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    onClick={close}
                    aria-label="Fechar menu"
                    tabIndex={-1}
                />
            )}

            <aside
                id="app-sidebar"
                ref={sidebarRef}
                className={`sidebar${isOpen ? " sidebar--open" : ""}`}
                aria-label="Navegação principal"
                inert={isMobile && !isOpen ? true : undefined}
            >
                <div className="sidebar__top">
                    <NavLink
                        to="/dashboard"
                        className="sidebar__brand"
                        onClick={close}
                        aria-label="Faces System — Dashboard"
                    >
                        <img
                            className="sidebar__logo"
                            src={Photo}
                            alt="Faces System"
                            width="96"
                            height="96"
                        />
                    </NavLink>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="sidebar__close"
                        onClick={close}
                        aria-label="Fechar menu"
                    >
                        <X size={22} aria-hidden="true" />
                    </button>
                </div>

                <nav className="sidebar__nav" aria-label="Módulos">
                    {grupos.map((grupo) => (
                        <div key={grupo.id} className="sidebar__group">
                            <h2
                                id={`sidebar-group-${grupo.id}`}
                                className="sidebar__group-title"
                            >
                                {grupo.title}
                            </h2>

                            <ul
                                className="sidebar__list"
                                aria-labelledby={`sidebar-group-${grupo.id}`}
                            >
                                {grupo.items.map((item) => (
                                    <li key={item.to}>
                                        <SidebarLink
                                            to={item.to}
                                            icon={item.icon}
                                            label={item.label}
                                            onNavigate={close}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <SidebarLink
                        to="/perfil"
                        icon={UserCircle}
                        label="O Meu Perfil"
                        onNavigate={close}
                    />

                    <button
                        type="button"
                        className="sidebar__link sidebar__link--danger"
                        onClick={handleLogout}
                        title="Terminar sessão"
                    >
                        <span className="sidebar__icon" aria-hidden="true">
                            <LogOut size={18} strokeWidth={2} />
                        </span>
                        <span className="sidebar__label">Sair</span>
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar
