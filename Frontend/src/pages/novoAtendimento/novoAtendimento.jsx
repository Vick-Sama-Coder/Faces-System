import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import NewMarkModal from "../../components/Modals/NewMark/New-Mark-Modal.jsx"
import FidelizacaoCard from "../../components/FidelizacaoCard/FidelizacaoCard.jsx"
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import "./novoAtendimento.css"
import "../../Styles/management.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, isAfter, isToday, isValid, parseISO, startOfDay, subDays } from "date-fns"
import { pt } from "date-fns/locale"
import {
    AlertCircle,
    Ban,
    CalendarPlus,
    CheckCircle2,
    ChevronDown,
    Clock3,
    CreditCard,
    Download,
    Edit3,
    Eye,
    Gift,
    Heart,
    Phone,
    Receipt,
    RefreshCw,
    ScissorsIcon,
    Search,
    Sparkles,
    Tag,
    Trash2,
    UserRound,
    Wallet,
    X
} from "lucide-react"
import {
    getAtendimentos,
    getAtendimento,
    getClientes,
    updateAtendimento,
    anularAtendimento,
    registrarPagamento,
    getApiError
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const ESTADOS = ["Todos", "Em andamento", "Concluido", "Pago", "Anulado"]
const PERIODOS = ["Todos", "Hoje", "7 dias", "30 dias"]
const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"]

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function dataAtendimento(valor) {
    if (!valor) return null
    const data = typeof valor === "string" ? parseISO(valor) : new Date(valor)
    return isValid(data) ? data : null
}

function formatarData(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "dd MMM yyyy 'às' HH:mm", { locale: pt })
}

function formatarDataCurta(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "dd MMM yyyy", { locale: pt })
}

function formatarHora(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "HH:mm")
}

function rotuloEstado(estado) {
    return estado === "Concluido" ? "Concluído" : estado
}

function classeEstado(estado) {
    switch (estado) {
        case "Pago": return "pago"
        case "Concluido": return "concluido"
        case "Anulado": return "anulado"
        default: return "pendente"
    }
}

function tomEstado(estado) {
    switch (estado) {
        case "Pago": return "success"
        case "Concluido": return "primary"
        case "Anulado": return "danger"
        default: return "warning"
    }
}

function iniciais(nome, apelido) {
    const partes = `${nome || ""} ${apelido || ""}`.trim().split(/\s+/).filter(Boolean)
    if (!partes.length) return "AT"
    const primeira = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
    return `${primeira}${ultima}`.toUpperCase()
}

function saldoDoAtendimento(atendimento) {
    if (!atendimento || atendimento.estado === "Anulado") return 0
    return Math.max(Number(atendimento.valor_total || 0) - Number(atendimento.valor_pago || 0), 0)
}

function nomeClienteAtendimento(cliente) {
    return `${cliente?.cliente_nome || cliente?.nome || ""} ${cliente?.cliente_apelido || cliente?.apelido || ""}`.trim()
}

function clientesDoAtendimento(atendimento) {
    if (Array.isArray(atendimento?.clientes) && atendimento.clientes.length > 0) {
        return atendimento.clientes
    }

    const mapa = new Map()

    ;(atendimento?.servicos || []).forEach((servico) => {
        const id = String(servico.cliente_id || "")
        if (!id || mapa.has(id)) return
        mapa.set(id, {
            cliente_id: servico.cliente_id,
            cliente_nome: servico.cliente_nome,
            cliente_apelido: servico.cliente_apelido,
            cliente_telefone: "",
            subtotal: 0,
            total_servicos: 0,
            total_aplicacoes: 0
        })
    })

    if (mapa.size === 0) {
        mapa.set(String(atendimento?.cliente_id || ""), {
            cliente_id: atendimento?.cliente_id,
            cliente_nome: atendimento?.cliente_nome,
            cliente_apelido: atendimento?.cliente_apelido,
            cliente_telefone: atendimento?.cliente_telefone,
            subtotal: atendimento?.valor_total || 0,
            total_servicos: atendimento?.servicos?.length || 0,
            total_aplicacoes: 0
        })
    }

    return [...mapa.values()]
}

function nomesDosClientes(atendimento) {
    if (atendimento?.clientes_nomes) return atendimento.clientes_nomes

    const nomes = clientesDoAtendimento(atendimento)
        .map((cliente) => nomeClienteAtendimento(cliente))
        .filter(Boolean)

    return nomes.join(", ") || "Cliente por identificar"
}

