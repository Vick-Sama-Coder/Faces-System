import { useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    CheckCircle2,
    Gift,
    Heart,
    History,
    Loader2,
    Plus,
    Trash2,
    X
} from "lucide-react"
import {
    getFidelizacao,
    marcarFidelizacaoManual,
    removerMarcaFidelizacao,
    registarBeneficioFidelizacaoManual,
    getApiError
} from "../../../services/api.js"
import FidelizacaoCard from "../../FidelizacaoCard/FidelizacaoCard.jsx"
import ConfirmDialog from "../../ConfirmDialog/ConfirmDialog.jsx"
import { LIMITE_FIDELIZACAO, META_FIDELIZACAO } from "../../../utils/validacoes.js"
import "./CartaoClienteModal.css"

const MAX_MARCAS = 20

const TIPOS = {
    marca: { label: "Marca", tone: "primary" },
    beneficio_ganho: { label: "Cartão completo", tone: "warning" },
    beneficio_utilizado: { label: "6.º serviço grátis usado", tone: "success" },
    correcao: { label: "Correção", tone: "neutral" }
}

function formatarDataHora(valor) {
    if (!valor) return "—"

    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "—"

    return data.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

function CartaoClienteModal({ cliente, onclose, onSuccess }) {
    const [fidelizacao, setFidelizacao] = useState(null)
    const [loading, setLoading] = useState(true)
    const [aAdicionar, setAAdicionar] = useState(false)
    const [aRemover, setARemover] = useState(false)
    const [aUtilizar, setAUtilizar] = useState(false)
    const [quantidade, setQuantidade] = useState("1")
    const [confirmacaoAdicao, setConfirmacaoAdicao] = useState(null)
    const [remocao, setRemocao] = useState(null)
    const [confirmacaoBeneficio, setConfirmacaoBeneficio] = useState(false)
    const [error, setError] = useState(null)
    const [sucesso, setSucesso] = useState(null)

    useEffect(() => {
        let activo = true

        getFidelizacao(cliente.id)
            .then((res) => {
                if (activo) setFidelizacao(res.data || null)
            })
            .catch((err) => {
                if (activo) setError(getApiError(err))
            })
            .finally(() => {
                if (activo) setLoading(false)
            })

        return () => { activo = false }
    }, [cliente.id])

    const meta = Number(fidelizacao?.meta) || META_FIDELIZACAO
    const marcasAtuais = Number(fidelizacao?.marcas_no_ciclo) || 0
    const beneficiosDisponiveis = Number(fidelizacao?.beneficios_disponiveis) || 0
    const beneficioPendente = beneficiosDisponiveis > 0
    const marcasRestantes = Math.max(meta - marcasAtuais, 0)
    const quantidadeMaxima = Math.max(Math.min(MAX_MARCAS, marcasRestantes), 1)
    const quantidadeNumero = Number(quantidade)
    const quantidadeValida = !beneficioPendente
        && Number.isInteger(quantidadeNumero)
        && quantidadeNumero >= 1
        && quantidadeNumero <= quantidadeMaxima

    const previsao = useMemo(() => {
        if (!quantidadeValida) return null

        const total = marcasAtuais + quantidadeNumero

        return {
            marcasDepois: total,
            completa: total === meta
        }
    }, [marcasAtuais, quantidadeNumero, quantidadeValida, meta])

    const historico = useMemo(() => {
        const lista = fidelizacao?.historico || []

        return [...lista].sort((a, b) => {
            const dataA = new Date(a.data_hora).getTime() || 0
            const dataB = new Date(b.data_hora).getTime() || 0
            return dataB - dataA || Number(b.id) - Number(a.id)
        })
    }, [fidelizacao])

    function atualizarProgresso(res) {
        setFidelizacao(res.data || null)
        if (onSuccess) onSuccess(res.data)
    }

    async function adicionarMarcas(total, confirmar) {
        if (aAdicionar) return

        setAAdicionar(true)
        setError(null)
        setSucesso(null)

        try {
            const res = await marcarFidelizacaoManual(cliente.id, {
                quantidade: total,
                confirmar_beneficio: confirmar
            })

            atualizarProgresso(res)
            setConfirmacaoAdicao(null)
            setQuantidade("1")
            setSucesso(
                res.data?.beneficios_gerados > 0
                    ? `${total} marca(s) adicionada(s). Cartão completo: o 6.º serviço é gratuito.`
                    : `${total} marca(s) adicionada(s) ao cartão.`
            )
        } catch (err) {
            const dados = err?.response?.data

            if (err?.response?.status === 409 && dados?.requer_confirmacao) {
                setConfirmacaoAdicao({
                    quantidade: total,
                    beneficios: Number(dados.beneficios_a_gerar) || 0,
                    marcasAtuais: Number(dados.marcas_no_ciclo) || marcasAtuais,
                    marcasApos: Number(dados.marcas_apos) || (marcasAtuais + total)
                })
            } else {
                setError(getApiError(err))
            }
        } finally {
            setAAdicionar(false)
        }
    }

    function pedirAdicao(evento) {
        evento.preventDefault()

        if (beneficioPendente) {
            setError("O cartão está completo (5/5). Registe o 6.º serviço gratuito antes de adicionar novas marcas.")
            return
        }

        if (!quantidadeValida) {
            setError(`Indique uma quantidade entre 1 e ${quantidadeMaxima}.`)
            return
        }

        setError(null)
        setSucesso(null)

        if (previsao?.completa) {
            setConfirmacaoAdicao({
                quantidade: quantidadeNumero,
                beneficios: 1,
                marcasAtuais,
                marcasApos: previsao.marcasDepois
            })
            return
        }

        adicionarMarcas(quantidadeNumero, false)
    }

    async function confirmarRemocao() {
        if (!remocao || aRemover) return

        setARemover(true)
        setError(null)
        setSucesso(null)

        try {
            const res = await removerMarcaFidelizacao(cliente.id, remocao.id)
            atualizarProgresso(res)
            setRemocao(null)
            setSucesso("Marca removida e cartão recalculado.")
        } catch (err) {
            setError(getApiError(err))
            setRemocao(null)
        } finally {
            setARemover(false)
        }
    }

    async function confirmarBeneficio() {
        if (aUtilizar) return

        setAUtilizar(true)
        setError(null)
        setSucesso(null)

        try {
            const res = await registarBeneficioFidelizacaoManual(cliente.id)
            atualizarProgresso(res)
            setConfirmacaoBeneficio(false)
            setSucesso("6.º serviço gratuito registado como utilizado. O cartão reiniciou em 0/5.")
        } catch (err) {
            setError(getApiError(err))
            setConfirmacaoBeneficio(false)
        } finally {
            setAUtilizar(false)
        }
    }

    return (
        <>
            <div className="cartao-cliente-backdrop" onClick={() => !aAdicionar && !aRemover && !aUtilizar && onclose()}>
                <section
                    className="cartao-cliente-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cartao-cliente-title"
                    onClick={(evento) => evento.stopPropagation()}
                >
                    <header className="cartao-cliente-header">
                        <span className="cartao-cliente-icon"><Heart size={21} /></span>
                        <div>
                            <h2 id="cartao-cliente-title">Cartão de cliente</h2>
                            <p>
                                {cliente.nome} {cliente.apelido || ""}
                                {cliente.telefone ? ` · ${cliente.telefone}` : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="cartao-cliente-close"
                            onClick={onclose}
                            disabled={aAdicionar || aRemover || aUtilizar}
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </header>

                    <div className="cartao-cliente-body">
                        {error && (
                            <div className="cartao-cliente-alert error" role="alert">
                                <AlertCircle size={17} />
                                <span>{error}</span>
                                <button type="button" onClick={() => setError(null)}>Fechar</button>
                            </div>
                        )}

                        {sucesso && (
                            <div className="cartao-cliente-alert success" role="status">
                                <CheckCircle2 size={17} />
                                <span>{sucesso}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="cartao-cliente-loading">
                                <Loader2 size={22} className="cartao-cliente-spin" />
                                <span>A carregar o cartão...</span>
                            </div>
                        ) : (
                            <>
                                <FidelizacaoCard
                                    fidelizacao={fidelizacao}
                                    title="Progresso do cartão"
                                    emptyHint="Ainda sem cartão. Adicione as marcas do cartão físico para começar."
                                />

                                <section className="cartao-cliente-section">
                                    <div className="cartao-cliente-section-title">
                                        <Plus size={17} />
                                        <span>Adicionar marcas</span>
                                    </div>
                                    <p className="cartao-cliente-hint">
                                        {beneficioPendente
                                            ? "O cartão está completo (5/5). Registe o 6.º serviço gratuito na secção abaixo antes de adicionar novas marcas."
                                            : "Use esta opção para preencher cartões físicos já existentes. As marcas entram no ciclo actual e contam como um serviço elegível (uma marca por dia)."}
                                    </p>

                                    <form className="cartao-cliente-add" onSubmit={pedirAdicao}>
                                        <label htmlFor="cartao-marcas-quantidade">Quantidade</label>
                                        <input
                                            id="cartao-marcas-quantidade"
                                            type="number"
                                            min="1"
                                            max={quantidadeMaxima}
                                            step="1"
                                            value={quantidade}
                                            onChange={(evento) => {
                                                setQuantidade(evento.target.value)
                                                setError(null)
                                                setSucesso(null)
                                            }}
                                            disabled={aAdicionar || beneficioPendente}
                                        />
                                        <button
                                            type="submit"
                                            className="mgmt-btn primary"
                                            disabled={aAdicionar || !quantidadeValida || beneficioPendente}
                                        >
                                            {aAdicionar ? <Loader2 size={16} className="cartao-cliente-spin" /> : <Plus size={16} />}
                                            {aAdicionar ? "A adicionar..." : "Adicionar marcas"}
                                        </button>
                                    </form>

                                    {previsao && (
                                        <p className="cartao-cliente-preview">
                                            Com mais <strong>{quantidadeNumero}</strong> marca(s):{" "}
                                            <strong>{previsao.marcasDepois}/{meta}</strong> no ciclo.
                                            {previsao.completa && (
                                                <> O cartão fica completo e o 6.º serviço será gratuito.</>
                                            )}
                                        </p>
                                    )}
                                </section>

                                <section className="cartao-cliente-section">
                                    <div className="cartao-cliente-section-title">
                                        <Gift size={17} />
                                        <span>6.º serviço gratuito</span>
                                    </div>

                                    <div className="cartao-cliente-beneficio">
                                        <div>
                                            <strong>{beneficiosDisponiveis > 0 ? 1 : 0}</strong>
                                            <span>
                                                {beneficiosDisponiveis > 0
                                                    ? "6.º serviço grátis pendente"
                                                    : "sem 6.º serviço pendente"}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="mgmt-btn ghost"
                                            onClick={() => setConfirmacaoBeneficio(true)}
                                            disabled={beneficiosDisponiveis <= 0 || aUtilizar || aAdicionar || aRemover}
                                        >
                                            <Gift size={16} />
                                            Registar 6.º serviço como utilizado
                                        </button>
                                    </div>

                                    <p className="cartao-cliente-hint">
                                        O 6.º serviço é gratuito num único serviço elegível até{" "}
                                        {LIMITE_FIDELIZACAO} MT. Ao registar a utilização, o cartão
                                        reinicia em 0/{META_FIDELIZACAO}. Use esta opção para cartões
                                        físicos em que o serviço gratuito já foi prestado.
                                    </p>
                                </section>

                                <section className="cartao-cliente-section">
                                    <div className="cartao-cliente-section-title">
                                        <History size={17} />
                                        <span>Histórico</span>
                                    </div>
                                    <p className="cartao-cliente-hint">
                                        Pode remover marcas do ciclo atual, manuais ou de atendimento.
                                        Ciclos anteriores usam a correção de fidelização.
                                    </p>

                                    {historico.length === 0 ? (
                                        <p className="cartao-cliente-empty">
                                            Ainda não existem movimentos. Adicione a primeira marca para
                                            começar a preencher o cartão.
                                        </p>
                                    ) : (
                                        <ul className="cartao-cliente-historico">
                                            {historico.map((movimento) => {
                                                const tipo = TIPOS[movimento.tipo_movimento] || {
                                                    label: movimento.tipo_movimento,
                                                    tone: "neutral"
                                                }
                                                const manual = movimento.origem === "manual"
                                                const podeRemover = movimento.tipo_movimento === "marca"
                                                    && Number(movimento.ciclo) === Number(fidelizacao?.ciclo_atual)

                                                return (
                                                    <li key={movimento.id}>
                                                        <span className="cartao-cliente-movimento-data">
                                                            {formatarDataHora(movimento.data_hora)}
                                                        </span>
                                                        <span className={`mgmt-badge ${tipo.tone}`}>
                                                            {tipo.label}
                                                        </span>
                                                        <span className="cartao-cliente-movimento-ciclo">
                                                            Ciclo {movimento.ciclo}
                                                        </span>
                                                        {manual && (
                                                            <span className="mgmt-badge neutral">Manual</span>
                                                        )}
                                                        {!manual && movimento.tipo_movimento === "marca" && (
                                                            <span className="mgmt-badge neutral">Atendimento</span>
                                                        )}
                                                        {movimento.observacao && (
                                                            <span className="cartao-cliente-movimento-obs">
                                                                {movimento.observacao}
                                                            </span>
                                                        )}
                                                        {podeRemover && (
                                                            <button
                                                                type="button"
                                                                className="cartao-cliente-remove"
                                                                onClick={() => setRemocao(movimento)}
                                                                disabled={aAdicionar || aRemover || aUtilizar}
                                                                title="Remover marca do ciclo atual"
                                                                aria-label="Remover marca do ciclo atual"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </section>
                            </>
                        )}
                    </div>

                    <footer className="cartao-cliente-footer">
                        <span>
                            A marcação normal continua a ser feita no atendimento.
                        </span>
                        <button
                            type="button"
                            className="mgmt-btn ghost"
                            onClick={onclose}
                            disabled={aAdicionar || aRemover || aUtilizar}
                        >
                            Fechar
                        </button>
                    </footer>
                </section>
            </div>

            <ConfirmDialog
                open={Boolean(confirmacaoAdicao)}
                title="Completar o cartão de fidelização?"
                description={confirmacaoAdicao
                    ? `Ao adicionar ${confirmacaoAdicao.quantidade} marca(s), o cartão fica completo (${meta}/${meta}). O 6.º serviço será gratuito até ${LIMITE_FIDELIZACAO} MT e não pode ser guardado para depois.`
                    : ""}
                confirmLabel="Adicionar e completar"
                tone="warning"
                icon={Gift}
                loading={aAdicionar}
                onConfirm={() => confirmacaoAdicao && adicionarMarcas(confirmacaoAdicao.quantidade, true)}
                onClose={() => !aAdicionar && setConfirmacaoAdicao(null)}
            />

            <ConfirmDialog
                open={Boolean(remocao)}
                title="Remover marca?"
                description={remocao
                    ? `A marca de ${formatarDataHora(remocao.data_hora)} será removida do cartão. Se o cartão estava completo, o 6.º serviço gratuito pendente também é removido.${remocao.origem === "atendimento" ? " O atendimento e os serviços registados não são alterados." : ""}`
                    : ""}
                confirmLabel="Remover marca"
                tone="danger"
                icon={Trash2}
                loading={aRemover}
                onConfirm={confirmarRemocao}
                onClose={() => !aRemover && setRemocao(null)}
            />

            <ConfirmDialog
                open={confirmacaoBeneficio}
                title="Registar o 6.º serviço como utilizado?"
                description={`O cartão está completo (${meta}/${meta}). Ao confirmar, o 6.º serviço gratuito é fechado e o cartão reinicia em 0/${meta}.`}
                confirmLabel="Registar utilização"
                tone="warning"
                icon={Gift}
                loading={aUtilizar}
                onConfirm={confirmarBeneficio}
                onClose={() => !aUtilizar && setConfirmacaoBeneficio(false)}
            />
        </>
    )
}

export default CartaoClienteModal
