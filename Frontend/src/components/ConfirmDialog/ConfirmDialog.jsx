import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"
import "./ConfirmDialog.css"

function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "danger",
    icon: Icon = AlertTriangle,
    withReason = false,
    reasonLabel = "Motivo",
    reasonPlaceholder = "Descreva o motivo desta ação...",
    reasonRequired = true,
    loading = false,
    onConfirm,
    onClose
}) {
    const [reason, setReason] = useState("")

    useEffect(() => {
        if (!open) return undefined

        function fecharComEscape(event) {
            if (event.key === "Escape" && !loading) onClose?.()
        }

        window.addEventListener("keydown", fecharComEscape)
        return () => window.removeEventListener("keydown", fecharComEscape)
    }, [open, loading, onClose])

    if (!open) return null

    const motivoInvalido = withReason && reasonRequired && !reason.trim()

    return (
        <div className="faces-confirm-backdrop" onClick={() => !loading && onClose?.()}>
            <section
                className={`faces-confirm tone-${tone}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="faces-confirm-title"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="faces-confirm-close"
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Fechar"
                >
                    <X size={18} />
                </button>

                <div className="faces-confirm-head">
                    <span className="faces-confirm-icon">
                        <Icon size={22} />
                    </span>
                    <div>
                        <h2 id="faces-confirm-title">{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                </div>

                {withReason && (
                    <label className="faces-confirm-field">
                        <span>{reasonLabel}</span>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={reasonPlaceholder}
                            rows={3}
                            autoFocus
                            disabled={loading}
                        />
                    </label>
                )}

                <div className="faces-confirm-actions">
                    <button
                        type="button"
                        className="faces-confirm-btn ghost"
                        onClick={onClose}
                        disabled={loading}
                        autoFocus={!withReason}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="faces-confirm-btn solid"
                        onClick={() => onConfirm?.(reason.trim())}
                        disabled={loading || motivoInvalido}
                    >
                        {loading && <Loader2 size={15} className="faces-confirm-spinner" />}
                        {loading ? "A processar..." : confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    )
}

export default ConfirmDialog
