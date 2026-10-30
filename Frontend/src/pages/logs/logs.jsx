import { useCallback, useEffect, useState } from "react"
import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import "../admin/admin.css"
import "./logs.css"
import { ScrollText, Search, X, Eye, Filter, RotateCcw, UserRound, ShieldCheck } from "lucide-react"
import { getAuditoria, getAuditoriaOpcoes, getApiError } from "../../services/api.js"

function formatarData(valor) {
    if (!valor) return "-"
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "-"
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "medium" })
}

function removerIds(valor) {
    if (Array.isArray(valor)) return valor.map(removerIds)
    if (!valor || typeof valor !== "object") return valor

    return Object.fromEntries(
        Object.entries(valor)
            .filter(([chave]) => !/(^id$|^id_|_id$)/i.test(chave))
            .map(([chave, conteudo]) => [chave, removerIds(conteudo)])
    )
}

function formatarJson(valor) {
    if (valor === null || valor === undefined || valor === "") return "Sem dados"

    let limpo = valor
    if (typeof valor === "string") {
        try {
            limpo = JSON.parse(valor)
        } catch {
            return valor
        }
    }

    limpo = removerIds(limpo)
    if (limpo && typeof limpo === "object" && Object.keys(limpo).length === 0) {
        return "Sem dados"
    }

    try {
        return JSON.stringify(limpo, null, 2)
    } catch {
        return String(valor)
    }
}

const FILTROS_VAZIOS = {
    operacao: "",
    utilizador_nome: "",
    perfil: "",
    de: "",
    ate: ""
}

const OPCOES_VAZIAS = {
    operacoes: [],
    perfis: [],
    utilizadores: []
}

