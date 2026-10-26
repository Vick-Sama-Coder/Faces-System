import { Loader2 } from "lucide-react"
import "./auth.css"

function AuthLoading() {
    return (
        <div className="auth-loading" role="status" aria-live="polite">
            <Loader2 className="auth-spinner" size={30} aria-hidden="true" />
            <p>A verificar sessão...</p>
        </div>
    )
}

export default AuthLoading
