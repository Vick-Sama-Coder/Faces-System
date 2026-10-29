import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react"
import { useAuthStore } from "../../store/authStore.js"
import { useOfflineStore } from "../../store/offlineStore.js"
import {
    lerPreparacaoOffline,
    prefetchOfflineData
} from "../../services/offlinePrefetch.js"
import "./OfflinePreparation.css"

function formatarData(valor) {
    if (!valor) return ""

    try {
        return new Date(valor).toLocaleString("pt-PT", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        })
    } catch {
        return ""
    }
}

function calcularPercentagem(progresso) {
    if (!progresso?.total) return 0
    return Math.min(100, Math.round((progresso.concluidos / progresso.total) * 100))
}

function OfflinePreparationConteudo({ user, userId, online }) {
    const [preparando, setPreparando] = useState(false)
    const [progresso, setProgresso] = useState(null)
    const [erro, setErro] = useState(null)
    const [preparado, setPreparado] = useState(() => lerPreparacaoOffline(userId))

    useEffect(() => {
        function aoPreparar(evento) {
            if (String(evento.detail?.userId) !== userId) return
            setPreparado(evento.detail)
            setErro(null)
        }

        window.addEventListener("faces:offline-prepared", aoPreparar)
        return () => window.removeEventListener("faces:offline-prepared", aoPreparar)
    }, [userId])

    const preparar = useCallback(async () => {
        if (preparando) return

        if (!online || (typeof navigator !== "undefined" && navigator.onLine === false)) {
            setErro("Ligue-se à internet para preparar os dados offline.")
            return
        }

        setPreparando(true)
        setErro(null)
        setProgresso({ fase: "essencial", concluidos: 0, total: 0 })

        try {
            const resultado = await prefetchOfflineData(user, {
                force: true,
                onProgress: setProgresso
            })

            if (resultado?.cancelado) {
                setErro("A preparação foi interrompida. Pode tentar novamente.")
            } else if (!resultado?.sucessos) {
                setErro("Não foi possível preparar os dados. Verifique a ligação.")
            } else {
                const atual = lerPreparacaoOffline(userId)
                if (atual) setPreparado(atual)
            }
        } catch {
            setErro("Não foi possível preparar os dados offline.")
        } finally {
            setPreparando(false)
            setProgresso(null)
        }
    }, [user, userId, online, preparando])

    const percentagem = calcularPercentagem(progresso)
    const fase = progresso?.fase === "detalhe"
        ? "A preparar detalhes"
        : "A preparar dados"
    const rotulo = preparando
        ? `${fase}…`
        : preparado
            ? "Offline pronto"
            : "Preparar offline"
    const titulo = preparado
        ? `Última preparação: ${formatarData(preparado.at)}`
        : "Guardar os dados essenciais neste dispositivo"

    return (
        <div className={`sidebar__offline${preparado ? " is-ready" : ""}`}>
            <button
                type="button"
                className="sidebar__link sidebar__link--offline"
                onClick={preparar}
                disabled={preparando || !online}
                title={titulo}
                aria-label={titulo}
                aria-busy={preparando ? "true" : undefined}
            >
                <span className="sidebar__icon" aria-hidden="true">
                    {preparando
                        ? <Loader2 size={18} className="sidebar__spin" />
                        : preparado
                            ? <CheckCircle2 size={18} />
                            : <Download size={18} />}
                </span>
                <span className="sidebar__label">{rotulo}</span>
                {preparado && !preparando && (
                    <RefreshCw size={13} className="sidebar__offline-refresh" aria-hidden="true" />
                )}
            </button>

            {preparando && (
                <div
                    className="sidebar__offline-progress"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={percentagem}
                    aria-label={fase}
                >
                    <span
                        className="sidebar__offline-progress-bar"
                        style={{ width: `${percentagem}%` }}
                    />
                </div>
            )}

            {!preparando && preparado && (
                <span className="sidebar__offline-hint" aria-live="polite">
                    {formatarData(preparado.at)}
                </span>
            )}

            {!preparando && !preparado && !online && (
                <span className="sidebar__offline-hint">
                    Sem ligação à internet
                </span>
            )}

            {!preparando && erro && (
                <span className="sidebar__offline-error" role="alert">
                    {erro}
                </span>
            )}
        </div>
    )
}

function OfflinePreparation() {
    const user = useAuthStore((state) => state.user)
    const online = useOfflineStore((state) => state.online)

    if (!user?.id) return null

    return (
        <OfflinePreparationConteudo
            key={String(user.id)}
            user={user}
            userId={String(user.id)}
            online={online}
        />
    )
}

export default OfflinePreparation
