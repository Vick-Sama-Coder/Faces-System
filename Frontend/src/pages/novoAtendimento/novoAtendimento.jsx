import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
import NewMarkModal from "../../components/Modals/NewMark/New-Mark-Modal.jsx"
import FidelizacaoCard from "../../components/FidelizacaoCard/FidelizacaoCard.jsx"
import "./novoAtendimento.css"
import Search from "../../components/forms/search/search.jsx"
import Button from "../../components/forms/button/button.jsx"
import { useState, useEffect, useMemo } from "react"
import {
    CalendarPlus,
    ScissorsIcon,
    Receipt,
    CheckCircle2,
    Ban,
    Eye,
    X,
    UserRound,
    CreditCard,
    Wallet,
    Heart,
    Phone,
    Clock3
} from "lucide-react"
import {
    getAtendimentos,
    getAtendimento,
    anularAtendimento,
    registrarPagamento,
    getApiError
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const ESTADOS = ["Todos", "Em andamento", "Concluido", "Pago", "Anulado"]
const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"]

function formatarData(valor) {
    if (!valor) return "-"
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "-"
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function classeEstado(estado) {
    switch (estado) {
        case "Pago": return "pago"
        case "Concluido": return "concluido"
        case "Anulado": return "anulado"
        default: return "pendente"
    }
}

function saldoDoAtendimento(atendimento) {
    if (!atendimento || atendimento.estado === "Anulado") return 0
    return Math.max(Number(atendimento.valor_total || 0) - Number(atendimento.valor_pago || 0), 0)
}

function NovoAtendimento() {
    const { user } = useAuthStore()
    const podePagar = user?.permissoes?.includes("pagamentos:registar")
    const podeAnular = user?.permissoes?.includes("atendimentos:anular")

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [atendimentos, setAtendimentos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filtro, setFiltro] = useState("Todos")
    const [searchTerm, setSearchTerm] = useState("")
    const [detalhe, setDetalhe] = useState(null)
    const [loadingDetalhe, setLoadingDetalhe] = useState(false)
    const [detalheError, setDetalheError] = useState(null)
    const [savingPagamento, setSavingPagamento] = useState(false)
    const [pagamentoForm, setPagamentoForm] = useState({
        metodo: "Dinheiro",
        valor: ""
    })

    useEffect(() => {
        carregarAtendimentos()
    }, [])

    async function carregarAtendimentos() {
        setLoading(true)
        setError(null)
        try {
            const res = await getAtendimentos()
            const lista = Array.isArray(res.data) ? res.data : (res.data?.atendimentos || [])
            setAtendimentos(lista)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    const atendimentosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()

        return atendimentos.filter((item) => {
            const correspondeEstado = filtro === "Todos" || item.estado === filtro
            const correspondePesquisa = !termo
                || String(item.cliente_nome || "").toLowerCase().includes(termo)
                || String(item.cliente_apelido || "").toLowerCase().includes(termo)
                || String(item.cliente_telefone || "").includes(termo)
                || String(item.id).includes(termo)
            return correspondeEstado && correspondePesquisa
        })
    }, [atendimentos, filtro, searchTerm])

    const emAndamento = atendimentos.filter((a) => a.estado === "Em andamento").length
    const pagos = atendimentos.filter((a) => a.estado === "Pago").length
    const totalRecebido = atendimentos.reduce((acc, a) => acc + (Number(a.valor_pago) || 0), 0)
    const totalPendente = atendimentos.reduce((acc, a) => acc + saldoDoAtendimento(a), 0)
    const hoje = new Date().toDateString()
    const atendimentosHoje = atendimentos.filter((a) => new Date(a.data_hora).toDateString() === hoje).length

    async function handleAnular(atendimento) {
        const motivo = window.prompt(`Motivo da anulacao do atendimento de ${atendimento.cliente_nome}:`)
        if (!motivo || !motivo.trim()) return

        try {
            await anularAtendimento(atendimento.id, motivo.trim())
            await carregarAtendimentos()
            if (detalhe?.id === atendimento.id) {
                setDetalhe(null)
            }
        } catch (err) {
            setError(getApiError(err))
        }
    }

    async function handleVerDetalhe(atendimento) {
        setDetalhe({ ...atendimento, servicos: [], pagamentos: [] })
        setDetalheError(null)
        setLoadingDetalhe(true)
        setPagamentoForm({ metodo: "Dinheiro", valor: "" })

        try {
            const res = await getAtendimento(atendimento.id)
            setDetalhe(res.data)
            const saldo = saldoDoAtendimento(res.data)
            setPagamentoForm({
                metodo: "Dinheiro",
                valor: saldo > 0 ? String(saldo) : ""
            })
        } catch (err) {
            setDetalheError(getApiError(err))
        } finally {
            setLoadingDetalhe(false)
        }
    }

    async function recarregarDetalhe(id) {
        const res = await getAtendimento(id)
        setDetalhe(res.data)
        const saldo = saldoDoAtendimento(res.data)
        setPagamentoForm((anterior) => ({
            ...anterior,
            valor: saldo > 0 ? String(saldo) : ""
        }))
        return res.data
    }

    function alterarPagamento(campo, valor) {
        setPagamentoForm((anterior) => ({ ...anterior, [campo]: valor }))
        if (detalheError) setDetalheError(null)
    }

    async function handleRegistarPagamento(e) {
        e.preventDefault()
        if (!detalhe || savingPagamento) return

        const saldo = saldoDoAtendimento(detalhe)
        const valor = Number(pagamentoForm.valor)

        if (!valor || valor <= 0) {
            setDetalheError("Indique um valor maior que zero")
            return
        }
        if (valor > saldo) {
            setDetalheError(`O valor nao pode exceder o saldo em falta (${formatarMoeda(saldo)})`)
            return
        }
        if (!pagamentoForm.metodo) {
            setDetalheError("Selecione a forma de pagamento")
            return
        }

        setSavingPagamento(true)
        setDetalheError(null)
        try {
            await registrarPagamento(detalhe.id, {
                parcelas: [{
                    metodo_pagamento: pagamentoForm.metodo,
                    valor
                }]
            })
            await recarregarDetalhe(detalhe.id)
            await carregarAtendimentos()
        } catch (err) {
            setDetalheError(getApiError(err))
        } finally {
            setSavingPagamento(false)
        }
    }

    return (
        <>
            {isModalOpen && (
                <NewMarkModal
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={carregarAtendimentos}
                />
            )}

            {detalhe && (
                <div className="appointment-modal-backdrop" onClick={() => setDetalhe(null)}>
                    <section className="appointment-detail" onClick={(e) => e.stopPropagation()}>
                        <header className="appointment-detail-header">
                            <div>
                                <h2>Atendimento #{detalhe.id}</h2>
                                <p>{detalhe.cliente_nome} {detalhe.cliente_apelido || ""} · {formatarData(detalhe.data_hora)}</p>
                            </div>
                            <button
                                type="button"
                                className="appointment-close"
                                onClick={() => setDetalhe(null)}
                                aria-label="Fechar detalhe"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="appointment-detail-body">
                            {detalheError && <div className="appointment-alert">{detalheError}</div>}

                            <div className="appointment-detail-summary">
                                <span className={`status-badge ${classeEstado(detalhe.estado)}`}>
                                    {detalhe.estado}
                                </span>
                                <div className="appointment-detail-summary-values">
                                    <span>Total <strong>{formatarMoeda(detalhe.valor_total)}</strong></span>
                                    <span>Pago <strong>{formatarMoeda(detalhe.valor_pago)}</strong></span>
                                    <span className={saldoDoAtendimento(detalhe) > 0 ? "saldo-pendente" : "saldo-zero"}>
                                        Saldo <strong>{formatarMoeda(saldoDoAtendimento(detalhe))}</strong>
                                    </span>
                                </div>
                            </div>

                            {loadingDetalhe ? (
                                <p className="appointment-empty">A carregar informacoes completas...</p>
                            ) : (
                                <>
                                    <section className="appointment-detail-section">
                                        <h3><UserRound size={16} /> Cliente</h3>
                                        <div className="appointment-info-grid">
                                            <div>
                                                <span>Nome</span>
                                                <strong>{detalhe.cliente_nome} {detalhe.cliente_apelido || ""}</strong>
                                            </div>
                                            <div>
                                                <span>Telefone</span>
                                                <strong><Phone size={13} /> {detalhe.cliente_telefone || "-"}</strong>
                                            </div>
                                            <div>
                                                <span>Registado por</span>
                                                <strong>{detalhe.registado_por_nome || "Sistema"}</strong>
                                            </div>
                                            <div>
                                                <span>Data</span>
                                                <strong><Clock3 size={13} /> {formatarData(detalhe.data_hora)}</strong>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><ScissorsIcon size={16} /> Servicos realizados</h3>
                                        {detalhe.servicos?.length ? (
                                            <ul className="appointment-services">
                                                {detalhe.servicos.map((item) => (
                                                    <li key={item.id}>
                                                        <span className="appointment-service-info">
                                                            <span className="appointment-service-name">
                                                                <ScissorsIcon size={16} />
                                                                {item.servico_nome}
                                                                {item.elegivel_fidelizacao && (
                                                                    <span className="appointment-loyalty-tag">
                                                                        <Heart size={11} /> Fidelizacao
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <small>{item.categoria_nome || "Sem categoria"}</small>
                                                        </span>
                                                        <span>{item.funcionario_nome}</span>
                                                        <strong>{formatarMoeda(item.valor_final)}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="appointment-empty">Nenhum servico associado.</p>
                                        )}

                                        <div className="appointment-totals">
                                            <span>Bruto <strong>{formatarMoeda(detalhe.valor_bruto)}</strong></span>
                                            <span>Desconto <strong>{formatarMoeda(detalhe.valor_desconto)}</strong></span>
                                            <span>Total <strong>{formatarMoeda(detalhe.valor_total)}</strong></span>
                                        </div>
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><CreditCard size={16} /> Pagamentos</h3>
                                        {detalhe.pagamentos?.length ? (
                                            <div className="appointment-payments">
                                                {detalhe.pagamentos.map((pagamento) => (
                                                    <div key={pagamento.id} className="appointment-payment">
                                                        <div className="appointment-payment-head">
                                                            <strong>Pagamento #{pagamento.id}</strong>
                                                            <span className={`status-badge ${pagamento.estado === "Anulado" ? "anulado" : pagamento.estado === "Liquidado" ? "pago" : "pendente"}`}>
                                                                {pagamento.estado}
                                                            </span>
                                                            <span>{formatarData(pagamento.data_hora)}</span>
                                                        </div>
                                                        <ul>
                                                            {(pagamento.parcelas || []).map((parcela) => (
                                                                <li key={parcela.id}>
                                                                    <span>{parcela.metodo_pagamento}</span>
                                                                    <strong>{formatarMoeda(parcela.valor)}</strong>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {pagamento.motivo_anulacao && (
                                                            <p className="appointment-reason">Motivo: {pagamento.motivo_anulacao}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="appointment-empty">Ainda nao existem pagamentos registados.</p>
                                        )}
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><Heart size={16} /> Fidelizacao do cliente</h3>
                                        <FidelizacaoCard fidelizacao={detalhe.fidelizacao} compact />
                                    </section>

                                    {podePagar && saldoDoAtendimento(detalhe) > 0 && detalhe.estado !== "Anulado" && (
                                        <section className="appointment-detail-section appointment-payment-section">
                                            <h3><Wallet size={16} /> Registar pagamento</h3>
                                            <form className="appointment-payment-form" onSubmit={handleRegistarPagamento}>
                                                <div className="appointment-payment-grid">
                                                    <div>
                                                        <label>Forma de pagamento</label>
                                                        <select
                                                            value={pagamentoForm.metodo}
                                                            onChange={(e) => alterarPagamento("metodo", e.target.value)}
                                                        >
                                                            {FORMAS_PAGAMENTO.map((forma) => (
                                                                <option key={forma} value={forma}>{forma}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label>Valor (MT)</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={saldoDoAtendimento(detalhe)}
                                                            step="1"
                                                            value={pagamentoForm.valor}
                                                            onChange={(e) => alterarPagamento("valor", e.target.value)}
                                                        />
                                                    </div>
                                                    <button type="submit" className="submit-btn" disabled={savingPagamento}>
                                                        {savingPagamento ? "A registar..." : "Registar pagamento"}
                                                    </button>
                                                </div>
                                                <p className="appointment-payment-hint">
                                                    Saldo em falta: <strong>{formatarMoeda(saldoDoAtendimento(detalhe))}</strong>.
                                                    Ao liquidar o total, o atendimento passa automaticamente a Pago.
                                                </p>
                                            </form>
                                        </section>
                                    )}

                                    {detalhe.motivo_anulacao && (
                                        <p className="appointment-reason">
                                            Motivo da anulacao: {detalhe.motivo_anulacao}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <footer className="appointment-detail-footer">
                            {podeAnular && detalhe.estado !== "Anulado" && detalhe.estado !== "Pago" && (
                                <button
                                    type="button"
                                    className="appointment-cancel-btn"
                                    onClick={() => handleAnular(detalhe)}
                                >
                                    <Ban size={16} /> Anular atendimento
                                </button>
                            )}
                            <button type="button" className="appointment-close-btn" onClick={() => setDetalhe(null)}>
                                Fechar
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            <div className="newbookmark-main">
                <SideBar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="newmark-header"
                    title="Atendimentos"
                    h1Class="newmark-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="newbookmark-content">
                    <header className="page-header">
                        <div className="page-header-inner">
                            <div className="page-header-info">
                                <h1 className="page-title">Atendimentos</h1>
                                <p className="page-subtitle">Registe, acompanhe e liquide os atendimentos do salao</p>
                            </div>
                            <div className="page-header-actions">
                                <Button className="btn-class" btnClick={() => setIsModalOpen(true)}>
                                    <span className="btn-icon"><CalendarPlus /></span> Novo Atendimento
                                </Button>
                            </div>
                        </div>
                    </header>

                    <section className="stats-grid">
                        <div className="stat-card stat-agendados">
                            <div className="stat-icon">
                                <CalendarPlus />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Em Andamento</span>
                                <span className="stat-value">{emAndamento}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-concluidos">
                            <div className="stat-icon">
                                <CheckCircle2 />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Pagos</span>
                                <span className="stat-value">{pagos}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-pagos">
                            <div className="stat-icon">
                                <Wallet />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Total Recebido</span>
                                <span className="stat-value">{formatarMoeda(totalRecebido)}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-pendentes">
                            <div className="stat-icon">
                                <Receipt />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Por Receber</span>
                                <span className="stat-value">{formatarMoeda(totalPendente)}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-hoje">
                            <div className="stat-icon">
                                <Clock3 />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Atendimentos Hoje</span>
                                <span className="stat-value">{atendimentosHoje}</span>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div className="error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    <section className="filters-section">
                        <div className="filter-group">
                            {ESTADOS.map((estado) => (
                                <button
                                    key={estado}
                                    type="button"
                                    className={`filter-btn ${filtro === estado ? "active" : ""}`}
                                    onClick={() => setFiltro(estado)}
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="appointments-section">
                        <div className="search-wrapper">
                            <Search
                                placeholderInfo="Pesquisar por cliente, telefone ou numero..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="appointments-list">
                            {loading ? (
                                <p className="empty-state">A carregar atendimentos...</p>
                            ) : atendimentosFiltrados.length === 0 ? (
                                <p className="empty-state">
                                    {atendimentos.length === 0
                                        ? "Nenhum atendimento registado."
                                        : "Nenhum atendimento corresponde ao filtro."}
                                </p>
                            ) : (
                                <div className="appointments-table-wrap">
                                    <table className="appointments-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Data</th>
                                                <th>Estado</th>
                                                <th>Pagamento</th>
                                                <th>Total</th>
                                                <th className="appointments-actions-col">Acoes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {atendimentosFiltrados.map((atendimento) => {
                                                const saldo = saldoDoAtendimento(atendimento)
                                                return (
                                                    <tr key={atendimento.id}>
                                                        <td>
                                                            <span className="appointment-client">
                                                                <UserRound size={16} />
                                                                <span>
                                                                    <strong>{atendimento.cliente_nome} {atendimento.cliente_apelido || ""}</strong>
                                                                    <small>{atendimento.cliente_telefone || "-"}</small>
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td>{formatarData(atendimento.data_hora)}</td>
                                                        <td>
                                                            <span className={`status-badge ${classeEstado(atendimento.estado)}`}>
                                                                {atendimento.estado}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="appointment-payment-cell">
                                                                <span>{atendimento.metodos_pagamento || "Sem pagamento"}</span>
                                                                <small className={saldo > 0 ? "pending" : "settled"}>
                                                                    {saldo > 0 ? `${formatarMoeda(saldo)} em falta` : "Liquidado"}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td>{formatarMoeda(atendimento.valor_total)}</td>
                                                        <td className="appointments-actions-col">
                                                            <button
                                                                type="button"
                                                                className="action-btn view"
                                                                title="Ver detalhe completo"
                                                                onClick={() => handleVerDetalhe(atendimento)}
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            {podeAnular && atendimento.estado !== "Anulado" && atendimento.estado !== "Pago" && (
                                                                <button
                                                                    type="button"
                                                                    className="action-btn cancel"
                                                                    title="Anular atendimento"
                                                                    onClick={() => handleAnular(atendimento)}
                                                                >
                                                                    <Ban size={18} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </section>
            </div>
        </>
    )
}

export default NovoAtendimento
