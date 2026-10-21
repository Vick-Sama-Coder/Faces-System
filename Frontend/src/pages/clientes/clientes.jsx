import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
import ClientModal from "../../components/Modals/ClientModal/ClientModal.jsx"
import "./clientes.css"
import Search from "../../components/forms/search/search.jsx"
import Button from "../../components/forms/button/button.jsx"
import { useState, useEffect } from "react"
import { User, Trash2, Edit, Clock } from "lucide-react"
import { getClientes, deleteCliente, getApiError } from "../../services/api.js"

function Clientes() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCliente, setEditingCliente] = useState(null)

    // carregar clientes do backend
    useEffect(() => {
        carregarClientes()
    }, [])

    async function carregarClientes() {
        setLoading(true)
        setError(null)
        try {
            const res = await getClientes()
            setClientes(res.data.clientes || [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    async function handleNovoCliente() {
        setEditingCliente(null)
        setIsModalOpen(true)
    }

    async function handleEditarCliente(cliente) {
        setEditingCliente(cliente)
        setIsModalOpen(true)
    }

    async function handleDesactivarCliente(id) {
        if (!window.confirm("Tem a certeza que deseja desactivar este cliente?")) return
        try {
            await deleteCliente(id)
            await carregarClientes()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    async function handleSucesso() {
        setIsModalOpen(false)
        setEditingCliente(null)
        await carregarClientes()
    }

    if (loading) {
        return (
            <>
                <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="clientes-header"
                    title="Clientes"
                    h1Class="clientes-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="clientes-content">
                    <div className="loading-state">A carregar clientes...</div>
                </section>
            </>
        )
    }

    return (
        <>
            {isModalOpen && (
                <ClientModal
                    cliente={editingCliente}
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={handleSucesso}
                />
            )}
            <div className="clientes-main">
                <SideBar
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
                />
                <section className="clientes-content">
                    {/* Page Header */}
                    <header className="page-header">
                        <div className="page-header-inner">
                            <div className="page-header-info">
                                <h1 className="page-title">Clientes</h1>
                                <p className="page-subtitle">Gerencie os clientes do seu salão</p>
                            </div>
                            <div className="page-header-actions">
                                <Button btnClick={handleNovoCliente}>
                                    <span className="btn-icon"><User /></span> Novo Cliente
                                </Button>
                            </div>
                        </div>
                    </header>

                    {/* Stats Overview */}
                    <section className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon">
                                <User />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Total de Clientes</span>
                                <span className="stat-value">{clientes.length}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-activos">
                            <div className="stat-icon">
                                <Clock />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Clientes Activos</span>
                                <span className="stat-value">{clientes.length}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-recentes">
                            <div className="stat-icon">
                                <User />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Novos Este Mês</span>
                                <span className="stat-value">0</span>
                            </div>
                        </div>
                    </section>

                    {/* Error banner */}
                    {error && (
                        <div className="error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Search Section */}
                    <section className="search-section">
                        <div className="search-wrapper">
                            <Search placeholderInfo="Pesquisar por nome ou telefone..." />
                        </div>
                    </section>

                    {/* Clients Table */}
                    <section className="table-section">
                        <div className="table-container">
                            <table className="clientes-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Telefone</th>
                                        <th className="actions-col">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientes.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="empty-row">
                                                Nenhum cliente registado ainda.
                                            </td>
                                        </tr>
                                    ) : (
                                        clientes.map((cliente) => (
                                            <tr key={cliente.id}>
                                                <td>
                                                    <div className="client-info">
                                                        <span className="client-name">
                                                            {cliente.nome} {cliente.apelido}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="client-phone">{cliente.telefone}</span>
                                                </td>
                                                <td className="actions-col">
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEditarCliente(cliente)
                                                        }}
                                                        title="Editar cliente"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDesactivarCliente(cliente.id)
                                                        }}
                                                        title="Desactivar cliente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </section>
            </div>
        </>
    )
}

export default Clientes