function Logs() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [logs, setLogs] = useState([])
    const [opcoes, setOpcoes] = useState(OPCOES_VAZIAS)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
    const [detalhe, setDetalhe] = useState(null)

    const carregar = useCallback(async (filtrosAtivos = FILTROS_VAZIOS) => {
        setLoading(true)
        setError(null)
        try {
            const params = {}
            Object.entries(filtrosAtivos).forEach(([chave, valor]) => {
                if (valor !== "" && valor !== null && valor !== undefined) params[chave] = valor
            })
            const res = await getAuditoria(params)
            setLogs(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    const carregarOpcoes = useCallback(async () => {
        try {
            const res = await getAuditoriaOpcoes()
            setOpcoes({
                operacoes: Array.isArray(res.data?.operacoes) ? res.data.operacoes : [],
                perfis: Array.isArray(res.data?.perfis) ? res.data.perfis : [],
                utilizadores: Array.isArray(res.data?.utilizadores) ? res.data.utilizadores : []
            })
        } catch {
            // os filtros continuam utilizaveis mesmo sem as opcoes carregadas
        }
    }, [])

    useEffect(() => {
        let activo = true

        queueMicrotask(() => {
            if (!activo) return
            carregar()
            carregarOpcoes()
        })

        return () => { activo = false }
    }, [carregar, carregarOpcoes])

    function alterarFiltro(campo, valor) {
        setFiltros((anteriores) => ({ ...anteriores, [campo]: valor }))
    }

    function aplicarFiltros(e) {
        e.preventDefault()
        carregar(filtros)
    }

    function limparFiltros() {
        const vazios = { ...FILTROS_VAZIOS }
        setFiltros(vazios)
        carregar(vazios)
    }

    const hoje = new Date().toDateString()
    const totalHoje = logs.filter((log) => new Date(log.data_hora).toDateString() === hoje).length
    const utilizadores = new Set(logs.map((log) => log.utilizador_nome).filter(Boolean)).size
    const operacoes = new Set(logs.map((log) => log.tipo_operacao).filter(Boolean)).size

    return (
        <>
            {detalhe && (
                <div className="admin-modal-backdrop" onClick={() => setDetalhe(null)}>
                    <section className="admin-modal wide" onClick={(e) => e.stopPropagation()}>
                        <header className="admin-modal-header">
                            <div>
                                <h2>Detalhe do registo</h2>
                                <p>{formatarData(detalhe.data_hora)} · {detalhe.utilizador_nome || "Sistema"}</p>
                            </div>
                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={() => setDetalhe(null)}
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="admin-modal-body logs-detail">
                            <div className="logs-detail-grid">
                                <div>
                                    <span>Utilizador</span>
                                    <strong>{detalhe.utilizador_nome || "Sistema"}</strong>
                                </div>
                                <div>
                                    <span>Perfil</span>
                                    <strong>{detalhe.utilizador_perfil || "Sem perfil"}</strong>
                                </div>
                                <div>
                                    <span>Operacao</span>
                                    <strong>{detalhe.tipo_operacao || "-"}</strong>
                                </div>
                                <div>
                                    <span>Data</span>
                                    <strong>{formatarData(detalhe.data_hora)}</strong>
                                </div>
                            </div>

                            {detalhe.motivo && (
                                <div className="logs-detail-motivo">
                                    <span>Motivo</span>
                                    <p>{detalhe.motivo}</p>
                                </div>
                            )}

                            <div className="logs-json-grid">
                                <div>
                                    <h3>Antes</h3>
                                    <pre>{formatarJson(detalhe.valores_anteriores)}</pre>
                                </div>
                                <div>
                                    <h3>Depois</h3>
                                    <pre>{formatarJson(detalhe.valores_posteriores)}</pre>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <div className="admin-main">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="admin-header"
                    title="Logs"
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
                                <h1 className="admin-page-title">Logs de Auditoria</h1>
                                <p className="admin-page-subtitle">
                                    Consulte as operacoes registadas no sistema
                                </p>
                            </div>
                            <div className="admin-page-actions">
                                <span className="admin-badge primary">
                                    <ScrollText size={13} /> {logs.length} registos
                                </span>
                            </div>
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    <section className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon"><ScrollText /></div>
                            <div className="stat-info">
                                <span className="stat-label">Total de Registos</span>
                                <span className="stat-value">{logs.length}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-ativos">
                            <div className="stat-icon"><UserRound /></div>
                            <div className="stat-info">
                                <span className="stat-label">Registos Hoje</span>
                                <span className="stat-value">{totalHoje}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-receita">
                            <div className="stat-icon"><ShieldCheck /></div>
                            <div className="stat-info">
                                <span className="stat-label">Utilizadores</span>
                                <span className="stat-value">{utilizadores}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-agendados">
                            <div className="stat-icon"><Filter /></div>
                            <div className="stat-info">
                                <span className="stat-label">Tipos de Operacao</span>
                                <span className="stat-value">{operacoes}</span>
                            </div>
                        </div>
                    </section>

                    <form className="logs-filters" onSubmit={aplicarFiltros}>
                        <div className="logs-filter-field">
                            <label htmlFor="log-de">De</label>
                            <input
                                id="log-de"
                                type="date"
                                value={filtros.de}
                                onChange={(e) => alterarFiltro("de", e.target.value)}
                            />
                        </div>
                        <div className="logs-filter-field">
                            <label htmlFor="log-ate">Ate</label>
                            <input
                                id="log-ate"
                                type="date"
                                value={filtros.ate}
                                onChange={(e) => alterarFiltro("ate", e.target.value)}
                            />
                        </div>
                        <div className="logs-filter-field">
                            <label htmlFor="log-operacao">Operacao</label>
                            <select
                                id="log-operacao"
                                value={filtros.operacao}
                                onChange={(e) => alterarFiltro("operacao", e.target.value)}
                            >
                                <option value="">Todas as operacoes</option>
                                {opcoes.operacoes.map((operacao) => (
                                    <option key={operacao} value={operacao}>{operacao}</option>
                                ))}
                            </select>
                        </div>
                        <div className="logs-filter-field">
                            <label htmlFor="log-utilizador">Utilizador</label>
                            <select
                                id="log-utilizador"
                                value={filtros.utilizador_nome}
                                onChange={(e) => alterarFiltro("utilizador_nome", e.target.value)}
                            >
                                <option value="">Todos os utilizadores</option>
                                {opcoes.utilizadores.map((nome) => (
                                    <option key={nome} value={nome}>{nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="logs-filter-field">
                            <label htmlFor="log-perfil">Perfil</label>
                            <select
                                id="log-perfil"
                                value={filtros.perfil}
                                onChange={(e) => alterarFiltro("perfil", e.target.value)}
                            >
                                <option value="">Todos os perfis</option>
                                {opcoes.perfis.map((perfil) => (
                                    <option key={perfil} value={perfil}>{perfil}</option>
                                ))}
                            </select>
                        </div>
                        <div className="logs-filter-actions">
                            <button type="submit" className="admin-btn primary">
                                <Search size={16} /> Filtrar
                            </button>
                            <button type="button" className="admin-btn secondary" onClick={limparFiltros}>
                                <RotateCcw size={16} /> Limpar
                            </button>
                        </div>
                    </form>

                    <div className="admin-toolbar">
                        <span className="admin-counter">
                            {logs.length} registos encontrados
                        </span>
                    </div>

                    <div className="admin-table-wrap">
                        {loading ? (
                            <p className="admin-empty">A carregar logs...</p>
                        ) : logs.length === 0 ? (
                            <p className="admin-empty">Nenhum registo de auditoria encontrado.</p>
                        ) : (
                            <table className="admin-table logs-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Utilizador</th>
                                        <th>Operacao</th>
                                        <th>Motivo</th>
                                        <th className="admin-actions-cell">Detalhe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatarData(log.data_hora)}</td>
                                            <td>
                                                <div className="logs-user-cell">
                                                    <span className="logs-user">
                                                        <UserRound size={14} />
                                                        {log.utilizador_nome || "Sistema"}
                                                    </span>
                                                    <small>{log.utilizador_perfil || "Sem perfil"}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${log.tipo_operacao === "anular" ? "danger" : log.tipo_operacao === "criar" ? "success" : "primary"}`}>
                                                    {log.tipo_operacao || "-"}
                                                </span>
                                            </td>
                                            <td className="logs-motivo-cell">{log.motivo || "-"}</td>
                                            <td className="admin-actions-cell">
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn edit"
                                                    title="Ver detalhe"
                                                    onClick={() => setDetalhe(log)}
                                                >
                                                    <Eye size={17} />
                                                </button>
                                            </td>
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

export default Logs
