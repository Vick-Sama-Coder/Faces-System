import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
    CheckCircle2,
    Download,
    Share2,
    Smartphone,
    X
} from "lucide-react"
import { pedirInstalacao } from "../../services/installPrompt.js"
import { useInstallPrompt } from "../../hooks/useInstallPrompt.js"
import "./InstallAppButton.css"

function InstrucoesInstalacao({ plataforma, navegador, erro, aoFechar }) {
    useEffect(() => {
        function fecharComEscape(evento) {
            if (evento.key === "Escape") aoFechar()
        }

        document.addEventListener("keydown", fecharComEscape)
        return () => document.removeEventListener("keydown", fecharComEscape)
    }, [aoFechar])

    const passos = plataforma === "ios"
        ? [
            "Abra esta página no Safari.",
            "Toque no botão Partilhar.",
            "Escolha Adicionar ao Ecrã Principal.",
            "Confirme com Adicionar."
        ]
        : plataforma === "android"
            ? [
                "Abra o menu do browser (⋮ ou ☰).",
                "Escolha Instalar aplicação ou Adicionar ao ecrã principal.",
                "Confirme a instalação."
            ]
            : [
                "Use o ícone de instalação na barra de endereço.",
                "Se não aparecer, abra o menu do browser e procure Instalar aplicação.",
                "Confirme a instalação."
            ]

    return (
        <div
            className="install-app-backdrop"
            role="presentation"
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) aoFechar()
            }}
        >
            <section
                className="install-app-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="install-app-title"
            >
                <header className="install-app-dialog-header">
                    <span className="install-app-dialog-icon" aria-hidden="true">
                        {plataforma === "ios"
                            ? <Share2 size={22} />
                            : <Smartphone size={22} />}
                    </span>

                    <div>
                        <h2 id="install-app-title">Instalar a aplicação</h2>
                        <p>Adicione o Faces System ao ecrã inicial para abrir mais depressa.</p>
                    </div>

                    <button
                        type="button"
                        className="install-app-close"
                        onClick={aoFechar}
                        aria-label="Fechar instruções"
                    >
                        <X size={18} />
                    </button>
                </header>

                {erro && (
                    <p className="install-app-error" role="alert">{erro}</p>
                )}

                <ol className="install-app-steps">
                    {passos.map((passo, indice) => (
                        <li key={passo}>
                            <span className="install-app-step-number" aria-hidden="true">
                                {indice + 1}
                            </span>
                            <span>{passo}</span>
                        </li>
                    ))}
                </ol>

                {plataforma === "android" && navegador === "samsung" && (
                    <p className="install-app-hint">
                        No Samsung Internet, o menu pode estar no canto inferior direito.
                    </p>
                )}

                <div className="install-app-note">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>
                        Depois de instalar, abra a app e inicie sessão com internet
                        uma vez para preparar os dados offline.
                    </span>
                </div>

                <div className="install-app-actions">
                    <button
                        type="button"
                        className="install-app-btn primary"
                        onClick={aoFechar}
                    >
                        Entendi
                    </button>
                </div>
            </section>
        </div>
    )
}

function InstallAppButton({
    label = "Instalar app",
    variant = "default",
    className = ""
}) {
    const {
        promptDisponivel,
        plataforma,
        navegador,
        mostrarInstalacao
    } = useInstallPrompt()
    const [instrucoesAbertas, setInstrucoesAbertas] = useState(false)
    const [aInstalar, setAInstalar] = useState(false)
    const [erro, setErro] = useState(null)

    if (!mostrarInstalacao) return null

    async function abrirInstalacao() {
        setErro(null)

        if (!promptDisponivel) {
            setInstrucoesAbertas(true)
            return
        }

        setAInstalar(true)
        const resultado = await pedirInstalacao()
        setAInstalar(false)

        if (resultado.outcome === "unavailable" || resultado.outcome === "error") {
            setErro("O browser não abriu o pedido de instalação. Use as instruções abaixo.")
            setInstrucoesAbertas(true)
        }
    }

    const conteudo = variant === "sidebar"
        ? (
            <>
                <span className="sidebar__icon" aria-hidden="true">
                    <Download size={18} strokeWidth={2} />
                </span>
                <span className="sidebar__label">
                    {aInstalar ? "A abrir..." : label}
                </span>
            </>
        )
        : (
            <>
                <Download size={17} aria-hidden="true" />
                <span className="install-app-label">
                    {aInstalar ? "A abrir..." : label}
                </span>
            </>
        )

    return (
        <>
            <button
                type="button"
                className={`install-app-button ${className}`.trim()}
                onClick={abrirInstalacao}
                disabled={aInstalar}
                aria-haspopup={!promptDisponivel ? "dialog" : undefined}
                aria-label={label}
                title={label}
            >
                {conteudo}
            </button>

            {instrucoesAbertas && createPortal(
                <InstrucoesInstalacao
                    plataforma={plataforma}
                    navegador={navegador}
                    erro={erro}
                    aoFechar={() => {
                        setInstrucoesAbertas(false)
                        setErro(null)
                    }}
                />,
                document.body
            )}
        </>
    )
}

export default InstallAppButton
