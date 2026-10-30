import { useEffect, useMemo, useState } from "react"
import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import "../admin/admin.css"
import { UserPlus, Edit, Trash2, Power, Save, X, Users, Wallet } from "lucide-react"
import {
    getFuncionarios,
    createFuncionario,
    updateFuncionario,
    updateFuncionarioEstado,
    deleteFuncionario,
    getApiError,
    getApiErrorField
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const FORM_VAZIO = {
    nome: "",
    telefone: "",
    cargo: "",
    data_admissao: "",
    salario: "",
    comissao_percentual: "30"
}

function Funcionarios() {
    const { user } = useAuthStore()
    const podeEscrever = user?.permissoes?.includes("funcionarios:escrever")
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [funcionarios, setFuncionarios] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [formData, setFormData] = useState(FORM_VAZIO)
    const [formErrors, setFormErrors] = useState({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        setError(null)

        try {
            const resFuncionarios = await getFuncionarios()
            setFuncionarios(Array.isArray(resFuncionarios.data) ? resFuncionarios.data : [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function abrirNovo() {
        setEditing(null)
        setFormData(FORM_VAZIO)
        setFormErrors({})
        setIsModalOpen(true)
    }

    function abrirEdicao(funcionario) {
        setEditing(funcionario)
        setFormData({
            nome: funcionario.nome || "",
            telefone: funcionario.telefone || "",
            cargo: funcionario.cargo || "",
            data_admissao: funcionario.data_admissao || "",
            salario: String(funcionario.salario ?? ""),
            comissao_percentual: String(funcionario.comissao_percentual ?? "30")
        })
        setFormErrors({})
        setIsModalOpen(true)
    }

    function alterarCampo(campo, valor) {
        setFormData((anteriores) => ({ ...anteriores, [campo]: valor }))
        if (formErrors[campo]) {
            setFormErrors((anteriores) => ({ ...anteriores, [campo]: null }))
        }
        if (error) setError(null)
    }

    function validar() {
        const erros = {}

        if (!formData.nome.trim() || formData.nome.trim().length < 3) {
            erros.nome = "Indique um nome com pelo menos 3 caracteres"
        }
        if (formData.salario === "" || Number(formData.salario) < 0) {
            erros.salario = "Indique um salario valido"
        }
        const comissao = Number(formData.comissao_percentual)
        if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) {
            erros.comissao_percentual = "A comissao deve estar entre 0 e 100"
        }
        if (formData.telefone && formData.telefone.replace(/\D/g, "").length < 9) {
            erros.telefone = "Telefone invalido (ex.: 84 123 4567)"
        }

        setFormErrors(erros)
        return Object.keys(erros).length === 0
    }

    async function guardar(e) {
        e.preventDefault()
        if (saving || !validar()) return

        setSaving(true)
        setError(null)

        try {
            const payload = {
                nome: formData.nome.trim(),
                telefone: formData.telefone || null,
                cargo: formData.cargo.trim() || null,
                data_admissao: formData.data_admissao || null,
                salario: Number.parseInt(formData.salario, 10),
                comissao_percentual: Number(formData.comissao_percentual)
            }

            if (editing) {
                await updateFuncionario(editing.id, payload)
            } else {
                await createFuncionario(payload)
            }

            setSaving(false)
            setIsModalOpen(false)
            setEditing(null)
            await carregar()
        } catch (err) {
            setSaving(false)
            const field = getApiErrorField(err)
            const msg = getApiError(err)
            if (field) {
                setFormErrors((anteriores) => ({ ...anteriores, [field]: msg }))
            } else {
                setError(msg)
            }
        }
    }

    async function alternarEstado(funcionario) {
        const activo = funcionario.estado === "Ativo"
        if (!window.confirm(`Tem a certeza que deseja ${activo ? "desactivar" : "reactivar"} ${funcionario.nome}?`)) return

        try {
            await updateFuncionarioEstado(funcionario.id, activo ? "Inativo" : "Ativo")
            await carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    async function eliminar(funcionario) {
        if (!window.confirm(`Eliminar o funcionario ${funcionario.nome}?`)) return

        try {
            await deleteFuncionario(funcionario.id)
            await carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    const funcionariosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        if (!termo) return funcionarios

        return funcionarios.filter((funcionario) => {
            const nome = String(funcionario.nome || "").toLowerCase()
            const cargo = String(funcionario.cargo || "").toLowerCase()
            const contacto = String(funcionario.telefone || "")
            return nome.includes(termo) || cargo.includes(termo) || contacto.includes(termo)
        })
    }, [funcionarios, searchTerm])

    const activos = funcionarios.filter((f) => f.estado === "Ativo").length
    const folhaSalarial = funcionarios
        .filter((f) => f.estado === "Ativo")
        .reduce((acc, f) => acc + (Number(f.salario) || 0), 0)

    return (
        <>
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <section className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="admin-modal-header">
                            <div>
                                <h2>{editing ? "Editar Funcionario" : "Novo Funcionario"}</h2>
                                <p>Dados profissionais, salario e comissao.</p>
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
                                <div className="admin-form-grid">
                                    <div className="admin-field full">
                                        <label htmlFor="func-nome">Nome</label>
                                        <input
                                            id="func-nome"
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => alterarCampo("nome", e.target.value)}
                                            className={formErrors.nome ? "invalid" : ""}
                                            required
                                        />
                                        {formErrors.nome && <span className="admin-field-error">{formErrors.nome}</span>}
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="func-telefone">Telefone</label>
                                        <input
                                            id="func-telefone"
                                            type="tel"
                                            value={formData.telefone}
                                            onChange={(e) => alterarCampo("telefone", e.target.value)}
                                            className={formErrors.telefone ? "invalid" : ""}
                                            placeholder="Ex.: 84 123 4567"
                                        />
                                        {formErrors.telefone && <span className="admin-field-error">{formErrors.telefone}</span>}
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="func-cargo">Cargo</label>
                                        <input
                                            id="func-cargo"
                                            type="text"
                                            value={formData.cargo}
                                            onChange={(e) => alterarCampo("cargo", e.target.value)}
                                            placeholder="Ex.: Cabeleireira"
                                        />
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="func-admissao">Data de admissao</label>
                                        <input
                                            id="func-admissao"
                                            type="date"
                                            value={formData.data_admissao}
                                            onChange={(e) => alterarCampo("data_admissao", e.target.value)}
                                        />
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="func-salario">Salario (MT)</label>
                                        <input
                                            id="func-salario"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={formData.salario}
                                            onChange={(e) => alterarCampo("salario", e.target.value)}
                                            className={formErrors.salario ? "invalid" : ""}
                                            required
                                        />
                                        {formErrors.salario && <span className="admin-field-error">{formErrors.salario}</span>}
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="func-comissao">Comissao (%)</label>
                                        <input
                                            id="func-comissao"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={formData.comissao_percentual}
                                            onChange={(e) => alterarCampo("comissao_percentual", e.target.value)}
                                            className={formErrors.comissao_percentual ? "invalid" : ""}
                                        />
                                        {formErrors.comissao_percentual && (
                                            <span className="admin-field-error">{formErrors.comissao_percentual}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <footer className="admin-modal-footer">
                                <button type="button" className="admin-btn secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="admin-btn primary" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? "A guardar..." : editing ? "Guardar alteracoes" : "Criar funcionario"}
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
                    title="Funcionarios"
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
                                <h1 className="admin-page-title">Funcionarios</h1>
                                <p className="admin-page-subtitle">
                                    Gerencie a equipa, salarios e comissoes do salao
                                </p>
                            </div>
                            {podeEscrever && (
                                <div className="admin-page-actions">
                                    <button type="button" className="admin-btn primary" onClick={abrirNovo}>
                                        <UserPlus size={18} />
                                        Novo Funcionario
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    <section className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon"><Users /></div>
                            <div className="stat-info">
                                <span className="stat-label">Total de Funcionarios</span>
                                <span className="stat-value">{funcionarios.length}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-activos">
                            <div className="stat-icon"><Power /></div>
                            <div className="stat-info">
                                <span className="stat-label">Activos</span>
                                <span className="stat-value">{activos}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-receita">
                            <div className="stat-icon"><Wallet /></div>
                            <div className="stat-info">
                                <span className="stat-label">Folha Salarial</span>
                                <span className="stat-value">{folhaSalarial.toLocaleString("pt-MZ")} MT</span>
                            </div>
                        </div>
                    </section>

                    <div className="admin-toolbar">
                        <input
                            type="search"
                            className="admin-search"
                            placeholder="Pesquisar por nome, cargo ou contacto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="admin-counter">
                            {funcionariosFiltrados.length} de {funcionarios.length} funcionarios
                        </span>
                    </div>

                    <div className="admin-table-wrap">
                        {loading ? (
                            <p className="admin-empty">A carregar funcionarios...</p>
                        ) : funcionariosFiltrados.length === 0 ? (
                            <p className="admin-empty">
                                {funcionarios.length === 0
                                    ? "Nenhum funcionario registado."
                                    : "Nenhum funcionario corresponde a pesquisa."}
                            </p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Funcionario</th>
                                        <th>Cargo</th>
                                        <th>Contacto</th>
                                        <th>Salario</th>
                                        <th>Comissao</th>
                                        <th>Estado</th>
                                        {podeEscrever && <th className="admin-actions-cell">Acoes</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {funcionariosFiltrados.map((funcionario) => (
                                        <tr key={funcionario.id}>
                                            <td>
                                                <div className="admin-cell-main">
                                                    <strong>{funcionario.nome}</strong>
                                                    <span>{funcionario.estado === "Ativo" ? "Activo no salao" : "Inactivo"}</span>
                                                </div>
                                            </td>
                                            <td>{funcionario.cargo || "-"}</td>
                                            <td>{funcionario.telefone || "-"}</td>
                                            <td>{Number(funcionario.salario || 0).toLocaleString("pt-MZ")} MT</td>
                                            <td>{Number(funcionario.comissao_percentual || 0).toLocaleString("pt-MZ")}%</td>
                                            <td>
                                                <span className={`admin-badge ${funcionario.estado === "Ativo" ? "success" : "neutral"}`}>
                                                    {funcionario.estado || "Ativo"}
                                                </span>
                                            </td>
                                            {podeEscrever && (
                                                <td className="admin-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn edit"
                                                        title="Editar funcionario"
                                                        onClick={() => abrirEdicao(funcionario)}
                                                    >
                                                        <Edit size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`admin-icon-btn ${funcionario.estado === "Ativo" ? "warning" : "success"}`}
                                                        title={funcionario.estado === "Ativo" ? "Desactivar" : "Reactivar"}
                                                        onClick={() => alternarEstado(funcionario)}
                                                    >
                                                        <Power size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn danger"
                                                        title="Eliminar funcionario"
                                                        onClick={() => eliminar(funcionario)}
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}

export default Funcionarios
