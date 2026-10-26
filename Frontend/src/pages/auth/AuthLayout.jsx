import { ArrowLeft, CalendarDays, Users, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import Logo from "../../components/Logo/logo.jsx"
import "./auth.css"

const FEATURES = [
    { icon: CalendarDays, label: "Agenda e atendimentos" },
    { icon: Users, label: "Clientes e fidelização" },
    { icon: Wallet, label: "Financeiro e relatórios" }
]

/*
 * Moldura visual partilhada pelo login, registo e primeiro acesso.
 * A logica dos formularios fica nas paginas; aqui vive apenas a estrutura.
 */
function AuthLayout({
    eyebrow,
    title,
    subtitle,
    headerExtra,
    children,
    footer
}) {
    return (
        <main className="auth-page">
            <aside className="auth-brand">
                <span className="auth-brand-orb auth-brand-orb-one" aria-hidden="true" />
                <span className="auth-brand-orb auth-brand-orb-two" aria-hidden="true" />

                <div className="auth-brand-content">
                    <div className="auth-brand-logo">
                        <Logo />
                    </div>

                    <p className="auth-brand-kicker">Gestão de salão</p>
                    <p className="auth-brand-title">
                        O seu salão,
                        <span>em ordem.</span>
                    </p>
                    <p className="auth-brand-text">
                        Atendimentos, clientes, equipa e financeiro num único painel,
                        pensado para o dia a dia do seu salão.
                    </p>

                    <ul className="auth-brand-features">
                        {FEATURES.map(({ icon: Icone, label }) => (
                            <li key={label}>
                                <span className="auth-brand-feature-icon" aria-hidden="true">
                                    <Icone size={15} />
                                </span>
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="auth-brand-foot">
                    Faces System <span>·</span> {new Date().getFullYear()}
                </p>
            </aside>

            <section className="auth-panel" aria-labelledby="auth-title">
                <Link to="/" className="auth-back-link">
                    <ArrowLeft size={15} aria-hidden="true" />
                    Voltar ao catálogo
                </Link>

                <div className="auth-card">
                    <header className="auth-card-header">
                        {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
                        <h1 className="auth-title" id="auth-title">{title}</h1>
                        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                        {headerExtra && (
                            <div className="auth-header-extra">
                                {headerExtra}
                            </div>
                        )}
                    </header>

                    {children}

                    {footer && (
                        <footer className="auth-card-footer">
                            {footer}
                        </footer>
                    )}
                </div>
            </section>
        </main>
    )
}

export default AuthLayout
