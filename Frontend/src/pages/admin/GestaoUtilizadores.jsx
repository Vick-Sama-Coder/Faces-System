import { useEffect, useMemo, useState } from "react"
import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import "./admin.css"
import { UserPlus, Edit, KeyRound, ShieldCheck, Power, X, Save, Users } from "lucide-react"
import {
    getUsuarios,
    createUsuario,
    updateUsuario,
    updateUsuarioEstado,
    reporSenhaUsuario,
    getPerfis,
    getPermissoes,
    getPermissoesUsuario,
    updatePermissoesUsuario,
    getApiError,
    getApiErrorField
} from "../../services/api.js"
import { validarUtilizador } from "../../utils/validacoes.js"
import { useAuthStore } from "../../store/authStore.js"

function formatarData(valor) {
    if (!valor) return "Nunca"
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "-"
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

function agruparPorModulo(permissoes) {
    return permissoes.reduce((grupos, permissao) => {
        const modulo = permissao.modulo || "outros"
        if (!grupos[modulo]) grupos[modulo] = []
        grupos[modulo].push(permissao)
        return grupos
    }, {})
}

/* ---- Modal de permissoes individuais ---- */

function PermissoesUsuarioModal({ usuario, onClose, onSaved }) {
    const [catalogo, setCatalogo] = useState([])
    const [efetivas, setEfetivas] = useState([])
    const [selecoes, setSelecoes] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true

        async function carregar() {
            try {
                const [resCatalogo, resUsuario] = await Promise.all([
                    getPermissoes(),
                    getPermissoesUsuario(usuario.id)
                ])

                if (!activo) return

                const lista = Array.isArray(resCatalogo.data) ? resCatalogo.data : []
                const dados = resUsuario.data || {}
                const overrides = dados.overrides || []

                const mapa = {}
                lista.forEach((permissao) => {
                    const override = overrides.find((o) => o.codigo === permissao.codigo)
                    mapa[permissao.codigo] = override ? override.efeito : "herdar"
                })

                setCatalogo(lista)
                setEfetivas(dados.efetivas || [])
                setSelecoes(mapa)
            } catch (err) {
                if (activo) setError(getApiError(err))
            } finally {
                if (activo) setLoading(false)
            }
        }

        carregar()
        return () => { activo = false }
    }, [usuario.id])

    function alterar(codigo, valor) {
        setSelecoes((anteriores) => ({ ...anteriores, [codigo]: valor }))
        if (error) setError(null)
    }

    async function guardar() {
        setSaving(true)
        setError(null)

        try {
            const conceder = Object.entries(selecoes)
                .filter(([, efeito]) => efeito === "conceder")
                .map(([codigo]) => codigo)

            const revogar = Object.entries(selecoes)
                .filter(([, efeito]) => efeito === "revogar")
                .map(([codigo]) => codigo)

            await updatePermissoesUsuario(usuario.id, { conceder, revogar })
            setSaving(false)
            if (onSaved) onSaved()
            onClose()
        } catch (err) {
            setSaving(false)
            setError(getApiError(err))
        }
    }

    const grupos = agruparPorModulo(catalogo)

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <section
                className="admin-modal wide"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Permissoes de ${usuario.nome}`}
            >
                <header className="admin-modal-header">
                    <div>
                        <h2>Permissoes de {usuario.nome}</h2>
                        <p>
                            Herda as permissoes do perfil {usuario.perfil}. Pode conceder ou revogar
                            permissoes apenas para este utilizador.
                        </p>
                    </div>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fechar">
                        <X size={20} />
                    </button>
                </header>

                <div className="admin-modal-body">
                    {error && <div className="admin-alert error">{error}</div>}

                    {loading ? (
                        <p className="admin-empty">A carregar permissoes...</p>
                    ) : catalogo.length === 0 ? (
                        <p className="admin-empty">Nenhuma permissao catalogada.</p>
                    ) : (
                        <>
                            <div className="perm-legend">
                                <span><i className="inherited" /> Herdada do perfil</span>
                                <span><i className="granted" /> Concedida individualmente</span>
                                <span><i className="revoked" /> Revogada individualmente</span>
                            </div>

                            {Object.entries(grupos).map(([modulo, permissoes]) => (
                                <article className="perm-module" key={modulo}>
                                    <header className="perm-module-title">
                                        <span>{modulo}</span>
                                        <span className="count">{permissoes.length} permissoes</span>
                                    </header>

                                    <div className="admin-modal-body" style={{ padding: "12px 16px", gap: "8px" }}>
                                        {permissoes.map((permissao) => {
                                            const selecao = selecoes[permissao.codigo] || "herdar"
                                            const herdada = efetivas.includes(permissao.codigo)
                                            const estado = selecao === "conceder"
                                                ? "Concedida"
                                                : selecao === "revogar"
                                                    ? "Revogada"
                                                    : herdada
                                                        ? "Herdada do perfil"
                                                        : "Sem acesso"

                                            return (
                                                <div className="override-row" key={permissao.codigo}>
                                                    <div className="override-info">
                                                        <strong>{permissao.codigo}</strong>
                                                        <span>{permissao.descricao} · {estado}</span>
                                                    </div>
                                                    <select
                                                        className="admin-search"
                                                        style={{ maxWidth: "100%" }}
                                                        value={selecao}
                                                        onChange={(e) => alterar(permissao.codigo, e.target.value)}
                                                    >
                                                        <option value="herdar">Herdar do perfil</option>
                                                        <option value="conceder">Conceder</option>
                                                        <option value="revogar">Revogar</option>
                                                    </select>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </article>
                            ))}
                        </>
                    )}
                </div>

                <footer className="admin-modal-footer">
                    <button type="button" className="admin-btn secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="admin-btn primary"
                        onClick={guardar}
                        disabled={saving || loading}
                    >
                        <Save size={16} />
                        {saving ? "A guardar..." : "Guardar permissoes"}
                    </button>
                </footer>
            </section>
        </div>
    )
}

/* ---- Ecra principal ---- */

function GestaoUtilizadores() {
    const { user: utilizadorAtual } = useAuthStore()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [utilizadores, setUtilizadores] = useState([])
    const [perfis, setPerfis] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [credencial, setCredencial] = useState(null)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [formData, setFormData] = useState({ nome: "", telefone: "", id_perfil: "", senha: "" })
    const [formErrors, setFormErrors] = useState({})
    const [saving, setSaving] = useState(false)

    const [permUsuario, setPermUsuario] = useState(null)

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        setError(null)

        try {
            const [resUsuarios, resPerfis] = await Promise.all([getUsuarios(), getPerfis()])
            setUtilizadores(Array.isArray(resUsuarios.data) ? resUsuarios.data : (resUsuarios.data?.users || []))
            setPerfis(Array.isArray(resPerfis.data) ? resPerfis.data : [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function abrirNovo() {
        setEditing(null)
        setFormData({ nome: "", telefone: "", id_perfil: "", senha: "" })
        setFormErrors({})
        setIsModalOpen(true)
    }

    function abrirEdicao(usuario) {
        setEditing(usuario)
        setFormData({
            nome: usuario.nome || "",
            telefone: usuario.telefone || "",
            id_perfil: String(usuario.id_perfil || ""),
            senha: ""
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

    async function guardarUsuario(e) {
        e.preventDefault()
        if (saving) return

        const erros = validarUtilizador(formData)
        setFormErrors(erros)
        if (Object.keys(erros).length > 0) return

        setSaving(true)
        setError(null)

        try {
            if (editing) {
                await updateUsuario(editing.id, {
                    nome: formData.nome.trim(),
                    telefone: formData.telefone,
                    id_perfil: Number(formData.id_perfil)
                })
            } else {
                const payload = {
                    nome: formData.nome.trim(),
                    telefone: formData.telefone,
                    id_perfil: Number(formData.id_perfil)
                }
                if (formData.senha.trim()) payload.senha = formData.senha

                const res = await createUsuario(payload)
                const dados = res.data || {}

                const senhaPadrao = dados.senha_padrao || dados.senha_temporaria
                if (senhaPadrao) {
                    setCredencial({
                        nome: dados.user?.nome || formData.nome,
                        senha: senhaPadrao
                    })
                }
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

    async function alternarEstado(usuario) {
        if (usuario.id === utilizadorAtual?.id) {
            setError("Nao pode desactivar a propria conta.")
            return
        }

        const activo = usuario.estado === "Ativo"
        if (!window.confirm(`Tem a certeza que deseja ${activo ? "desactivar" : "reactivar"} a conta de ${usuario.nome}?`)) return

        try {
            await updateUsuarioEstado(usuario.id, activo ? "Inativo" : "Ativo")
            await carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    async function reporSenha(usuario) {
        if (usuario.id === utilizadorAtual?.id) {
            setError("Use a alteracao de senha da propria conta em vez de repor a credencial.")
            return
        }

        if (!window.confirm(`Repor a credencial de ${usuario.nome}? A senha actual deixa de funcionar e passa a ser a senha padrão 12345. No próximo login será obrigatório definir uma nova senha.`)) return

        try {
            const res = await reporSenhaUsuario(usuario.id)
            setCredencial({
                nome: usuario.nome,
                senha: res.data?.senha_padrao || res.data?.senha_temporaria || "12345"
            })
            await carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    const utilizadoresFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        if (!termo) return utilizadores

        return utilizadores.filter((usuario) => {
            const nome = String(usuario.nome || "").toLowerCase()
            const telefone = String(usuario.telefone || "")
            const perfil = String(usuario.perfil || "").toLowerCase()
            return nome.includes(termo) || telefone.includes(termo) || perfil.includes(termo)
        })
    }, [utilizadores, searchTerm])

    return (
        <>
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <section
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={editing ? "Editar utilizador" : "Novo utilizador"}
                    >
                        <header className="admin-modal-header">
                            <div>
                                <h2>{editing ? "Editar Utilizador" : "Novo Utilizador"}</h2>
                                <p>
                                    {editing
                                        ? "Actualize os dados da conta e o perfil de acesso."
                                        : "Crie a conta. Sem senha, fica com a senha padrão 12345 e troca obrigatória no primeiro acesso."}
                                </p>
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

                        <form onSubmit={guardarUsuario}>
                            <div className="admin-modal-body">
                                <div className="admin-form-grid">
                                    <div className="admin-field full">
                                        <label htmlFor="usuario-nome">Nome de utilizador</label>
                                        <input
                                            id="usuario-nome"
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => alterarCampo("nome", e.target.value)}
                                            className={formErrors.nome ? "invalid" : ""}
                                            placeholder="Ex.: Ana Silva"
                                            required
                                        />
                                        {formErrors.nome && <span className="admin-field-error">{formErrors.nome}</span>}
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="usuario-telefone">Telefone</label>
                                        <input
                                            id="usuario-telefone"
                                            type="tel"
                                            value={formData.telefone}
                                            onChange={(e) => alterarCampo("telefone", e.target.value)}
                                            className={formErrors.telefone ? "invalid" : ""}
                                            placeholder="Ex.: 84 123 4567"
                                            required
                                        />
                                        {formErrors.telefone && <span className="admin-field-error">{formErrors.telefone}</span>}
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="usuario-perfil">Perfil</label>
                                        <select
                                            id="usuario-perfil"
                                            value={formData.id_perfil}
                                            onChange={(e) => alterarCampo("id_perfil", e.target.value)}
                                            className={formErrors.id_perfil ? "invalid" : ""}
                                            required
                                        >
                                            <option value="">Selecione o perfil...</option>
                                            {perfis.map((perfil) => (
                                                <option key={perfil.id} value={perfil.id}>
                                                    {perfil.nome}
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.id_perfil && <span className="admin-field-error">{formErrors.id_perfil}</span>}
                                    </div>

                                    {!editing && (
                                        <div className="admin-field full">
                                            <label htmlFor="usuario-senha">Senha inicial (opcional)</label>
                                            <input
                                                id="usuario-senha"
                                                type="password"
                                                value={formData.senha}
                                                onChange={(e) => alterarCampo("senha", e.target.value)}
                                                className={formErrors.senha ? "invalid" : ""}
                                                placeholder="Deixe vazio para usar a senha padrão 12345"
                                            />
                                            <span className="admin-field-hint">
                                                Se preencher, use no mínimo 8 caracteres, com pelo menos 1 letra e 1 número.
                                                Se deixar vazio, será usada a senha padrão 12345 e a troca será obrigatória no primeiro login.
                                            </span>
                                            {formErrors.senha && <span className="admin-field-error">{formErrors.senha}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <footer className="admin-modal-footer">
                                <button type="button" className="admin-btn secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="admin-btn primary" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? "A guardar..." : editing ? "Guardar alteracoes" : "Criar utilizador"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {permUsuario && (
                <PermissoesUsuarioModal
                    usuario={permUsuario}
                    onClose={() => setPermUsuario(null)}
                    onSaved={carregar}
                />
            )}

            <div className="admin-main">
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="admin-header"
                    title="Gestao de Utilizadores"
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
                                <h1 className="admin-page-title">Gestao de Utilizadores</h1>
                                <p className="admin-page-subtitle">
                                    Crie contas, defina perfis e controle o acesso ao sistema
                                </p>
                            </div>
                            <div className="admin-page-actions">
                                <button type="button" className="admin-btn primary" onClick={abrirNovo}>
                                    <UserPlus size={18} />
                                    Novo Utilizador
                                </button>
                            </div>
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    {credencial && (
                        <div className="admin-alert success">
                            <div className="temp-password">
                                <span>
                                    Senha padrão de <strong>{credencial.nome}</strong>:
                                    <code>{credencial.senha}</code>
                                    <br />
                                    No próximo login será obrigatório definir uma nova senha.
                                </span>
                                <button
                                    type="button"
                                    className="admin-btn secondary"
                                    onClick={() => setCredencial(null)}
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="admin-toolbar">
                        <input
                            type="search"
                            className="admin-search"
                            placeholder="Pesquisar por nome, telefone ou perfil..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="admin-counter">
                            {utilizadoresFiltrados.length} de {utilizadores.length} utilizadores
                        </span>
                    </div>

                    <div className="admin-table-wrap">
                        {loading ? (
                            <p className="admin-empty">A carregar utilizadores...</p>
                        ) : utilizadoresFiltrados.length === 0 ? (
                            <p className="admin-empty">
                                {utilizadores.length === 0
                                    ? "Nenhum utilizador registado."
                                    : "Nenhum utilizador corresponde a pesquisa."}
                            </p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Utilizador</th>
                                        <th>Perfil</th>
                                        <th>Estado</th>
                                        <th>Ultimo acesso</th>
                                        <th className="admin-actions-cell">Acoes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {utilizadoresFiltrados.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>
                                                <div className="admin-cell-main">
                                                    <strong>{usuario.nome}</strong>
                                                    <span>{usuario.telefone}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="admin-badge primary">
                                                    {usuario.perfil || `Perfil #${usuario.id_perfil}`}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${usuario.estado === "Ativo" ? "success" : "neutral"}`}>
                                                    {usuario.estado || "Ativo"}
                                                </span>
                                            </td>
                                            <td>{formatarData(usuario.ultimo_acesso)}</td>
                                            <td className="admin-actions-cell">
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn edit"
                                                    title="Editar utilizador"
                                                    onClick={() => abrirEdicao(usuario)}
                                                >
                                                    <Edit size={17} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn shield"
                                                    title="Permissoes individuais"
                                                    onClick={() => setPermUsuario(usuario)}
                                                >
                                                    <ShieldCheck size={17} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn warning"
                                                    title="Repor credencial (senha padrão 12345)"
                                                    onClick={() => reporSenha(usuario)}
                                                >
                                                    <KeyRound size={17} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`admin-icon-btn ${usuario.estado === "Ativo" ? "danger" : "success"}`}
                                                    title={usuario.estado === "Ativo" ? "Desactivar conta" : "Reactivar conta"}
                                                    onClick={() => alternarEstado(usuario)}
                                                >
                                                    <Power size={17} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="admin-alert info">
                        <Users size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                        O perfil define as permissoes base. Use o icone de escudo para conceder ou
                        revogar permissoes apenas para um utilizador.
                    </div>
                </main>
            </div>
        </>
    )
}

export default GestaoUtilizadores
