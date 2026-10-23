import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import ServicoModal from "../../components/Modals/ServicoModal/ServicoModal.jsx"
import FidelizacaoModal from "../../components/Modals/FidelizacaoModal/FidelizacaoModal.jsx"
import "./servicos.css"
import { useState, useEffect, useMemo } from "react"
import { Scissors, Trash2, Edit, Clock, DollarSign, Power, Heart } from "lucide-react"
import { getServicos, deleteServico, updateServicoEstado, getApiError } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

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

    useEffect(() => {
        carregarServicos()
    }, [])

    async function carregarServicos() {
        setLoading(true)
        setError(null)
        try {
            const res = await getServicos({ estado: "todos" })
            //a API devolve um array; mantemos compatibilidade com { servicos }
            const lista = Array.isArray(res.data) ? res.data : (res.data?.servicos || [])
            setServicos(lista)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function handleNovoServico() {
        setEditingServico(null)
        setIsModalOpen(true)
    }

    function handleEditarServico(servico) {
        setEditingServico(servico)
        setIsModalOpen(true)
    }

    async function handleEliminarServico(servico) {
        if (!window.confirm(`Tem a certeza que deseja eliminar o servico "${servico.nome}"?`)) return
        try {
            await deleteServico(servico.id)
            await carregarServicos()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    async function handleAlternarEstado(servico) {
        const activo = servico.estado === "Ativo"
        if (!window.confirm(`Tem a certeza que deseja ${activo ? "desactivar" : "reactivar"} este servico?`)) return

        try {
            await updateServicoEstado(servico.id, activo ? "Inativo" : "Ativo")
            await carregarServicos()
        } catch (err) {
            setError(getApiError(err))
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
            const correspondeServico = !servicoFiltro || String(servico.id) === servicoFiltro
            if (!correspondeServico) return false
            if (!termo) return true

            const nome = String(servico.nome || "").toLowerCase()
            const categoria = String(servico.categoria_nome || "").toLowerCase()
            return nome.includes(termo) || categoria.includes(termo)
        })
    }, [servicosDaCategoria, servicoFiltro, searchTerm])

    const temFiltros = Boolean(searchTerm || categoriaFiltro || servicoFiltro)
    const totalServicos = servicos.length
    const servicosActivos = servicos.filter((s) => s.estado === "Ativo").length
    const totalReceita = servicos.reduce((acc, s) => acc + (Number(s.valor) || 0), 0)
    const precoMedio = totalServicos > 0 ? Math.round(totalReceita / totalServicos) : 0

    if (loading) {
        return (
            <>
                <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="servicos-header"
                    title="Servicos"
                    h1Class="servicos-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="servicos-content">
                    <div className="loading-state">A carregar servicos...</div>
                </section>
            </>
        )
    }

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
            <div className="servicos-main">
                <SideBar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="servicos-header"
                    title="Servicos"
                    h1Class="servicos-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="servicos-content">
                    <header className="page-header">
                        <div className="page-header-inner">
                            <div className="page-header-info">
                                <h1 className="page-title">Servicos</h1>
                                <p className="page-subtitle">
                                    Gerencie os servicos oferecidos pelo salao
                                </p>
                            </div>
                            {podeEscrever && (
                                <div className="page-header-actions">
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setIsFidelizacaoOpen(true)}
                                    >
                                        <Heart size={18} />
                                        <span>Eleger fidelizacao</span>
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleNovoServico}
                                    >
                                        <Scissors size={18} />
                                        <span>Novo Servico</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon">
                                <Scissors size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label">Total de Servicos</p>
                                <p className="stat-value">{totalServicos}</p>
                            </div>
                        </div>

                        <div className="stat-card stat-receita">
                            <div className="stat-icon">
                                <DollarSign size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label">Receita Potencial</p>
                                <p className="stat-value">{totalReceita.toLocaleString("pt-MZ")} MT</p>
                            </div>
                        </div>

                        <div className="stat-card stat-medio">
                            <div className="stat-icon">
                                <Clock size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label">Preco Medio</p>
                                <p className="stat-value">{precoMedio.toLocaleString("pt-MZ")} MT</p>
                            </div>
                        </div>

                        <div className="stat-card stat-ativos">
                            <div className="stat-icon">
                                <Power size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label">Servicos Activos</p>
                                <p className="stat-value">{servicosActivos}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="search-section servicos-filtros">
                        <select
                            className="filter-select"
                            value={categoriaFiltro}
                            onChange={(e) => {
                                setCategoriaFiltro(e.target.value)
                                setServicoFiltro("")
                            }}
                            aria-label="Filtrar por categoria"
                        >
                            <option value="">Todas as categorias</option>
                            {categorias.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={servicoFiltro}
                            onChange={(e) => setServicoFiltro(e.target.value)}
                            disabled={!categoriaFiltro}
                            aria-label="Filtrar por servico"
                        >
                            <option value="">
                                {categoriaFiltro ? "Todos os servicos da categoria" : "Escolha primeiro a categoria"}
                            </option>
                            {servicosDaCategoria.map((servico) => (
                                <option key={servico.id} value={servico.id}>{servico.nome}</option>
                            ))}
                        </select>
                        <input
                            type="search"
                            className="search-comp"
                            placeholder="Pesquisar por nome ou categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-container">
                        {servicosFiltrados.length === 0 ? (
                            <div className="empty-state">
                                <Scissors size={48} />
                                <p>Nenhum servico encontrado</p>
                                {temFiltros ? (
                                    <p className="empty-subtitle">
                                        Ajuste a categoria, o servico ou a pesquisa
                                    </p>
                                ) : (
                                    <p className="empty-subtitle">
                                        Comece registando o primeiro servico
                                    </p>
                                )}
                                {!temFiltros && podeEscrever && (
                                    <button
                                        className="btn-primary"
                                        onClick={handleNovoServico}
                                    >
                                        <Scissors size={16} />
                                        <span>Novo Servico</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="servicos-table">
                                <thead>
                                    <tr>
                                        <th>Servico</th>
                                        <th>Categoria</th>
                                        <th>Valor</th>
                                        <th>Fidelizacao</th>
                                        <th>Estado</th>
                                        {podeEscrever && <th className="actions-col">Acoes</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {servicosFiltrados.map((servico) => (
                                        <tr key={servico.id}>
                                            <td>
                                                <div className="servico-info">
                                                    <span className="servico-name">
                                                        {servico.nome}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="servico-categoria">
                                                    {servico.categoria_nome || "Sem categoria"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="servico-valor">
                                                    {Number(servico.valor).toLocaleString("pt-MZ")} MT
                                                </span>
                                            </td>
                                            <td>
                                                {servico.elegivel_fidelizacao ? (
                                                    <span className="admin-badge primary servico-fidelizacao-badge">
                                                        <Heart size={13} /> Elegivel
                                                    </span>
                                                ) : (
                                                    <span className="servico-sem-fidelizacao">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${servico.estado === "Ativo" ? "ativo" : "inativo"}`}>
                                                    {servico.estado || "Ativo"}
                                                </span>
                                            </td>
                                            {podeEscrever && (
                                                <td className="actions-col">
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => handleEditarServico(servico)}
                                                        title="Editar servico"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        className={`action-btn ${servico.estado === "Ativo" ? "toggle-off" : "activate"}`}
                                                        onClick={() => handleAlternarEstado(servico)}
                                                        title={servico.estado === "Ativo" ? "Desactivar servico" : "Reactivar servico"}
                                                    >
                                                        <Power size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleEliminarServico(servico)}
                                                        title="Eliminar servico"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>
        </>
    )
}

export default Servicos
