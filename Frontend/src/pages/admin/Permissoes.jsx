import { useEffect, useMemo, useState } from "react"
import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import "./admin.css"
import { ShieldCheck, Save, CheckCheck, Eraser, Users } from "lucide-react"
import { getPerfis, getPerfil, getPermissoes, updatePermissoesPerfil, getApiError } from "../../services/api.js"

function agruparPorModulo(permissoes) {
    return permissoes.reduce((grupos, permissao) => {
        const modulo = permissao.modulo || "outros"
        if (!grupos[modulo]) grupos[modulo] = []
        grupos[modulo].push(permissao)
        return grupos
    }, {})
}

function Permissoes() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [perfis, setPerfis] = useState([])
    const [catalogo, setCatalogo] = useState([])
    const [perfilId, setPerfilId] = useState("")
    const [selecionadas, setSelecionadas] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingPerfil, setLoadingPerfil] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [sucesso, setSucesso] = useState(null)

    useEffect(() => {
        let activo = true

        async function carregar() {
            try {
                const [resPerfis, resCatalogo] = await Promise.all([getPerfis(), getPermissoes()])

                if (!activo) return

                const listaPerfis = Array.isArray(resPerfis.data) ? resPerfis.data : []
                const listaCatalogo = Array.isArray(resCatalogo.data) ? resCatalogo.data : []

                setPerfis(listaPerfis)
                setCatalogo(listaCatalogo)

                if (listaPerfis.length > 0) {
                    setPerfilId(String(listaPerfis[0].id))
                }
            } catch (err) {
                if (activo) setError(getApiError(err))
            } finally {
                if (activo) setLoading(false)
            }
        }

        carregar()
        return () => { activo = false }
    }, [])

    useEffect(() => {
        if (!perfilId) return

        let activo = true

        async function carregarPerfil() {
            setLoadingPerfil(true)
            setError(null)
            setSucesso(null)

            try {
                const res = await getPerfil(perfilId)
                const permissoes = res.data?.permissoes || []

                if (activo) {
                    setSelecionadas(permissoes.map((permissao) => permissao.codigo))
                }
            } catch (err) {
                if (activo) setError(getApiError(err))
            } finally {
                if (activo) setLoadingPerfil(false)
            }
        }

        carregarPerfil()
        return () => { activo = false }
    }, [perfilId])

    const perfilActual = perfis.find((perfil) => String(perfil.id) === String(perfilId))
    const grupos = useMemo(() => agruparPorModulo(catalogo), [catalogo])

    const alternarPermissao = (codigo) => {
        setSelecionadas((anteriores) => (
            anteriores.includes(codigo)
                ? anteriores.filter((item) => item !== codigo)
                : [...anteriores, codigo]
        ))
        if (sucesso) setSucesso(null)
    }

    const selecionarModulo = (permissoes, selecionar) => {
        const codigos = permissoes.map((permissao) => permissao.codigo)

        setSelecionadas((anteriores) => {
            if (selecionar) {
                return Array.from(new Set([...anteriores, ...codigos]))
            }
            return anteriores.filter((codigo) => !codigos.includes(codigo))
        })
        if (sucesso) setSucesso(null)
    }

    const selecionarTodas = () => {
        setSelecionadas(catalogo.map((permissao) => permissao.codigo))
        if (sucesso) setSucesso(null)
    }

    const limparTodas = () => {
        setSelecionadas([])
        if (sucesso) setSucesso(null)
    }

    async function guardar() {
        if (!perfilId || saving) return

        setSaving(true)
        setError(null)
        setSucesso(null)

        try {
            await updatePermissoesPerfil(perfilId, selecionadas)
            setSaving(false)
            setSucesso(`Permissoes do perfil ${perfilActual?.nome || perfilId} actualizadas.`)
        } catch (err) {
            setSaving(false)
            setError(getApiError(err))
        }
    }

    return (
        <div className="admin-main">
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                heady="admin-header"
                title="Permissoes"
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
                            <h1 className="admin-page-title">Permissoes</h1>
                            <p className="admin-page-subtitle">
                                Defina o que cada perfil pode aceder. As alteracoes aplicam-se aos
                                utilizadores desse perfil.
                            </p>
                        </div>
                        <div className="admin-page-actions">
                            <button type="button" className="admin-btn secondary" onClick={selecionarTodas}>
                                <CheckCheck size={16} />
                                Selecionar todas
                            </button>
                            <button type="button" className="admin-btn secondary" onClick={limparTodas}>
                                <Eraser size={16} />
                                Limpar
                            </button>
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={guardar}
                                disabled={saving || loadingPerfil || !perfilId}
                            >
                                <Save size={16} />
                                {saving ? "A guardar..." : "Guardar permissoes"}
                            </button>
                        </div>
                    </div>
                </header>

                {error && <div className="admin-alert error">{error}</div>}
                {sucesso && <div className="admin-alert success">{sucesso}</div>}

                {loading ? (
                    <p className="admin-empty">A carregar perfis e permissoes...</p>
                ) : perfis.length === 0 ? (
                    <p className="admin-empty">Nenhum perfil registado.</p>
                ) : (
                    <div className="perm-layout">
                        <aside className="perm-profiles">
                            <span className="perm-profiles-title">Perfis</span>
                            {perfis.map((perfil) => (
                                <button
                                    key={perfil.id}
                                    type="button"
                                    className={`perm-profile-btn ${String(perfil.id) === String(perfilId) ? "active" : ""}`}
                                    onClick={() => setPerfilId(String(perfil.id))}
                                >
                                    <span>{perfil.nome}</span>
                                    <span className="count">{perfil.estado || ""}</span>
                                </button>
                            ))}
                        </aside>

                        <section className="perm-panel">
                            <header className="perm-panel-header">
                                <div>
                                    <h2>{perfilActual?.nome || "Perfil"}</h2>
                                    <p>
                                        {perfilActual?.descricao || "Sem descricao."} ·{" "}
                                        {selecionadas.length} de {catalogo.length} permissoes selecionadas
                                    </p>
                                </div>
                                <span className="admin-badge primary">
                                    <Users size={14} style={{ marginRight: 6 }} />
                                    {perfilActual?.estado || "Activo"}
                                </span>
                            </header>

                            {loadingPerfil ? (
                                <p className="admin-empty">A carregar permissoes do perfil...</p>
                            ) : catalogo.length === 0 ? (
                                <p className="admin-empty">Nenhuma permissao catalogada.</p>
                            ) : (
                                Object.entries(grupos).map(([modulo, permissoes]) => {
                                    const selecionadasNoModulo = permissoes.filter((permissao) => (
                                        selecionadas.includes(permissao.codigo)
                                    )).length

                                    return (
                                        <article className="perm-module" key={modulo}>
                                            <header className="perm-module-title">
                                                <span>{modulo}</span>
                                                <span className="count">
                                                    {selecionadasNoModulo}/{permissoes.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="admin-btn secondary"
                                                    style={{ padding: "4px 10px", fontSize: 12 }}
                                                    onClick={() => selecionarModulo(
                                                        permissoes,
                                                        selecionadasNoModulo !== permissoes.length
                                                    )}
                                                >
                                                    {selecionadasNoModulo === permissoes.length
                                                        ? "Limpar modulo"
                                                        : "Selecionar modulo"}
                                                </button>
                                            </header>

                                            <div className="perm-grid">
                                                {permissoes.map((permissao) => {
                                                    const marcada = selecionadas.includes(permissao.codigo)

                                                    return (
                                                        <label
                                                            key={permissao.codigo}
                                                            className={`perm-item ${marcada ? "checked" : ""}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={marcada}
                                                                onChange={() => alternarPermissao(permissao.codigo)}
                                                            />
                                                            <span className="perm-item-text">
                                                                <strong>{permissao.codigo}</strong>
                                                                <span>{permissao.descricao}</span>
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </article>
                                    )
                                })
                            )}
                        </section>
                    </div>
                )}

                <div className="admin-alert info">
                    <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                    Para excepcoes individuais, use a Gestao de Utilizadores e o icone de escudo
                    de cada conta.
                </div>
            </main>
        </div>
    )
}

export default Permissoes
