import { Component } from "react"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"
import { apiCache, getLastOwner } from "../../services/offlineDb.js"
import { limparPreparacaoOffline } from "../../services/offlinePrefetch.js"
import "./ErrorBoundary.css"

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { error: null, aLimpar: false }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error("Erro inesperado na aplicação:", error, info)
    }

    recarregar = () => {
        window.location.reload()
    }

    limparCache = async () => {
        this.setState({ aLimpar: true })

        try {
            // Limpa apenas a cache de respostas e o estado "Offline pronto". A
            // fila de escritas pendentes fica intacta para nao perder
            // alteracoes offline.
            await apiCache.clear()

            const owner = await getLastOwner().catch(() => null)
            limparPreparacaoOffline(owner)
        } catch {
            // Se o armazenamento estiver indisponivel, recarregar continua a
            // ser a melhor tentativa de recuperacao.
        }

        window.location.reload()
    }

    render() {
        if (!this.state.error) return this.props.children

        return (
            <main className="error-boundary" role="alert">
                <section className="error-boundary-card">
                    <span className="error-boundary-icon" aria-hidden="true">
                        <AlertTriangle size={26} />
                    </span>

                    <h1>Algo correu mal</h1>
                    <p>
                        Ocorreu um erro inesperado ao mostrar esta página. As alterações
                        pendentes não são eliminadas ao limpar a cache.
                    </p>

                    <div className="error-boundary-actions">
                        <button
                            type="button"
                            className="error-boundary-btn ghost"
                            onClick={this.limparCache}
                            disabled={this.state.aLimpar}
                        >
                            <Trash2 size={16} />
                            {this.state.aLimpar ? "A limpar..." : "Limpar cache e recarregar"}
                        </button>
                        <button
                            type="button"
                            className="error-boundary-btn primary"
                            onClick={this.recarregar}
                            disabled={this.state.aLimpar}
                        >
                            <RefreshCw size={16} />
                            Recarregar
                        </button>
                    </div>
                </section>
            </main>
        )
    }
}

export default ErrorBoundary
