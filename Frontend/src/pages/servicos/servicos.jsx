import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import ServicoModal from "../../components/Modals/ServicoModal/ServicoModal.jsx"
import FidelizacaoModal from "../../components/Modals/FidelizacaoModal/FidelizacaoModal.jsx"
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import "./servicos.css"
import "../../Styles/management.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    AlertCircle,
    ChevronDown,
    Clock,
    DollarSign,
    Download,
    Edit3,
    Heart,
    Plus,
    Power,
    RefreshCw,
    Scissors,
    Search,
    Sparkles,
    Tags,
    Trash2,
    X
} from "lucide-react"
import { getServicos, deleteServico, updateServicoEstado, getApiError } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

async function buscarServicos() {
    const res = await getServicos({ estado: "todos" })
    return Array.isArray(res.data) ? res.data : (res.data?.servicos || [])
}

function ServicoCell({ data }) {
    return (
        <div className="mgmt-service-cell">
            <span className="mgmt-icon-box name-icon"><Scissors size={17} /></span>
            <span className="mgmt-service-copy">
                <strong>{data.nome}</strong>
                <small>{data.descricao || "Sem descrição registada"}</small>
            </span>
        </div>
    )
}

function CategoriaCell({ value }) {
    return <span className="mgmt-category-tag">{value || "Sem categoria"}</span>
}

function PrecoCell({ value }) {
    return (
        <div className="mgmt-cell-stack">
            <span className="mgmt-money">{formatarMoeda(value)}</span>
            <small>Valor base</small>
        </div>
    )
}

function DuracaoCell({ value }) {
    if (!value) return <span className="mgmt-inline-meta">—</span>
    return (
        <span className="mgmt-inline-meta">
            <Clock size={13} />
            {value} min
        </span>
    )
}

function FidelizacaoCell({ value }) {
    return value ? (
        <span className="mgmt-loyalty">
            <Heart size={13} />
            Elegível
        </span>
    ) : (
        <span className="mgmt-badge neutral">Não elegível</span>
    )
}

function EstadoCell({ value }) {
    const ativo = (value || "Ativo") === "Ativo"
    return (
        <span className={`mgmt-badge ${ativo ? "success" : "neutral"}`}>
            <span className="mgmt-badge-dot" />
            {value || "Ativo"}
        </span>
    )
}

