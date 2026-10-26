import { CircleAlert, CircleCheckBig, Info } from "lucide-react"

const ICONES = {
    error: CircleAlert,
    success: CircleCheckBig,
    info: Info
}

function AuthAlert({ type = "error", children, className = "" }) {
    const Icone = ICONES[type] || Info
    const ehErro = type === "error"

    return (
        <div
            className={`auth-alert auth-alert-${type} ${className}`.trim()}
            role={ehErro ? "alert" : "status"}
            aria-live={ehErro ? undefined : "polite"}
        >
            <Icone size={18} aria-hidden="true" />
            <div className="auth-alert-content">
                {children}
            </div>
        </div>
    )
}

export default AuthAlert
