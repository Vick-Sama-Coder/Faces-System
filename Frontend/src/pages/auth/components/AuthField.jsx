import { useId } from "react"

/*
 * Campo base dos formularios de autenticacao.
 * O erro e ligado ao input por aria-describedby e aria-invalid para que
 * leitores de ecra anunciem a mensagem correta.
 */
function AuthField({
    id,
    label,
    icon,
    error,
    hint,
    trailing,
    className = "",
    ...inputProps
}) {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-erro`
    const hintId = `${inputId}-ajuda`
    const describedBy = error
        ? errorId
        : hint
            ? hintId
            : undefined

    const controlClassName = [
        "auth-field-control",
        icon ? "has-icon" : "",
        trailing ? "has-trailing" : "",
        error ? "has-error" : ""
    ].filter(Boolean).join(" ")

    return (
        <div className={`auth-field ${className}`.trim()}>
            <label className="auth-field-label" htmlFor={inputId}>
                {label}
            </label>

            <div className={controlClassName}>
                {icon && (
                    <span className="auth-field-icon" aria-hidden="true">
                        {icon}
                    </span>
                )}

                <input
                    id={inputId}
                    className="auth-field-input"
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={describedBy}
                    {...inputProps}
                />

                {trailing && (
                    <span className="auth-field-action">
                        {trailing}
                    </span>
                )}
            </div>

            {hint && !error && (
                <p className="auth-field-hint" id={hintId}>
                    {hint}
                </p>
            )}

            {error && (
                <p className="auth-field-error" id={errorId} role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}

export default AuthField