function AcoesCell({ data, onEditar, onAlternar, onEliminar }) {
    const ativo = (data.estado || "Ativo") === "Ativo"
    return (
        <div className="mgmt-row-actions">
            <button
                type="button"
                className="mgmt-row-btn edit"
                onClick={() => onEditar(data)}
                title="Editar serviço"
                aria-label={`Editar ${data.nome}`}
            >
                <Edit3 size={16} />
            </button>
            <button
                type="button"
                className={`mgmt-row-btn ${ativo ? "warning" : "success"}`}
                onClick={() => onAlternar(data)}
                title={ativo ? "Desactivar serviço" : "Reactivar serviço"}
                aria-label={ativo ? `Desactivar ${data.nome}` : `Reactivar ${data.nome}`}
            >
                <Power size={16} />
            </button>
            <button
                type="button"
                className="mgmt-row-btn danger"
                onClick={() => onEliminar(data)}
                title="Eliminar serviço"
                aria-label={`Eliminar ${data.nome}`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    )
}

function Servicos() {
    const { user } = useAuthStore()
    const podeEscrever = user?.permissoes?.includes("servicos:escrever")
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [servicos, setServicos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isFidelizacaoOpen, setIsFidelizacaoOpen] = useState(false)
    const [editingServico, setEditingServico] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [categoriaFiltro, setCategoriaFiltro] = useState("")
    const [servicoFiltro, setServicoFiltro] = useState("")
    const [estadoFiltro, setEstadoFiltro] = useState("Todos")
    const [confirmacao, setConfirmacao] = useState(null)
    const [aConfirmar, setAConfirmar] = useState(false)
    const gridApiRef = useRef(null)

    const carregarServicos = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setServicos(await buscarServicos())
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let activo = true

        buscarServicos()
            .then((lista) => {
                if (!activo) return
                setServicos(lista)
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

    const handleNovoServico = useCallback(() => {
        setEditingServico(null)
        setIsModalOpen(true)
    }, [])

    const handleEditarServico = useCallback((servico) => {
        setEditingServico(servico)
        setIsModalOpen(true)
    }, [])

    const handleAlternarEstado = useCallback((servico) => {
        setConfirmacao({ tipo: "estado", servico })
    }, [])

    const handleEliminarServico = useCallback((servico) => {
        setConfirmacao({ tipo: "eliminar", servico })
    }, [])

    async function confirmarAcao() {
        if (!confirmacao) return
        const { tipo, servico } = confirmacao
        setAConfirmar(true)

        try {
            if (tipo === "eliminar") {
                await deleteServico(servico.id)
            } else {
                await updateServicoEstado(servico.id, (servico.estado || "Ativo") === "Ativo" ? "Inativo" : "Ativo")
            }
            setConfirmacao(null)
            await carregarServicos()
        } catch (err) {
            setError(getApiError(err))
            setConfirmacao(null)
        } finally {
            setAConfirmar(false)
        }
    }

    async function handleSucesso() {
        setIsModalOpen(false)
        setEditingServico(null)
        await carregarServicos()
    }

    const categorias = useMemo(() => {
        const mapa = new Map()
        servicos.forEach((servico) => {
            if (servico.categoria_id && servico.categoria_nome) {
                mapa.set(String(servico.categoria_id), servico.categoria_nome)
            }
        })
        return [...mapa.entries()]
            .map(([id, nome]) => ({ id, nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
    }, [servicos])

    const servicosDaCategoria = useMemo(() => {
        if (!categoriaFiltro) return servicos
        return servicos.filter((servico) => String(servico.categoria_id) === categoriaFiltro)
    }, [servicos, categoriaFiltro])

    const servicosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()

        return servicosDaCategoria.filter((servico) => {
            const estado = servico.estado || "Ativo"
            const correspondeEstado = estadoFiltro === "Todos" || estado === estadoFiltro
            if (!correspondeEstado) return false

            const correspondeServico = !servicoFiltro || String(servico.id) === servicoFiltro
            if (!correspondeServico) return false
            if (!termo) return true

            const nome = String(servico.nome || "").toLowerCase()
            const categoria = String(servico.categoria_nome || "").toLowerCase()
            const descricao = String(servico.descricao || "").toLowerCase()
            return nome.includes(termo) || categoria.includes(termo) || descricao.includes(termo)
        })
    }, [servicosDaCategoria, servicoFiltro, searchTerm, estadoFiltro])

    const temFiltros = Boolean(searchTerm.trim() || categoriaFiltro || servicoFiltro || estadoFiltro !== "Todos")
    const totalServicos = servicos.length
    const servicosActivos = servicos.filter((servico) => (servico.estado || "Ativo") === "Ativo").length
    const totalReceita = servicos.reduce((acc, servico) => acc + (Number(servico.valor) || 0), 0)
    const precoMedio = totalServicos > 0 ? totalReceita / totalServicos : 0

    const columnDefs = useMemo(() => {
        const columns = [
            {
                headerName: "Serviço",
                field: "nome",
                flex: 2,
                minWidth: 240,
                cellRenderer: ServicoCell
            },
            {
                headerName: "Categoria",
                field: "categoria_nome",
                flex: 1,
                minWidth: 145,
                cellRenderer: CategoriaCell
            },
            {
                headerName: "Preço",
                field: "valor",
                flex: 1,
                minWidth: 130,
                cellRenderer: PrecoCell
            },
            {
                headerName: "Duração",
                field: "duracao_min",
                flex: 0,
                width: 115,
                minWidth: 115,
                cellRenderer: DuracaoCell
            },
            {
                headerName: "Fidelização",
                field: "elegivel_fidelizacao",
                flex: 0,
                width: 130,
                minWidth: 130,
                cellRenderer: FidelizacaoCell
            },
            {
                headerName: "Estado",
                field: "estado",
                flex: 0,
                width: 118,
                minWidth: 118,
                cellRenderer: EstadoCell
            }
        ]

        if (podeEscrever) {
            columns.push({
                headerName: "Ações",
                colId: "acoes",
                flex: 0,
                width: 146,
                minWidth: 146,
                maxWidth: 146,
                pinned: "right",
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: AcoesCell,
                cellRendererParams: {
                    onEditar: handleEditarServico,
                    onAlternar: handleAlternarEstado,
                    onEliminar: handleEliminarServico
                }
            })
        }

        return columns
    }, [podeEscrever, handleEditarServico, handleAlternarEstado, handleEliminarServico])

    function limparFiltros() {
        setSearchTerm("")
        setCategoriaFiltro("")
        setServicoFiltro("")
        setEstadoFiltro("Todos")
    }

    function exportarServicos() {
        if (!gridApiRef.current || !servicosFiltrados.length) return
        gridApiRef.current.exportDataAsCsv({
            fileName: `servicos-${new Date().toISOString().slice(0, 10)}.csv`,
            columnKeys: (gridApiRef.current.getColumns() || [])
                .filter((coluna) => coluna.getColId() !== "acoes")
                .map((coluna) => coluna.getColId())
        })
    }

    const aEliminar = confirmacao?.tipo === "eliminar"
    const servicoConfirmacaoAtivo = (confirmacao?.servico.estado || "Ativo") === "Ativo"
    const mensagemVazia = temFiltros
        ? "Nenhum serviço corresponde aos filtros aplicados."
        : podeEscrever
            ? "Crie o primeiro serviço para começar a receber atendimentos."
            : "Ainda não existem serviços no catálogo."

    return (
        <>
            {isModalOpen && (
                <ServicoModal
                    servico={editingServico}
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={handleSucesso}
                />
            )}

            {isFidelizacaoOpen && (
                <FidelizacaoModal
                    servicos={servicos}
                    onclose={() => setIsFidelizacaoOpen(false)}
                    onSuccess={carregarServicos}
                />
            )}

            {confirmacao && (
                <ConfirmDialog
                    open
                    title={aEliminar ? "Eliminar serviço?" : servicoConfirmacaoAtivo ? "Desactivar serviço?" : "Reactivar serviço?"}
                    description={aEliminar
                        ? `O serviço "${confirmacao.servico.nome}" será eliminado definitivamente. Esta ação não pode ser revertida.`
                        : `O serviço "${confirmacao.servico.nome}" ${servicoConfirmacaoAtivo
                            ? "deixará de estar disponível para novos atendimentos."
                            : "voltará a estar disponível para novos atendimentos."}`}
                    tone={aEliminar || servicoConfirmacaoAtivo ? "danger" : "primary"}
                    icon={aEliminar ? Trash2 : Power}
                    confirmLabel={aEliminar ? "Eliminar" : servicoConfirmacaoAtivo ? "Desactivar" : "Reactivar"}
                    loading={aConfirmar}
                    onConfirm={confirmarAcao}
                    onClose={() => !aConfirmar && setConfirmacao(null)}
                />
            )}

            <div className="servicos-main">
                <SideBar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="servicos-header"
                    title="Serviços"
                    h1Class="servicos-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="servicos-content mgmt-page">
                    <header className="mgmt-hero">
                        <div className="mgmt-hero-copy">
                            <span className="mgmt-eyebrow">
                                <Sparkles size={13} />
                                Catálogo do salão
                            </span>
                            <h2 className="mgmt-title">Serviços com identidade</h2>
                            <p className="mgmt-subtitle">
                                Organize o catálogo por categorias, ajuste preços e destaque os serviços
                                que acumulam pontos de fidelização.
                            </p>
                        </div>
                        {podeEscrever && (
                            <div className="mgmt-hero-actions">
                                <button
                                    type="button"
                                    className="mgmt-btn secondary"
                                    onClick={() => setIsFidelizacaoOpen(true)}
                                >
                                    <Heart size={16} />
                                    Fidelização
                                </button>
                                <button type="button" className="mgmt-btn primary" onClick={handleNovoServico}>
                                    <Plus size={17} />
                                    Novo serviço
                                </button>
                            </div>
                        )}
                    </header>

                    <section className="mgmt-metrics" aria-label="Resumo de serviços">
                        <article className="mgmt-metric primary">
                            <span className="mgmt-metric-icon"><Scissors size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Total de serviços</span>
                                <strong className="mgmt-metric-value">{totalServicos}</strong>
                                <span className="mgmt-metric-hint">No catálogo</span>
                            </span>
                        </article>
                        <article className="mgmt-metric success">
                            <span className="mgmt-metric-icon"><Power size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Serviços activos</span>
                                <strong className="mgmt-metric-value">{servicosActivos}</strong>
                                <span className="mgmt-metric-hint">Disponíveis para venda</span>
                            </span>
                        </article>
                        <article className="mgmt-metric warning">
                            <span className="mgmt-metric-icon"><DollarSign size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Receita potencial</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(totalReceita)}</strong>
                                <span className="mgmt-metric-hint">Soma dos preços base</span>
                            </span>
                        </article>
                        <article className="mgmt-metric info">
                            <span className="mgmt-metric-icon"><Clock size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Preço médio</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(precoMedio)}</strong>
                                <span className="mgmt-metric-hint">Por serviço</span>
                            </span>
                        </article>
                        <article className="mgmt-metric primary">
                            <span className="mgmt-metric-icon"><Tags size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Categorias</span>
                                <strong className="mgmt-metric-value">{categorias.length}</strong>
                                <span className="mgmt-metric-hint">Grupos no catálogo</span>
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

                    <section className="mgmt-toolbar" aria-label="Filtros de serviços">
                        <div className="mgmt-search">
                            <Search size={17} />
                            <input
                                type="search"
                                placeholder="Pesquisar por nome, categoria ou descrição..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                aria-label="Pesquisar serviços"
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
                                value={categoriaFiltro}
                                onChange={(event) => {
                                    setCategoriaFiltro(event.target.value)
                                    setServicoFiltro("")
                                }}
                                aria-label="Filtrar por categoria"
                            >
                                <option value="">Todas as categorias</option>
                                {categorias.map((categoria) => (
                                    <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <div className="mgmt-select-wrap">
                            <select
                                className="mgmt-select"
                                value={servicoFiltro}
                                onChange={(event) => setServicoFiltro(event.target.value)}
                                disabled={!categoriaFiltro}
                                aria-label="Filtrar por serviço"
                            >
                                <option value="">
                                    {categoriaFiltro ? "Todos os serviços" : "Escolha a categoria"}
                                </option>
                                {servicosDaCategoria.map((servico) => (
                                    <option key={servico.id} value={servico.id}>{servico.nome}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <div className="mgmt-select-wrap">
                            <select
                                className="mgmt-select"
                                value={estadoFiltro}
                                onChange={(event) => setEstadoFiltro(event.target.value)}
                                aria-label="Filtrar por estado"
                            >
                                <option value="Todos">Todos os estados</option>
                                <option value="Ativo">Serviços activos</option>
                                <option value="Inativo">Serviços inactivos</option>
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <span className="mgmt-toolbar-meta">
                            <strong>{servicosFiltrados.length}</strong>
                            de {totalServicos} serviços
                        </span>

                        <div className="mgmt-toolbar-actions">
                            <button
                                type="button"
                                className="mgmt-tool export"
                                onClick={exportarServicos}
                                disabled={!servicosFiltrados.length}
                                title="Exportar catálogo em CSV"
                            >
                                <Download size={16} />
                                Exportar
                            </button>
                            <button
                                type="button"
                                className="mgmt-tool icon-only"
                                onClick={carregarServicos}
                                disabled={loading}
                                title="Actualizar catálogo"
                                aria-label="Actualizar catálogo de serviços"
                            >
                                <RefreshCw size={16} className={loading ? "mgmt-spin" : ""} />
                            </button>
                        </div>
                    </section>

                    <DataGrid
                        rowData={servicosFiltrados}
                        columnDefs={columnDefs}
                        loading={loading}
                        onGridReady={(params) => { gridApiRef.current = params.api }}
                        onRowDoubleClicked={podeEscrever ? (event) => handleEditarServico(event.data) : undefined}
                        emptyIcon={error ? AlertCircle : temFiltros ? Search : Scissors}
                        emptyTitle={error ? "Não foi possível carregar" : temFiltros ? "Sem resultados" : "Catálogo por preencher"}
                        emptyMessage={error ? "Verifique a ligação ao servidor e tente novamente." : mensagemVazia}
                        emptyAction={error ? (
                            <button type="button" className="mgmt-btn ghost" onClick={carregarServicos}>
                                <RefreshCw size={16} />
                                Tentar novamente
                            </button>
                        ) : temFiltros ? (
                            <button type="button" className="mgmt-btn ghost" onClick={limparFiltros}>
                                Limpar filtros
                            </button>
                        ) : podeEscrever ? (
                            <button type="button" className="mgmt-btn primary" onClick={handleNovoServico}>
                                <Plus size={16} />
                                Criar serviço
                            </button>
                        ) : null}
                    />
                </section>
            </div>
        </>
    )
}

export default Servicos
