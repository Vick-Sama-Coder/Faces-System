import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import ServicoModal from "../../components/Modals/ServicoModal/ServicoModal.jsx"
import "./servicos.css"
import { useState, useEffect } from "react"
import { Scissors, Trash2, Edit, Clock, DollarSign } from "lucide-react"
import { getServicos, deleteServico, getApiError } from "../../services/api.js"

function Servicos() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [servicos, setServicos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingServico, setEditingServico] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        carregarServicos()
    }, [])

    async function carregarServicos() {
        setLoading(true)
        setError(null)
        try {
            const res = await getServicos()
            setServicos(res.data.servicos || res.data || [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    async function handleNovoServico() {
        setEditingServico(null)
        setIsModalOpen(true)
    }

    async function handleEditarServico(servico) {
        setEditingServico(servico)
        setIsModalOpen(true)
    }

    async function handleDesactivarServico(id) {
        if (!window.confirm("Tem a certeza que deseja eliminar este servico?")) return
        try {
            await deleteServico(id)
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

    const servicosFiltrados = servicos.filter((s) => {
        const termo = searchTerm.toLowerCase()
        return s.nome.toLowerCase().includes(termo)
    })

    const totalServicos = servicos.length
    const totalReceita = servicos.reduce((acc, s) => acc + (parseInt(s.valor) || 0), 0)
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
                            <div className="page-header-actions">
                                <button
                                    className="btn-primary"
                                    onClick={handleNovoServico}
                                >
                                    <Scissors size={18} />
                                    <span>Novo Servico</span>
                                </button>
                            </div>
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
                                <Edit size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label">Servicos Disponiveis</p>
                                <p className="stat-value">{totalServicos}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="search-section">
                        <input
                            type="search"
                            className="search-comp"
                            placeholder="Pesquisar servicos por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="table-container">
                        {servicosFiltrados.length === 0 ? (
                            <div className="empty-state">
                                <Scissors size={48} />
                                <p>Nenhum servico encontrado</p>
                                {searchTerm ? (
                                    <p className="empty-subtitle">
                                        Tente pesquisar por outro termo
                                    </p>
                                ) : (
                                    <p className="empty-subtitle">
                                        Comece registando o primeiro servico
                                    </p>
                                )}
                                {!searchTerm && (
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
                                        <th className="actions-col">Acoes</th>
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
                                                    Categoria #{servico.categoria_id}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="servico-valor">
                                                    {parseInt(servico.valor).toLocaleString("pt-MZ")} MT
                                                </span>
                                            </td>
                                            <td className="actions-col">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditarServico(servico)
                                                    }}
                                                    title="Editar servico"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDesactivarServico(servico.id)
                                                    }}
                                                    title="Eliminar servico"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
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
