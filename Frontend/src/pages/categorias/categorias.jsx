import { useEffect, useMemo, useState } from "react"
import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import "../admin/admin.css"
import { Tag, Plus, Edit, Trash2, X, Save, FolderTree, Scissors } from "lucide-react"
import {
    getCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    getServicos,
    getApiError
} from "../../services/api.js"

function Categorias() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [categorias, setCategorias] = useState([])
    const [servicos, setServicos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [nome, setNome] = useState("")
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        setError(null)
        try {
            const [resCategorias, resServicos] = await Promise.all([
                getCategorias(),
                getServicos({ estado: "todos" })
            ])
            setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : [])
            setServicos(Array.isArray(resServicos.data) ? resServicos.data : [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function abrirNova() {
        setEditing(null)
        setNome("")
        setFormError(null)
        setIsModalOpen(true)
    }

    function abrirEdicao(categoria) {
        setEditing(categoria)
        setNome(categoria.nome || "")
        setFormError(null)
        setIsModalOpen(true)
    }

    async function guardar(e) {
        e.preventDefault()
        if (saving) return

        const nomeLimpo = nome.trim()
        if (!nomeLimpo) {
            setFormError("Indique o nome da categoria")
            return
        }

        setSaving(true)
        setFormError(null)
        try {
            if (editing) {
                await updateCategoria(editing.id, { nome: nomeLimpo })
            } else {
                await createCategoria({ nome: nomeLimpo })
            }
            setSaving(false)
            setIsModalOpen(false)
            setEditing(null)
            await carregar()
        } catch (err) {
            setSaving(false)
            setFormError(getApiError(err))
        }
    }

    async function eliminar(categoria) {
        if (!window.confirm(`Eliminar a categoria "${categoria.nome}"?`)) return
        try {
            await deleteCategoria(categoria.id)
            await carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    const servicosPorCategoria = useMemo(() => {
        const mapa = new Map()
        for (const servico of servicos) {
            const chave = Number(servico.categoria_id)
            mapa.set(chave, (mapa.get(chave) || 0) + 1)
        }
        return mapa
    }, [servicos])

    const categoriasFiltradas = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        if (!termo) return categorias
        return categorias.filter((categoria) => String(categoria.nome || "").toLowerCase().includes(termo))
    }, [categorias, searchTerm])

    const categoriasUsadas = categorias.filter((categoria) => (servicosPorCategoria.get(Number(categoria.id)) || 0) > 0).length

    return (
        <>
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <section className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="admin-modal-header">
                            <div>
                                <h2>{editing ? "Editar Categoria" : "Nova Categoria"}</h2>
                                <p>Organize os servicos por tipo de trabalho.</p>
                            </div>
                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={guardar}>
                            <div className="admin-modal-body">
                                {formError && <div className="admin-alert error">{formError}</div>}
                                <div className="admin-field full">
                                    <label htmlFor="categoria-nome">Nome da categoria</label>
                                    <input
                                        id="categoria-nome"
                                        type="text"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex.: Cabelo, Unhas, Estetica"
                                        maxLength={100}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <footer className="admin-modal-footer">
                                <button type="button" className="admin-btn secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="admin-btn primary" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? "A guardar..." : editing ? "Guardar alteracoes" : "Criar categoria"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            <div className="admin-main">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="admin-header"
                    title="Categorias"
                    h1Class="admin-header-title"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                    sidebarOpen={isSidebarOpen}
                />

                <main className="admin-content">
                    <header className="admin-page-header">
                        <div className="admin-page-header-inner">
                            <div>
                                <h1 className="admin-page-title">Categorias</h1>
                                <p className="admin-page-subtitle">
                                    Agrupe os servicos do salao e mantenha o catalogo organizado
                                </p>
                            </div>
                            <div className="admin-page-actions">
                                <button type="button" className="admin-btn primary" onClick={abrirNova}>
                                    <Plus size={18} />
                                    Nova Categoria
                                </button>
                            </div>
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    <section className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon"><FolderTree /></div>
                            <div className="stat-info">
                                <span className="stat-label">Total de Categorias</span>
                                <span className="stat-value">{categorias.length}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-ativos">
                            <div className="stat-icon"><Tag /></div>
                            <div className="stat-info">
                                <span className="stat-label">Categorias com Servicos</span>
                                <span className="stat-value">{categoriasUsadas}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-receita">
                            <div className="stat-icon"><Scissors /></div>
                            <div className="stat-info">
                                <span className="stat-label">Servicos Registados</span>
                                <span className="stat-value">{servicos.length}</span>
                            </div>
                        </div>
                    </section>

                    <div className="admin-toolbar">
                        <input
                            type="search"
                            className="admin-search"
                            placeholder="Pesquisar categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="admin-counter">
                            {categoriasFiltradas.length} de {categorias.length} categorias
                        </span>
                    </div>

                    <div className="admin-table-wrap">
                        {loading ? (
                            <p className="admin-empty">A carregar categorias...</p>
                        ) : categoriasFiltradas.length === 0 ? (
                            <p className="admin-empty">
                                {categorias.length === 0
                                    ? "Nenhuma categoria registada. Crie a primeira para poder registar servicos."
                                    : "Nenhuma categoria corresponde a pesquisa."}
                            </p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Categoria</th>
                                        <th>Servicos</th>
                                        <th className="admin-actions-cell">Acoes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoriasFiltradas.map((categoria) => {
                                        const quantidade = servicosPorCategoria.get(Number(categoria.id)) || 0
                                        return (
                                            <tr key={categoria.id}>
                                                <td>
                                                    <div className="admin-cell-main">
                                                        <strong>{categoria.nome}</strong>
                                                        <span>{quantidade > 0 ? "Categoria em uso" : "Sem servicos associados"}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`admin-badge ${quantidade > 0 ? "primary" : "neutral"}`}>
                                                        {quantidade} {quantidade === 1 ? "servico" : "servicos"}
                                                    </span>
                                                </td>
                                                <td className="admin-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn edit"
                                                        title="Editar categoria"
                                                        onClick={() => abrirEdicao(categoria)}
                                                    >
                                                        <Edit size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn danger"
                                                        title="Eliminar categoria"
                                                        onClick={() => eliminar(categoria)}
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}

export default Categorias