async function buscarAtendimentos() {
    const res = await getAtendimentos()
    return Array.isArray(res.data) ? res.data : (res.data?.atendimentos || [])
}

function ClienteAtendimentoCell({ data }) {
    return (
        <div className="mgmt-user-cell">
            <span className="mgmt-avatar customer name-icon ">{iniciais(data.cliente_nome, data.cliente_apelido)}</span>
            <span className="mgmt-user-copy">
                <strong>{data.cliente_nome} {data.cliente_apelido || ""}</strong>
                <small>{data.cliente_telefone || `Atendimento #${data.id}`}</small>
            </span>
        </div>
    )
}

function DataAtendimentoCell({ value }) {
    return (
        <div className="mgmt-cell-stack">
            <span className="mgmt-date">
                <Clock3 size={13} />
                {formatarDataCurta(value)}
            </span>
            <small>{formatarHora(value)}</small>
        </div>
    )
}

function EstadoAtendimentoCell({ value }) {
    return (
        <span className={`mgmt-badge ${tomEstado(value)}`}>
            <span className="mgmt-badge-dot" />
            {rotuloEstado(value) || "Em andamento"}
        </span>
    )
}

function PagamentoAtendimentoCell({ data }) {
    const saldo = saldoDoAtendimento(data)
    const anulado = data.estado === "Anulado"
    return (
        <span className="mgmt-payment-copy">
            <strong>{anulado ? "Atendimento anulado" : data.metodos_pagamento || "Sem pagamento"}</strong>
            <small className={`mgmt-money ${anulado ? "muted" : saldo > 0 ? "pending" : "settled"}`}>
                {anulado ? "Sem cobrança" : saldo > 0 ? `${formatarMoeda(saldo)} em falta` : "Liquidado"}
            </small>
        </span>
    )
}

function TotalAtendimentoCell({ value }) {
    return <span className="mgmt-money">{formatarMoeda(value)}</span>
}

