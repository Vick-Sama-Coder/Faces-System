import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import ClientModal from "../../components/Modals/ClientModal/ClientModal.jsx"
import CartaoClienteModal from "../../components/Modals/CartaoClienteModal/CartaoClienteModal.jsx"
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import "./clientes.css"
import "../../Styles/management.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, isSameMonth, isValid, parseISO } from "date-fns"
import { pt } from "date-fns/locale"
import {
    AlertCircle,
    ChevronDown,
    Clock,
    Download,
    Edit3,
    Heart,
    Phone,
    Plus,
    Power,
    RefreshCw,
    Search,
    Sparkles,
    UserCheck,
    Users,
    UserX,
    X
} from "lucide-react"
import { getClientes, updateClienteEstado, getApiError, deleteCliente } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function formatarData(valor) {
    if (!valor) return "—"
    const data = typeof valor === "string" ? parseISO(valor) : new Date(valor)
    if (!isValid(data)) return "—"
    return format(data, "dd MMM yyyy", { locale: pt })
}

function iniciais(nome, apelido) {
    const partes = `${nome || ""} ${apelido || ""}`.trim().split(/\s+/).filter(Boolean)
    if (!partes.length) return "CL"
    const primeira = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
    return `${primeira}${ultima}`.toUpperCase()
}

async function buscarClientes() {
    const res = await getClientes()
    return Array.isArray(res.data) ? res.data : (res.data?.clientes || [])
}

function ClienteCell({ data }) {
    return (
        <div className="mgmt-user-cell">
            <span className="mgmt-avatar customer name-icon">{iniciais(data.nome, data.apelido)}</span>
            <span className="mgmt-user-copy">
                <strong>{data.nome} {data.apelido || ""}</strong>
                <small>Cliente #{data.id}</small>
            </span>
        </div>
    )
}

function TelefoneCell({ value }) {
    return (
        <span className="mgmt-inline-meta">
            <Phone size={13} />
            {value || "Sem telefone"}
        </span>
    )
}

function EstadoCell({ value }) {
    const ativo = value === "Ativo"
    return (
        <span className={`mgmt-badge ${ativo ? "success" : "neutral"}`}>
            <span className="mgmt-badge-dot" />
            {value || "Ativo"}
        </span>
    )
}

function SaldoCell({ value }) {
    const saldo = Math.max(Number(value) || 0, 0)
    return (
        <div className="mgmt-cell-stack">
            <span className={`mgmt-money ${saldo > 0 ? "pending" : "settled"}`}>
                {formatarMoeda(saldo)}
            </span>
            <small>{saldo > 0 ? "Saldo em dívida" : "Sem pendências"}</small>
        </div>
    )
}

function AcoesCell({ data, onEditar, onAlternar, onCartao, podeCartao }) {
    const ativo = (data.estado || "Ativo") === "Ativo"
    return (
        <div className="mgmt-row-actions">
            {podeCartao && (
                <button
                    type="button"
                    className="mgmt-row-btn warning"
                    onClick={() => onCartao(data)}
                    title="Cartão de cliente"
                    aria-label={`Abrir cartão de ${data.nome}`}
                >
                    <Heart size={16} />
                </button>
            )}
            <button
                type="button"
                className="mgmt-row-btn edit"
                onClick={() => onEditar(data)}
                title="Editar cliente"
                aria-label={`Editar ${data.nome}`}
            >
                <Edit3 size={16} />
            </button>
            <button
                type="button"
                className={`mgmt-row-btn ${ativo ? "danger" : "success"}`}
                onClick={() => onAlternar(data)}
                title={ativo ? "Desactivar cliente" : "Reactivar cliente"}
                aria-label={ativo ? `Desactivar ${data.nome}` : `Reactivar ${data.nome}`}
            >
                <Power size={16} />
            </button>
        </div>
    )
}

