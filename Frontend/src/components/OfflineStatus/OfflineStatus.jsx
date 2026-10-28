import { useEffect, useState } from "react"
import {
    AlertTriangle,
    CloudOff,
    RefreshCw,
    Trash2,
    WifiOff,
    X
} from "lucide-react"
import { flushOfflineQueue } from "../../services/offline.js"
import { useOfflineStore } from "../../store/offlineStore.js"
import "./OfflineStatus.css"

function formatarHora(valor) {
    if (!valor) return ""
    try {
        return new Date(valor).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit"
        })
    } catch {
        return ""
    }
}

function OfflineStatus() {
    const [detalhesAbertos, setDetalhesAbertos] = useState(false)
    const {
        online,
        pending,
        failed,
        syncing,
        lastSyncAt,
        lastError,
        atualizar,
        tentarNovamente,
        descartarFalhadas
    } = useOfflineStore()

    useEffect(() => {
        atualizar().catch(() => {})
    }, [atualizar])

    const temAlgo = !online || pending > 0 || failed > 0 || syncing
    if (!temAlgo) return null

    async function sincronizarAgora() {
        setDetalhesAbertos(false)
        try {
            await flushOfflineQueue()
        } catch {
            // O erro fica refletido no estado da fila.
        }
        await atualizar().catch(() => {})
    }

    async function repetirFalhadas() {
        await tentarNovamente().catch(() => {})
        await sincronizarAgora()
    }

    async function descartar() {
        const confirmar = window.confirm(
            "Descartar as alteracoes que falharam? Esta acao nao pode ser revertida."
        )
        if (!confirmar) return
        await descartarFalhadas().catch(() => {})
        setDetalhesAbertos(false)

        // Recarrega para que os dados reais do servidor substituam qualquer
        // atualizacao otimista que tenha ficado no cache.
        if (online) window.location.reload()
    }

    const estado = !online
        ? "offline"
        : failed > 0
            ? "error"
            : syncing
                ? "syncing"
                : "pending"

    return (
        <>
            <aside
                className={`offline-status offline-status--${estado}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
            >
                <span className="offline-status-icon" aria-hidden="true">
                    {!online ? <WifiOff size={18} /> : null}
                    {online && failed > 0 ? <AlertTriangle size={18} /> : null}
                    {online && failed === 0 && syncing ? (
                        <RefreshCw size={18} className="offline-status-spin" />
                    ) : null}
                    {online && failed === 0 && !syncing ? <CloudOff size={18} /> : null}
                </span>

                <div className="offline-status-copy">
                    <strong>
                        {!online && "Modo offline"}
                        {online && failed > 0 && "Alteracoes com erro"}
                        {online && failed === 0 && syncing && "A sincronizar..."}
                        {online && failed === 0 && !syncing && "Alteracoes por sincronizar"}
                    </strong>
                    <span>
                        {!online && "A usar os dados guardados neste dispositivo."}
                        {online && failed > 0 && `${failed} alteracao(oes) precisam de atencao.`}
                        {online && failed === 0 && syncing && "A enviar os registos pendentes."}
                        {online && failed === 0 && !syncing && `${pending} alteracao(oes) guardadas localmente.`}
                        {lastSyncAt && online && failed === 0 && !syncing
                            ? ` Ultima sincronizacao: ${formatarHora(lastSyncAt)}.`
                            : ""}
                    </span>
                </div>

                <div className="offline-status-actions">
                    {failed > 0 ? (
                        <button
                            type="button"
                            className="offline-status-btn danger"
                            onClick={() => setDetalhesAbertos(true)}
                        >
                            Ver detalhes
                        </button>
                    ) : null}

                    {online && failed === 0 ? (
                        <button
                            type="button"
                            className="offline-status-btn primary"
                            onClick={sincronizarAgora}
                            disabled={syncing || pending === 0}
                        >
                            {syncing ? "A sincronizar..." : "Sincronizar agora"}
                        </button>
                    ) : null}
                </div>
            </aside>

            {detalhesAbertos ? (
                <div
                    className="offline-details-backdrop"
                    role="presentation"
                    onClick={() => setDetalhesAbertos(false)}
                >
                    <section
                        className="offline-details"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="offline-details-title"
                        onClick={(evento) => evento.stopPropagation()}
                    >
                        <header className="offline-details-header">
                            <div>
                                <h2 id="offline-details-title">Alteracoes com erro</h2>
                                <p>
                                    Estes registos foram guardados localmente, mas o servidor
                                    recusou a sincronizacao.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="offline-details-close"
                                onClick={() => setDetalhesAbertos(false)}
                                aria-label="Fechar"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        <div className="offline-details-body">
                            <div className="offline-details-alert">
                                <AlertTriangle size={18} />
                                <span>{lastError || "Nao foi possivel sincronizar todas as alteracoes."}</span>
                            </div>

                            <p className="offline-details-hint">
                                Pode tentar novamente ou descartar as alteracoes falhadas.
                                As restantes continuam guardadas.
                            </p>
                        </div>

                        <footer className="offline-details-actions">
                            <button
                                type="button"
                                className="offline-status-btn ghost"
                                onClick={descartar}
                            >
                                <Trash2 size={16} />
                                Descartar falhadas
                            </button>
                            <button
                                type="button"
                                className="offline-status-btn primary"
                                onClick={repetirFalhadas}
                                disabled={!online}
                            >
                                <RefreshCw size={16} />
                                {online ? "Tentar novamente" : "Sem ligacao"}
                            </button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </>
    )
}

export default OfflineStatus
