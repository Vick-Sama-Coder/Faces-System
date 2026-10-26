import { Loader2 } from "lucide-react"

function AuthButton({
    children,
    loading = false,
    loadingText,
    type = "submit",
    className = "",
    disabled = false,
    ...rest
}) {
    return (
        <button
            type={type}
            className={`auth-button ${className}`.trim()}
            disabled={disabled || loading}
            aria-busy={loading ? "true" : undefined}
            {...rest}
        >
            {loading && (
                <Loader2
                    className="auth-spinner"
                    size={18}
                    aria-hidden="true"
                />
            )}
            <span>{loading ? (loadingText || children) : children}</span>
        </button>
    )
}

export default AuthButton