function Clientes() {
    const { user } = useAuthStore()
    const podeEscrever = user?.permissoes?.includes("clientes:escrever")
    const isAdmin = user?.perfil === "Administrador"
    const podeGerirCartao = podeEscrever && isAdmin
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCliente, setEditingCliente] = useState(null)
    const [cartaoCliente, setCartaoCliente] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [estadoFiltro, setEstadoFiltro] = useState("Todos")
    const [confirmacao, setConfirmacao] = useState(null)
    const [aConfirmar, setAConfirmar] = useState(false)
    const gridApiRef = useRef(null)

    const carregarClientes = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setClientes(await buscarClientes())
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let activo = true

        buscarClientes()
            .then((lista) => {
                if (!activo) return
                setClientes(lista)
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

    const handleNovoCliente = useCallback(() => {
        setEditingCliente(null)
        setIsModalOpen(true)
    }, [])

    const handleEditarCliente = useCallback((cliente) => {
        setEditingCliente(cliente)
        setIsModalOpen(true)
    }, [])

    const handleCartaoCliente = useCallback((cliente) => {
        setCartaoCliente(cliente)
    }, [])

    const handleAlternarEstado = useCallback((cliente) => {
        setConfirmacao(cliente)
    }, [])

    const handleApagarCliente = useCallback(async (cliente) => {
    const confirmar = window.confirm(
        `Tens a certeza que desejas apagar o cliente ${cliente.nome}?`
    )

    if (!confirmar) return

    try {
        await deleteCliente(cliente.id)
        await carregarClientes()
    } catch (err) {
        setError(getApiError(err))
    }
}, [carregarClientes])

    async function confirmarAlternarEstado() {
        if (!confirmacao) return
        const ativo = (confirmacao.estado || "Ativo") === "Ativo"
        setAConfirmar(true)
        try {
            await updateClienteEstado(confirmacao.id, ativo ? "Inativo" : "Ativo")
            setConfirmacao(null)
            await carregarClientes()
        } catch (err) {
            setError(getApiError(err))
            setConfirmacao(null)
        } finally {
            setAConfirmar(false)
        }
    }

    async function handleSucesso() {
        setIsModalOpen(false)
        setEditingCliente(null)
        await carregarClientes()
    }

    const clientesFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()

        return clientes.filter((cliente) => {
            const correspondeEstado = estadoFiltro === "Todos" || (cliente.estado || "Ativo") === estadoFiltro
            if (!correspondeEstado) return false
            if (!termo) return true

            const nome = `${cliente.nome || ""} ${cliente.apelido || ""}`.toLowerCase()
            const telefone = String(cliente.telefone || "")
            return nome.includes(termo) || telefone.includes(termo)
        })
    }, [clientes, searchTerm, estadoFiltro])

    const temFiltros = Boolean(searchTerm.trim() || estadoFiltro !== "Todos")
    const totalClientes = clientes.length
    const clientesActivos = clientes.filter((cliente) => (cliente.estado || "Ativo") === "Ativo").length
    const clientesInativos = totalClientes - clientesActivos
    const novosEsteMes = clientes.filter((cliente) => {
        if (!cliente.data_registo) return false
        const data = typeof cliente.data_registo === "string"
            ? parseISO(cliente.data_registo)
            : new Date(cliente.data_registo)
        return isValid(data) && isSameMonth(data, new Date())
    }).length

    const columnDefs = useMemo(() => {
        const columns = [
            {
                headerName: "Cliente",
                field: "nome",
                flex: 1.8,
                minWidth: 225,
                cellRenderer: ClienteCell
            },
            {
                headerName: "Telefone",
                field: "telefone",
                flex: 1,
                minWidth: 155,
                cellRenderer: TelefoneCell
            },
            {
                headerName: "Estado",
                field: "estado",
                flex: 0,
                width: 120,
                minWidth: 120,
                cellRenderer: EstadoCell
            },
            {
                headerName: "Registo",
                field: "data_registo",
                flex: 1,
                minWidth: 135,
                valueFormatter: (params) => formatarData(params.value),
                comparator: (a, b) => new Date(a || 0) - new Date(b || 0)
            },
            {
                headerName: "Saldo",
                field: "saldo_pendente",
                flex: 1,
                minWidth: 140,
                cellRenderer: SaldoCell
            }
        ]

        if (podeEscrever) {
            columns.push({
                headerName: "Ações",
                colId: "acoes",
                flex: 0,
                width: podeGerirCartao ? 138 : 102,
                minWidth: podeGerirCartao ? 138 : 102,
                maxWidth: podeGerirCartao ? 138 : 102,
                pinned: "right",
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: AcoesCell,
                cellRendererParams: {
                    onEditar: handleEditarCliente,
                    onAlternar: handleAlternarEstado,
                    onCartao: handleCartaoCliente,
                    podeCartao: podeGerirCartao,
                    onApagar: handleApagarCliente
                }
            })
        }

        return columns
    }, [podeEscrever, podeGerirCartao, handleEditarCliente, handleAlternarEstado, handleCartaoCliente, handleApagarCliente])

    function limparFiltros() {
        setSearchTerm("")
        setEstadoFiltro("Todos")
    }

    function exportarClientes() {
        if (!gridApiRef.current || !clientesFiltrados.length) return
        gridApiRef.current.exportDataAsCsv({
            fileName: `clientes-${format(new Date(), "yyyy-MM-dd")}.csv`,
            columnKeys: (gridApiRef.current.getColumns() || [])
                .filter((coluna) => coluna.getColId() !== "acoes")
                .map((coluna) => coluna.getColId())
        })
    }

    const mensagemVazia = temFiltros
        ? "Nenhum cliente corresponde aos filtros aplicados."
        : podeEscrever
            ? "Registe o primeiro cliente para começar a acompanhar a sua base."
            : "Ainda não existem clientes registados."

    return (
        <>
            {isModalOpen && (
                <ClientModal
                    cliente={editingCliente}
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={handleSucesso}
                />
            )}

            {cartaoCliente && (
                <CartaoClienteModal
                    key={cartaoCliente.id}
                    cliente={cartaoCliente}
                    onclose={() => setCartaoCliente(null)}
                />
            )}

            {confirmacao && (
                <ConfirmDialog
                    open
                    title={(confirmacao.estado || "Ativo") === "Ativo" ? "Desactivar cliente?" : "Reactivar cliente?"}
                    description={`${confirmacao.nome} ${confirmacao.apelido || ""} ${(confirmacao.estado || "Ativo") === "Ativo"
                        ? "deixará de aparecer como cliente ativo. Pode reactivá-lo mais tarde."
                        : "voltar a ficar disponível para novos atendimentos."}`}
                    tone={(confirmacao.estado || "Ativo") === "Ativo" ? "danger" : "primary"}
                    icon={Power}
                    confirmLabel={(confirmacao.estado || "Ativo") === "Ativo" ? "Desactivar" : "Reactivar"}
                    loading={aConfirmar}
                    onConfirm={confirmarAlternarEstado}
                    onClose={() => !aConfirmar && setConfirmacao(null)}
                />
            )}

            <div className="clientes-main">
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="clientes-header"
                    title="Clientes"
                    h1Class="clientes-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                    sidebarOpen={isSidebarOpen}
                />
                <section className="clientes-content mgmt-page">
                    <header className="mgmt-hero">
                        <div className="mgmt-hero-copy">
                            <span className="mgmt-eyebrow">
                                <Sparkles size={13} />
                                Gestão de clientes
                            </span>
                            <h2 className="mgmt-title">A sua base de clientes</h2>
                            <p className="mgmt-subtitle">
                                Consulte contactos, acompanhe saldos e mantenha cada ficha actualizada
                                num só lugar.
                            </p>
                        </div>
                        {podeEscrever && (
                            <div className="mgmt-hero-actions">
                                <button type="button" className="mgmt-btn primary" onClick={handleNovoCliente}>
                                    <Plus size={17} />
                                    Novo cliente
                                </button>
                            </div>
                        )}
                    </header>

                    <section className="mgmt-metrics" aria-label="Resumo de clientes">
                        <article className="mgmt-metric primary">
                            <span className="mgmt-metric-icon"><Users size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Total de clientes</span>
                                <strong className="mgmt-metric-value">{totalClientes}</strong>
                                <span className="mgmt-metric-hint">Fichas registadas</span>
                            </span>
                        </article>
                        <article className="mgmt-metric success">
                            <span className="mgmt-metric-icon"><UserCheck size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Clientes activos</span>
                                <strong className="mgmt-metric-value">{clientesActivos}</strong>
                                <span className="mgmt-metric-hint">Disponíveis para atendimento</span>
                            </span>
                        </article>
                        <article className="mgmt-metric warning">
                            <span className="mgmt-metric-icon"><UserX size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Clientes inactivos</span>
                                <strong className="mgmt-metric-value">{clientesInativos}</strong>
                                <span className="mgmt-metric-hint">Podem ser reactivados</span>
                            </span>
                        </article>
                        <article className="mgmt-metric info">
                            <span className="mgmt-metric-icon"><Clock size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Novos este mês</span>
                                <strong className="mgmt-metric-value">{novosEsteMes}</strong>
                                <span className="mgmt-metric-hint">Adicionados recentemente</span>
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

                    <section className="mgmt-toolbar" aria-label="Filtros de clientes">
                        <div className="mgmt-search">
                            <Search size={17} />
                            <input
                                type="search"
                                placeholder="Pesquisar por nome ou telefone..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                aria-label="Pesquisar clientes"
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
                                value={estadoFiltro}
                                onChange={(event) => setEstadoFiltro(event.target.value)}
                                aria-label="Filtrar por estado"
                            >
                                <option value="Todos">Todos os estados</option>
                                <option value="Ativo">Clientes activos</option>
                                <option value="Inativo">Clientes inactivos</option>
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <span className="mgmt-toolbar-meta">
                            <strong>{clientesFiltrados.length}</strong>
                            de {totalClientes} clientes
                        </span>

                        <div className="mgmt-toolbar-actions">
                            <button
                                type="button"
                                className="mgmt-tool export"
                                onClick={exportarClientes}
                                disabled={!clientesFiltrados.length}
                                title="Exportar lista em CSV"
                            >
                                <Download size={16} />
                                Exportar
                            </button>
                            <button
                                type="button"
                                className="mgmt-tool icon-only"
                                onClick={carregarClientes}
                                disabled={loading}
                                title="Actualizar lista"
                                aria-label="Actualizar lista de clientes"
                            >
                                <RefreshCw size={16} className={loading ? "mgmt-spin" : ""} />
                            </button>
                        </div>
                    </section>

                    <DataGrid
                        rowData={clientesFiltrados}
                        columnDefs={columnDefs}
                        loading={loading}
                        onGridReady={(params) => { gridApiRef.current = params.api }}
                        onRowDoubleClicked={podeEscrever ? (event) => handleEditarCliente(event.data) : undefined}
                        emptyIcon={error ? AlertCircle : temFiltros ? Search : Users}
                        emptyTitle={error ? "Não foi possível carregar" : temFiltros ? "Sem resultados" : "Ainda não há clientes"}
                        emptyMessage={error ? "Verifique a ligação ao servidor e tente novamente." : mensagemVazia}
                        emptyAction={error ? (
                            <button type="button" className="mgmt-btn ghost" onClick={carregarClientes}>
                                <RefreshCw size={16} />
                                Tentar novamente
                            </button>
                        ) : temFiltros ? (
                            <button type="button" className="mgmt-btn ghost" onClick={limparFiltros}>
                                Limpar filtros
                            </button>
                        ) : podeEscrever ? (
                            <button type="button" className="mgmt-btn primary" onClick={handleNovoCliente}>
                                <Plus size={16} />
                                Adicionar cliente
                            </button>
                        ) : null}
                    />
                </section>
            </div>
        </>
    )
}

export default Clientes
