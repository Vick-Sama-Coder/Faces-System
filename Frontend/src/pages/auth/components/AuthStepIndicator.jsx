import { Check } from "lucide-react"

function AuthStepIndicator({ steps = [], current = 1 }) {
    return (
        <ol className="auth-steps" aria-label="Progresso da recuperação de senha">
            {steps.map((label, index) => {
                const numero = index + 1
                const estado = numero < current
                    ? "done"
                    : numero === current
                        ? "active"
                        : "todo"

                return (
                    <li
                        key={label}
                        className={`auth-step auth-step-${estado}`}
                        aria-current={estado === "active" ? "step" : undefined}
                    >
                        <span className="auth-step-dot" aria-hidden="true">
                            {estado === "done" ? <Check size={13} /> : numero}
                        </span>
                        <span className="auth-step-label">{label}</span>
                    </li>
                )
            })}
        </ol>
    )
}

export default AuthStepIndicator
