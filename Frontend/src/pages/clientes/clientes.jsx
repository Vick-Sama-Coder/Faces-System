import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
import ClientModal from "../../components/Modals/ClientModal/ClientModal.jsx"
import "./clientes.css"
import Search from "../../components/forms/search/search.jsx"
import Button from "../../components/forms/button/button.jsx"
import { useState, useEffect, useMemo } from "react"
import { User, Trash2, Edit, Clock, UserCheck } from "lucide-react"
import { getClientes, updateClienteEstado, getApiError } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

function Clientes() {
    const { user } = useAuthStore()
    const podeEscrever = user?.permissoes?.includes("clientes:escrever")
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCliente, setEditingCliente] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        carregarClientes()
    }, [])

    async function carregarClientes() {
        setLoading(true)
        setError(null)
        try {
            const res = await getClientes()
            //a API devolve sempre um array; mantemos compatibilidade com { clientes }
            const lista = Array.isArray(res.data) ? res.data : (res.data?.clientes || [])
            setClientes(lista)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function handleNovoCliente() {
        setEditingCliente(null)
        setIsModalOpen(true)
    }

    function handleEditarCliente(cliente) {
        setEditingCliente(cliente)
        setIsModalOpen(true)
    }

    async function handleAlternarEstado(cliente) {
        const activo = cliente.estado === "Ativo"
        const accao = activo ? "desactivar" : "reactivar"
        if (!window.confirm(`Tem a certeza que deseja ${accao} este cliente?`)) return

        try {
            await updateClienteEstado(cliente.id, activo ? "Inativo" : "Ativo")
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

    //pesquisa local: mantem as estatisticas calculadas sobre a lista completa
    const clientesFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        if (!termo) return clientes

        return clientes.filter((cliente) => {
            const nome = `${cliente.nome || ""} ${cliente.apelido || ""}`.toLowerCase()
            const telefone = String(cliente.telefone || "")
            return nome.includes(termo) || telefone.includes(termo)
        })
    }, [clientes, searchTerm])

    const totalClientes = clientes.length
    const clientesActivos = clientes.filter((c) => c.estado === "Ativo").length
    const novosEsteMes = clientes.filter((c) => {
        if (!c.data_registo) return false
        const data = new Date(c.data_registo)
        const hoje = new Date()
        return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear()
    }).length

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
                    <header className="page-header">
                        <div className="page-header-inner">
                            <div className="page-header-info">
                                <h1 className="page-title">Clientes</h1>
                                <p className="page-subtitle">Gerencie os clientes do seu salão</p>
                            </div>
                            {podeEscrever && (
                                <div className="page-header-actions">
                                    <Button btnClick={handleNovoCliente}>
                                        <span className="btn-icon"><User /></span> Novo Cliente
                                    </Button>
                                </div>
                            )}
                        </div>
                    </header>

                    <section className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon">
                                <User />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Total de Clientes</span>
                                <span className="stat-value">{totalClientes}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-activos">
                            <div className="stat-icon">
                                <UserCheck />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Clientes Activos</span>
                                <span className="stat-value">{clientesActivos}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-recentes">
                            <div className="stat-icon">
                                <Clock />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Novos Este Mês</span>
                                <span className="stat-value">{novosEsteMes}</span>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div className="error-banner">
                            <span>{error}</span>
                        </div>
                    )}

                    <section className="search-section">
                        <div className="search-wrapper">
                            <Search
                                placeholderInfo="Pesquisar por nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </section>

                    <section className="table-section">
                        <div className="table-container">
                            <table className="clientes-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Telefone</th>
                                        <th>Estado</th>
                                        {podeEscrever && <th className="actions-col">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={podeEscrever ? 4 : 3} className="empty-row">
                                                {clientes.length === 0
                                                    ? "Nenhum cliente registado ainda."
                                                    : "Nenhum cliente corresponde à pesquisa."}
                                            </td>
                                        </tr>
                                    ) : (
                                        clientesFiltrados.map((cliente) => (
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
                                                <td>
                                                    <span className={`status-badge ${cliente.estado === "Ativo" ? "ativo" : "inativo"}`}>
                                                        {cliente.estado || "Ativo"}
                                                    </span>
                                                </td>
                                                {podeEscrever && (
                                                    <td className="actions-col">
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => handleEditarCliente(cliente)}
                                                            title="Editar cliente"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            className={`action-btn ${cliente.estado === "Ativo" ? "delete" : "activate"}`}
                                                            onClick={() => handleAlternarEstado(cliente)}
                                                            title={cliente.estado === "Ativo" ? "Desactivar cliente" : "Reactivar cliente"}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                )}
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
