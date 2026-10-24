import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { useRegisterSW } from "virtual:pwa-register/react"
import "./PWAUpdatePrompt.css"

function PWAUpdatePrompt() {
    const [updating, setUpdating] = useState(false)

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        immediate: true,
        onRegisterError(error) {
            console.error("Erro ao registar o service worker:", error)
        },
    })

    async function handleUpdate() {
        setUpdating(true)

        try {
            await updateServiceWorker(true)
        } catch (error) {
            console.error("Erro ao atualizar a aplicação:", error)
            setUpdating(false)
        }
    }

    if (!needRefresh) return null

    return (
        <aside
            className="pwa-update"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-labelledby="pwa-update-title"
            aria-describedby="pwa-update-description"
        >
            <span className="pwa-update-icon" aria-hidden="true">
                <RefreshCw
                    size={20}
                    className={updating ? "pwa-update-spin" : ""}
                />
            </span>

            <div className="pwa-update-copy">
                <h2 id="pwa-update-title">Nova versão disponível</h2>
                <p id="pwa-update-description">
                    Atualize para usar a versão mais recente do Faces System.
                </p>
            </div>

            <div className="pwa-update-actions">
                <button
                    type="button"
                    className="pwa-update-btn ghost"
                    onClick={() => setNeedRefresh(false)}
                    disabled={updating}
                >
                    Mais tarde
                </button>

                <button
                    type="button"
                    className="pwa-update-btn primary"
                    onClick={handleUpdate}
                    disabled={updating}
                >
                    {updating ? "A atualizar..." : "Atualizar agora"}
                </button>
            </div>
        </aside>
    )
}

export default PWAUpdatePrompt
