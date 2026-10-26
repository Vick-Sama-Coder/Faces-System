import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import AuthField from "./AuthField.jsx"

function PasswordField({
    id,
    label,
    hint,
    error,
    disabled = false,
    ...inputProps
}) {
    const [visivel, setVisivel] = useState(false)

    return (
        <AuthField
            id={id}
            label={label}
            hint={hint}
            error={error}
            disabled={disabled}
            icon={<Lock size={18} />}
            type={visivel ? "text" : "password"}
            trailing={
                <button
                    type="button"
                    className="auth-field-toggle"
                    onClick={() => setVisivel((valor) => !valor)}
                    aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={visivel}
                    disabled={disabled}
                >
                    {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            }
            {...inputProps}
        />
    )
}

export default PasswordField