function AcoesAtendimentoCell({ data, podeEditar, podeAnular, onVer, onEditar, onAnular }) {
    return (
        <div className="mgmt-row-actions">
            <button
                type="button"
                className="mgmt-row-btn view"
                onClick={() => onVer(data)}
                title="Ver detalhe completo"
                aria-label={`Ver atendimento ${data.id}`}
            >
                <Eye size={16} />
            </button>
            {podeEditar && data.estado !== "Anulado" && (
                <button
                    type="button"
                    className="mgmt-row-btn edit"
                    onClick={() => onEditar(data)}
                    title="Editar atendimento"
                    aria-label={`Editar atendimento ${data.id}`}
                >
                    <Edit3 size={16} />
                </button>
            )}
            {podeAnular && data.estado !== "Anulado" && (
                <button
                    type="button"
                    className="mgmt-row-btn danger"
                    onClick={() => onAnular(data)}
                    title="Apagar atendimento"
                    aria-label={`Apagar atendimento ${data.id}`}
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    )
}

function NovoAtendimento() {
    const { user } = useAuthStore()
    const podePagar = user?.permissoes?.includes("pagamentos:registar")
    const podeEditar = user?.permissoes?.includes("atendimentos:escrever")
    const podeAnular = user?.permissoes?.includes("atendimentos:anular")

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [atendimentos, setAtendimentos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filtro, setFiltro] = useState("Todos")
    const [periodo, setPeriodo] = useState("Todos")
    const [searchTerm, setSearchTerm] = useState("")
    const [detalhe, setDetalhe] = useState(null)
    const [loadingDetalhe, setLoadingDetalhe] = useState(false)
    const [detalheError, setDetalheError] = useState(null)
    const [savingPagamento, setSavingPagamento] = useState(false)
    const [anulacao, setAnulacao] = useState(null)
    const [aAnular, setAAnular] = useState(false)
    const [atendimentoEmEdicao, setAtendimentoEmEdicao] = useState(null)
    const [clientesEdicao, setClientesEdicao] = useState([])
    const [clienteEdicaoId, setClienteEdicaoId] = useState("")
    const [carregandoClientesEdicao, setCarregandoClientesEdicao] = useState(false)
    const [salvandoEdicao, setSalvandoEdicao] = useState(false)
    const [erroEdicao, setErroEdicao] = useState(null)
    const [pagamentoForm, setPagamentoForm] = useState({
        metodo: "Dinheiro",
        valor: ""
    })
    const gridApiRef = useRef(null)
    const detalheRequestRef = useRef(0)

    const carregarAtendimentos = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setAtendimentos(await buscarAtendimentos())
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let activo = true

        buscarAtendimentos()
            .then((lista) => {
                if (!activo) return
                setAtendimentos(lista)
                setError(null)
            })
            .catch((err) => {
                if (activo) setError(getApiError(err))
            })
            .finally(() => {
                if (activo) setLoading(false)
            })

        return () => { activo = false }
    }, [])

    useEffect(() => {
        if (!atendimentoEmEdicao) return undefined

        let activo = true

        getClientes()
            .then((res) => {
                if (!activo) return
                const lista = Array.isArray(res.data) ? res.data : (res.data?.clientes || [])
                setClientesEdicao(lista)
            })
            .catch((err) => {
                if (activo) setErroEdicao(getApiError(err))
            })
            .finally(() => {
                if (activo) setCarregandoClientesEdicao(false)
            })

        return () => { activo = false }
    }, [atendimentoEmEdicao])

    useEffect(() => {
        if (!atendimentoEmEdicao) return undefined

        function fecharComEscape(event) {
            if (event.key === "Escape" && !salvandoEdicao) {
                setAtendimentoEmEdicao(null)
                setErroEdicao(null)
            }
        }

        window.addEventListener("keydown", fecharComEscape)
        return () => window.removeEventListener("keydown", fecharComEscape)
    }, [atendimentoEmEdicao, salvandoEdicao])

    const atendimentosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        const hoje = startOfDay(new Date())
        const limite = periodo === "7 dias"
            ? subDays(hoje, 6)
            : periodo === "30 dias"
                ? subDays(hoje, 29)
                : null

        return atendimentos.filter((item) => {
            const correspondeEstado = filtro === "Todos" || item.estado === filtro
            if (!correspondeEstado) return false

            const data = dataAtendimento(item.data_hora)
            let correspondePeriodo = periodo === "Todos"
            if (!correspondePeriodo && data) {
                correspondePeriodo = periodo === "Hoje"
                    ? isToday(data)
                    : limite
                        ? isAfter(data, limite)
                        : true
            }
            if (!correspondePeriodo) return false
            if (!termo) return true

            return String(item.cliente_nome || "").toLowerCase().includes(termo)
                || String(item.cliente_apelido || "").toLowerCase().includes(termo)
                || String(item.cliente_telefone || "").includes(termo)
                || String(item.id).includes(termo)
        })
    }, [atendimentos, filtro, periodo, searchTerm])

    const contagemEstados = useMemo(() => {
        const contagem = { Todos: atendimentos.length }
        ESTADOS.slice(1).forEach((estado) => {
            contagem[estado] = atendimentos.filter((item) => item.estado === estado).length
        })
        return contagem
    }, [atendimentos])

    const emAndamento = contagemEstados["Em andamento"] || 0
    const pagos = contagemEstados.Pago || 0
    const totalRecebido = atendimentos.reduce((acc, item) => acc + (Number(item.valor_pago) || 0), 0)
    const totalPendente = atendimentos.reduce((acc, item) => acc + saldoDoAtendimento(item), 0)
    const atendimentosHoje = atendimentos.filter((item) => {
        const data = dataAtendimento(item.data_hora)
        return data ? isToday(data) : false
    }).length
    const temFiltros = Boolean(searchTerm.trim() || filtro !== "Todos" || periodo !== "Todos")

    const clientesEdicaoDisponiveis = useMemo(() => {
        const idAtual = String(atendimentoEmEdicao?.cliente_id ?? "")
        const lista = clientesEdicao.filter((cliente) => (
            cliente.estado === "Ativo" || String(cliente.id) === idAtual
        ))

        if (idAtual && !lista.some((cliente) => String(cliente.id) === idAtual)) {
            return [{
                id: atendimentoEmEdicao.cliente_id,
                nome: atendimentoEmEdicao.cliente_nome,
                apelido: atendimentoEmEdicao.cliente_apelido,
                telefone: atendimentoEmEdicao.cliente_telefone
            }, ...lista]
        }

        return lista
    }, [atendimentoEmEdicao, clientesEdicao])

    const handleEditar = useCallback((atendimento) => {
        setAtendimentoEmEdicao(atendimento)
        setClienteEdicaoId(String(atendimento.cliente_id ?? ""))
        setClientesEdicao([])
        setCarregandoClientesEdicao(true)
        setErroEdicao(null)
    }, [])

    const handleAnular = useCallback((atendimento) => {
        setAnulacao(atendimento)
    }, [])

    const handleVerDetalhe = useCallback(async (atendimento) => {
        const pedido = detalheRequestRef.current + 1
        detalheRequestRef.current = pedido
        setDetalhe({ ...atendimento, servicos: [], pagamentos: [] })
        setDetalheError(null)
        setLoadingDetalhe(true)
        setPagamentoForm({ metodo: "Dinheiro", valor: "" })

        try {
            const res = await getAtendimento(atendimento.id)
            if (pedido !== detalheRequestRef.current) return
            setDetalhe(res.data)
            const saldo = saldoDoAtendimento(res.data)
            setPagamentoForm({
                metodo: "Dinheiro",
                valor: saldo > 0 ? String(saldo) : ""
            })
        } catch (err) {
            if (pedido === detalheRequestRef.current) setDetalheError(getApiError(err))
        } finally {
            if (pedido === detalheRequestRef.current) setLoadingDetalhe(false)
        }
    }, [])

    const fecharDetalhe = useCallback(() => {
        if (savingPagamento) return
        detalheRequestRef.current += 1
        setDetalhe(null)
        setDetalheError(null)
        setLoadingDetalhe(false)
    }, [savingPagamento])

    async function confirmarAnulacao(motivo) {
        if (!anulacao) return
        setAAnular(true)
        try {
            await anularAtendimento(anulacao.id, motivo)
            await carregarAtendimentos()
            if (detalhe?.id === anulacao.id) fecharDetalhe()
            setAnulacao(null)
        } catch (err) {
            const mensagem = getApiError(err)
            setError(mensagem)
            if (detalhe) setDetalheError(mensagem)
            setAnulacao(null)
        } finally {
            setAAnular(false)
        }
    }

    function fecharEdicao() {
        if (salvandoEdicao) return
        setAtendimentoEmEdicao(null)
        setErroEdicao(null)
    }

    async function guardarEdicao(event) {
        event.preventDefault()
        if (!atendimentoEmEdicao || salvandoEdicao) return

        if (!clienteEdicaoId) {
            setErroEdicao("Selecione o cliente do atendimento.")
            return
        }

        if (String(clienteEdicaoId) === String(atendimentoEmEdicao.cliente_id)) {
            setErroEdicao("Selecione um cliente diferente do atual.")
            return
        }

        setSalvandoEdicao(true)
        setErroEdicao(null)

        try {
            await updateAtendimento(atendimentoEmEdicao.id, {
                cliente_id: Number(clienteEdicaoId)
            })
            setAtendimentoEmEdicao(null)
            await carregarAtendimentos()
        } catch (err) {
            setErroEdicao(getApiError(err))
        } finally {
            setSalvandoEdicao(false)
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

    async function handleRegistarPagamento(event) {
        event.preventDefault()
        if (!detalhe || savingPagamento) return

        const saldo = saldoDoAtendimento(detalhe)
        const valor = Number(pagamentoForm.valor)

        if (!valor || valor <= 0) {
            setDetalheError("Indique um valor maior que zero")
            return
        }
        if (valor > saldo) {
            setDetalheError(`O valor não pode exceder o saldo em falta (${formatarMoeda(saldo)})`)
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

    function limparFiltros() {
        setSearchTerm("")
        setFiltro("Todos")
        setPeriodo("Todos")
    }

    function exportarAtendimentos() {
        if (!gridApiRef.current || !atendimentosFiltrados.length) return
        gridApiRef.current.exportDataAsCsv({
            fileName: `atendimentos-${format(new Date(), "yyyy-MM-dd")}.csv`,
            columnKeys: (gridApiRef.current.getColumns() || [])
                .filter((coluna) => coluna.getColId() !== "acoes")
                .map((coluna) => coluna.getColId())
        })
    }

    const columnDefs = useMemo(() => [
        {
            headerName: "Cliente",
            field: "cliente_nome",
            flex: 1.7,
            minWidth: 220,
            cellRenderer: ClienteAtendimentoCell
        },
        {
            headerName: "Data",
            field: "data_hora",
            flex: 1,
            minWidth: 140,
            cellRenderer: DataAtendimentoCell,
            valueFormatter: (params) => formatarData(params.value),
            comparator: (a, b) => new Date(a || 0) - new Date(b || 0)
        },
        {
            headerName: "Estado",
            field: "estado",
            flex: 0,
            width: 130,
            minWidth: 130,
            cellRenderer: EstadoAtendimentoCell
        },
        {
            headerName: "Pagamento",
            field: "metodos_pagamento",
            flex: 1,
            minWidth: 180,
            cellRenderer: PagamentoAtendimentoCell
        },
        {
            headerName: "Total",
            field: "valor_total",
            flex: 0.8,
            minWidth: 125,
            cellRenderer: TotalAtendimentoCell
        },
        {
            headerName: "Ações",
            colId: "acoes",
            flex: 0,
            width: 142,
            minWidth: 142,
            maxWidth: 142,
            pinned: "right",
            sortable: false,
            filter: false,
            resizable: false,
            cellRenderer: AcoesAtendimentoCell,
            cellRendererParams: {
                podeEditar,
                podeAnular,
                onVer: handleVerDetalhe,
                onEditar: handleEditar,
                onAnular: handleAnular
            }
        }
    ], [podeEditar, podeAnular, handleVerDetalhe, handleEditar, handleAnular])

    const mensagemVazia = temFiltros
        ? "Nenhum atendimento corresponde aos filtros aplicados."
        : "Registe o primeiro atendimento para começar a acompanhar o movimento do salão."

    const clientesDetalhe = detalhe ? clientesDoAtendimento(detalhe) : []
    const fidelizacoesDetalhe = new Map(
        (detalhe?.fidelizacoes || []).map((fidelizacao) => [String(fidelizacao.cliente_id), fidelizacao])
    )

    return (
        <>
            {isModalOpen && (
                <NewMarkModal
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={carregarAtendimentos}
                />
            )}

            {anulacao && (
                <ConfirmDialog
                    open
                    title="Apagar atendimento?"
                    description={`O atendimento #${anulacao.id} de ${anulacao.cliente_nome} deixará de contar para o movimento. O histórico e os pagamentos associados são mantidos. Indique o motivo da anulação.`}
                    tone="danger"
                    icon={Trash2}
                    confirmLabel="Apagar atendimento"
                    withReason
                    reasonLabel="Motivo da anulação"
                    reasonPlaceholder="Ex.: cliente desistiu, serviço registado por engano..."
                    loading={aAnular}
                    onConfirm={confirmarAnulacao}
                    onClose={() => !aAnular && setAnulacao(null)}
                />
            )}

            {atendimentoEmEdicao && (
                <div className="appointment-modal-backdrop" onClick={fecharEdicao}>
                    <section
                        className="appointment-detail appointment-edit"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="editar-atendimento-titulo"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="appointment-detail-header">
                            <div>
                                <h2 id="editar-atendimento-titulo">Editar atendimento #{atendimentoEmEdicao.id}</h2>
                                <p>{atendimentoEmEdicao.cliente_nome} {atendimentoEmEdicao.cliente_apelido || ""} · {formatarData(atendimentoEmEdicao.data_hora)}</p>
                            </div>
                            <button
                                type="button"
                                className="appointment-close"
                                onClick={fecharEdicao}
                                disabled={salvandoEdicao}
                                aria-label="Fechar edição"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <form className="appointment-edit-form" onSubmit={guardarEdicao} aria-busy={salvandoEdicao}>
                            <div className="appointment-detail-body">
                                {erroEdicao && <div className="appointment-alert" role="alert">{erroEdicao}</div>}

                                <div className="appointment-detail-section">
                                    <h3><UserRound size={16} /> Cliente</h3>
                                    <div className="appointment-edit-field">
                                        <label htmlFor="cliente-edicao">Cliente do atendimento</label>
                                        {carregandoClientesEdicao ? (
                                            <p className="appointment-empty">A carregar clientes...</p>
                                        ) : (
                                            <select
                                                id="cliente-edicao"
                                                value={clienteEdicaoId}
                                                onChange={(event) => {
                                                    setClienteEdicaoId(event.target.value)
                                                    if (erroEdicao) setErroEdicao(null)
                                                }}
                                                disabled={salvandoEdicao}
                                                aria-describedby="edicao-cliente-hint"
                                            >
                                                <option value="">Selecione o cliente...</option>
                                                {clientesEdicaoDisponiveis.map((cliente) => (
                                                    <option key={cliente.id} value={cliente.id}>
                                                        {cliente.nome} {cliente.apelido || ""}{cliente.telefone ? ` — ${cliente.telefone}` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <p id="edicao-cliente-hint" className="appointment-payment-hint">
                                            A edição altera apenas o cliente associado. Serviços, valores e pagamentos permanecem inalterados.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <footer className="appointment-detail-footer">
                                <button
                                    type="button"
                                    className="appointment-close-btn"
                                    onClick={fecharEdicao}
                                    disabled={salvandoEdicao}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="appointment-edit-submit"
                                    disabled={
                                        salvandoEdicao
                                        || carregandoClientesEdicao
                                        || !clienteEdicaoId
                                        || String(clienteEdicaoId) === String(atendimentoEmEdicao.cliente_id)
                                    }
                                >
                                    {salvandoEdicao ? "A guardar..." : "Guardar alterações"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {detalhe && (
                <div className="appointment-modal-backdrop" onClick={fecharDetalhe}>
                    <section className="appointment-detail" onClick={(event) => event.stopPropagation()}>
                        <header className="appointment-detail-header">
                            <div>
                                <h2>Atendimento #{detalhe.id}</h2>
                                <p>{nomesDosClientes(detalhe)} · {formatarData(detalhe.data_hora)}</p>
                            </div>
                            <button
                                type="button"
                                className="appointment-close"
                                onClick={fecharDetalhe}
                                disabled={savingPagamento}
                                aria-label="Fechar detalhe"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="appointment-detail-body">
                            {detalheError && <div className="appointment-alert">{detalheError}</div>}

                            <div className="appointment-detail-summary">
                                <span className={`status-badge ${classeEstado(detalhe.estado)}`}>
                                    {rotuloEstado(detalhe.estado)}
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
                                <p className="appointment-empty">A carregar informações completas...</p>
                            ) : (
                                <>
                                    <section className="appointment-detail-section">
                                        <h3><UserRound size={16} /> Clientes e serviços</h3>

                                        <div className="appointment-info-grid">
                                            <div>
                                                <span>Clientes</span>
                                                <strong>{clientesDetalhe.length}</strong>
                                            </div>
                                            <div>
                                                <span>Serviços</span>
                                                <strong>{detalhe.servicos?.filter((item) => item.tipo_servico !== "Aplicacao").length || 0}</strong>
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

                                        {clientesDetalhe.length ? clientesDetalhe.map((cliente, index) => {
                                            const servicosCliente = (detalhe.servicos || []).filter((item) => (
                                                String(item.cliente_id) === String(cliente.cliente_id)
                                            ))
                                            const principais = servicosCliente.filter((item) => item.tipo_servico !== "Aplicacao")
                                            const aplicacoes = servicosCliente.filter((item) => item.tipo_servico === "Aplicacao")
                                            const fidelizacao = fidelizacoesDetalhe.get(String(cliente.cliente_id))
                                            const selecionado = servicosCliente.find((item) => item.fidelizacao_selecionada)
                                            const gratuito = servicosCliente.find((item) => (
                                                item.tipo_servico !== "Aplicacao"
                                                && Number(item.preco_original) > 0
                                                && Number(item.valor_final) === 0
                                            ))

                                            return (
                                                <div className="appointment-client-block" key={cliente.cliente_id}>
                                                    <div className="appointment-client-block-head">
                                                        <div>
                                                            <strong>Cliente {index + 1} · {nomeClienteAtendimento(cliente)}</strong>
                                                            <small>
                                                                <Phone size={12} /> {cliente.cliente_telefone || "—"}
                                                            </small>
                                                        </div>
                                                        <span>
                                                            {Number(cliente.total_servicos ?? principais.length)} serviço(s)
                                                            {Number(cliente.total_aplicacoes ?? aplicacoes.length) > 0
                                                                ? ` · ${Number(cliente.total_aplicacoes ?? aplicacoes.length)} aplicação(ões)`
                                                                : ""}
                                                            {" · "}
                                                            <strong>{formatarMoeda(cliente.subtotal)}</strong>
                                                        </span>
                                                    </div>

                                                    {principais.length > 0 ? (
                                                        <ul className="appointment-services">
                                                            {principais.map((item) => {
                                                                const aplicacoesDoServico = aplicacoes.filter((aplicacao) => (
                                                                    String(aplicacao.servico_principal_id) === String(item.id)
                                                                ))
                                                                const itemGratuito = Number(item.preco_original) > 0 && Number(item.valor_final) === 0

                                                                return (
                                                                    <li key={item.id}>
                                                                        <span className="appointment-service-info">
                                                                            <span className="appointment-service-name">
                                                                                <ScissorsIcon size={16} />
                                                                                {item.servico_nome}
                                                                                {item.fidelizacao_selecionada && (
                                                                                    <span className="appointment-loyalty-tag">
                                                                                        <Heart size={11} /> Fidelização
                                                                                    </span>
                                                                                )}
                                                                                {itemGratuito && (
                                                                                    <span className="appointment-loyalty-tag free">
                                                                                        <Gift size={11} /> 6.º grátis
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                            <small>
                                                                                {item.categoria_nome || "Sem categoria"}
                                                                                {item.modalidade_nome ? ` · ${item.modalidade_nome}` : ""}
                                                                            </small>
                                                                        </span>
                                                                        <span>{item.funcionario_nome}</span>
                                                                        <strong>{formatarMoeda(item.valor_final)}</strong>

                                                                        {aplicacoesDoServico.length > 0 && (
                                                                            <ul className="appointment-applications">
                                                                                {aplicacoesDoServico.map((aplicacao) => (
                                                                                    <li key={aplicacao.id}>
                                                                                        <span>
                                                                                            <Tag size={12} />
                                                                                            {aplicacao.servico_nome}
                                                                                        </span>
                                                                                        <span>{aplicacao.funcionario_nome}</span>
                                                                                        <strong>{formatarMoeda(aplicacao.valor_final)}</strong>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="appointment-empty">Nenhum serviço associado a este cliente.</p>
                                                    )}

                                                    <div className="appointment-client-loyalty">
                                                        <div>
                                                            <span>Fidelização</span>
                                                            <strong>
                                                                {selecionado
                                                                    ? `Conta: ${selecionado.servico_nome}`
                                                                    : "Não conta neste atendimento"}
                                                                {gratuito ? ` · 6.º grátis: ${gratuito.servico_nome}` : ""}
                                                            </strong>
                                                        </div>
                                                        <FidelizacaoCard fidelizacao={fidelizacao} compact />
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <p className="appointment-empty">Nenhum cliente associado.</p>
                                        )}

                                        <div className="appointment-totals">
                                            <span>Bruto <strong>{formatarMoeda(detalhe.valor_bruto)}</strong></span>
                                            {Number(detalhe.valor_desconto) > 0 && (
                                                <span>Benefícios <strong>{formatarMoeda(detalhe.valor_desconto)}</strong></span>
                                            )}
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
                                            <p className="appointment-empty">Ainda não existem pagamentos registados.</p>
                                        )}
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
                                                            onChange={(event) => alterarPagamento("metodo", event.target.value)}
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
                                                            onChange={(event) => alterarPagamento("valor", event.target.value)}
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
                                            Motivo da anulação: {detalhe.motivo_anulacao}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <footer className="appointment-detail-footer">
                            {podeAnular && detalhe.estado !== "Anulado" && (
                                <button
                                    type="button"
                                    className="appointment-cancel-btn"
                                    onClick={() => handleAnular(detalhe)}
                                    disabled={savingPagamento}
                                >
                                    <Ban size={16} /> Anular atendimento
                                </button>
                            )}
                            <button
                                type="button"
                                className="appointment-close-btn"
                                onClick={fecharDetalhe}
                                disabled={savingPagamento}
                            >
                                Fechar
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            <div className="newbookmark-main">
                <Sidebar
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
                    sidebarOpen={isSidebarOpen}
                />
                <section className="newbookmark-content mgmt-page">
                    <header className="mgmt-hero">
                        <div className="mgmt-hero-copy">
                            <span className="mgmt-eyebrow">
                                <Sparkles size={13} />
                                Movimento do salão
                            </span>
                            <h2 className="mgmt-title">Atendimentos sem perder o ritmo</h2>
                            <p className="mgmt-subtitle">
                                Registe novos serviços, acompanhe pagamentos e consulte o histórico
                                completo de cada cliente.
                            </p>
                        </div>
                        <div className="mgmt-hero-actions">
                            <button
                                type="button"
                                className="mgmt-btn primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <CalendarPlus size={17} />
                                Novo atendimento
                            </button>
                        </div>
                    </header>

                    <section className="mgmt-metrics" aria-label="Resumo de atendimentos">
                        <article className="mgmt-metric warning">
                            <span className="mgmt-metric-icon"><CalendarPlus size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Em andamento</span>
                                <strong className="mgmt-metric-value">{emAndamento}</strong>
                                <span className="mgmt-metric-hint">A aguardar conclusão</span>
                            </span>
                        </article>
                        <article className="mgmt-metric success">
                            <span className="mgmt-metric-icon"><CheckCircle2 size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Pagos</span>
                                <strong className="mgmt-metric-value">{pagos}</strong>
                                <span className="mgmt-metric-hint">Atendimentos liquidados</span>
                            </span>
                        </article>
                        <article className="mgmt-metric primary">
                            <span className="mgmt-metric-icon"><Wallet size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Total recebido</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(totalRecebido)}</strong>
                                <span className="mgmt-metric-hint">Pagamentos registados</span>
                            </span>
                        </article>
                        <article className="mgmt-metric danger">
                            <span className="mgmt-metric-icon"><Receipt size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Por receber</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(totalPendente)}</strong>
                                <span className="mgmt-metric-hint">Saldo em aberto</span>
                            </span>
                        </article>
                        <article className="mgmt-metric info">
                            <span className="mgmt-metric-icon"><Clock3 size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Atendimentos hoje</span>
                                <strong className="mgmt-metric-value">{atendimentosHoje}</strong>
                                <span className="mgmt-metric-hint">Movimento do dia</span>
                            </span>
                        </article>
                    </section>

                    {error && (
                        <div className="mgmt-alert" role="alert">
                            <AlertCircle size={17} />
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)}>Fechar</button>
                        </div>
                    )}

                    <div className="mgmt-filter-tabs" aria-label="Filtrar por estado">
                        {ESTADOS.map((estado) => (
                            <button
                                key={estado}
                                type="button"
                                aria-pressed={filtro === estado}
                                className={`mgmt-filter-tab ${filtro === estado ? "active" : ""}`}
                                onClick={() => setFiltro(estado)}
                            >
                                {rotuloEstado(estado)}
                                <span className="mgmt-filter-count">{contagemEstados[estado] || 0}</span>
                            </button>
                        ))}
                    </div>

                    <section className="mgmt-toolbar" aria-label="Filtros de atendimentos">
                        <div className="mgmt-search">
                            <Search size={17} />
                            <input
                                type="search"
                                placeholder="Pesquisar por cliente, telefone ou número..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                aria-label="Pesquisar atendimentos"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="mgmt-search-clear"
                                    onClick={() => setSearchTerm("")}
                                    aria-label="Limpar pesquisa"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="mgmt-select-wrap">
                            <select
                                className="mgmt-select"
                                value={periodo}
                                onChange={(event) => setPeriodo(event.target.value)}
                                aria-label="Filtrar por período"
                            >
                                {PERIODOS.map((opcao) => (
                                    <option key={opcao} value={opcao}>
                                        {opcao === "Todos" ? "Todo o período" : opcao}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <span className="mgmt-toolbar-meta">
                            <strong>{atendimentosFiltrados.length}</strong>
                            de {atendimentos.length} atendimentos
                        </span>

                        <div className="mgmt-toolbar-actions">
                            <button
                                type="button"
                                className="mgmt-tool export"
                                onClick={exportarAtendimentos}
                                disabled={!atendimentosFiltrados.length}
                                title="Exportar lista em CSV"
                            >
                                <Download size={16} />
                                Exportar
                            </button>
                            <button
                                type="button"
                                className="mgmt-tool icon-only"
                                onClick={carregarAtendimentos}
                                disabled={loading}
                                title="Actualizar lista"
                                aria-label="Actualizar lista de atendimentos"
                            >
                                <RefreshCw size={16} className={loading ? "mgmt-spin" : ""} />
                            </button>
                        </div>
                    </section>

                    <DataGrid
                        rowData={atendimentosFiltrados}
                        columnDefs={columnDefs}
                        loading={loading}
                        onGridReady={(params) => { gridApiRef.current = params.api }}
                        onRowDoubleClicked={(event) => handleVerDetalhe(event.data)}
                        emptyIcon={error ? AlertCircle : temFiltros ? Search : CalendarPlus}
                        emptyTitle={error ? "Não foi possível carregar" : temFiltros ? "Sem resultados" : "Ainda não há atendimentos"}
                        emptyMessage={error ? "Verifique a ligação ao servidor e tente novamente." : mensagemVazia}
                        emptyAction={error ? (
                            <button type="button" className="mgmt-btn ghost" onClick={carregarAtendimentos}>
                                <RefreshCw size={16} />
                                Tentar novamente
                            </button>
                        ) : temFiltros ? (
                            <button type="button" className="mgmt-btn ghost" onClick={limparFiltros}>
                                Limpar filtros
                            </button>
                        ) : (
                            <button type="button" className="mgmt-btn primary" onClick={() => setIsModalOpen(true)}>
                                <CalendarPlus size={16} />
                                Novo atendimento
                            </button>
                        )}
                    />
                </section>
            </div>
        </>
    )
}

export default NovoAtendimento
