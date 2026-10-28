import Sidebar from "../../components/Sidebar/Sidebar.jsx"
import Headers from "../../components/headers/header.jsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import {
    ArrowUp,
    ArrowDown,
    Wallet,
    Receipt,
    TrendingUp,
    CalendarDays,
    Users,
    UserRound,
    Scissors,
    Heart,
    Clock3,
    Plus,
    ChevronRight,
    Sparkles,
    CircleDollarSign,
    UserPlus,
    Tags
} from "lucide-react"
import { getDashboard, getApiError } from "../../services/api.js"
import { LIMITE_FIDELIZACAO, META_FIDELIZACAO } from "../../utils/validacoes.js"
import { useAuthStore } from "../../store/authStore.js"
import "./dashboard.css"

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function formatarData(valor) {
    if (!valor) return "-"
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "-"
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

function variacao(atual, anterior) {
    const base = Number(anterior) || 0
    const valor = Number(atual) || 0
    if (base === 0) return valor > 0 ? 100 : 0
    return ((valor - base) / base) * 100
}

function rotuloMes(mes) {
    if (!mes) return ""
    const [ano, numero] = mes.split("-")
    const data = new Date(Number(ano), Number(numero) - 1, 1)
    return data.toLocaleDateString("pt-MZ", { month: "short" }).replace(".", "")
}

function Trend({ valor, invertido = false }) {
    const positivo = valor >= 0
    const bom = invertido ? !positivo : positivo
    return (
        <span className={`dash-trend ${bom ? "up" : "down"}`}>
            {positivo ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {Math.abs(valor).toFixed(1)}% vs mes anterior
        </span>
    )
}

function DashBoard() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [dados, setDados] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user } = useAuthStore()
    const navigate = useNavigate()

    useEffect(() => {
        let activo = true

        async function carregar() {
            try {
                const res = await getDashboard()
                if (activo) setDados(res.data)
            } catch (err) {
                if (activo) setError(getApiError(err))
            } finally {
                if (activo) setLoading(false)
            }
        }

        carregar()
        return () => { activo = false }
    }, [])

    const resumo = dados?.resumo || {}
    const indicadores = dados?.indicadores || {}
    const serie = dados?.serie || []
    const topServicos = dados?.top_servicos || []
    const topFuncionarios = dados?.top_funcionarios || []
    const recentes = dados?.recentes || []
    const fidelizacao = dados?.fidelizacao || {}

    const maxSerie = Math.max(
        1,
        ...serie.flatMap((item) => [Number(item.receita) || 0, Number(item.despesas) || 0])
    )

    const serieVazia = serie.every((item) => !Number(item.receita) && !Number(item.despesas))

    const maxServico = Math.max(
        1,
        ...topServicos.map((item) => Number(item.quantidade) || 0)
    )

    const nome = user?.nome?.split(" ")[0] || "equipa"
    const hora = new Date().getHours()
    const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite"
    const temPermissao = (codigo) => user?.permissoes?.includes(codigo)
    const podeAtender = temPermissao("atendimentos:escrever")
    const podeClientes = temPermissao("clientes:ler") || temPermissao("clientes:escrever")
    const podeServicos = temPermissao("servicos:ler") || temPermissao("servicos:escrever")
    const podeCategorias = temPermissao("servicos:escrever")
    const podeEquipa = temPermissao("funcionarios:ler") || temPermissao("funcionarios:escrever")

    return (
        <article className="dashboard-main">
            <Headers
                heady="dash-header"
                title="Dashboard"
                h1Class="dash-h1"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
                pClass="p-profile"
                onMenuClick={() => setIsSidebarOpen(true)}
                sidebarOpen={isSidebarOpen}
            />
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <main className="dash-content">
                <header className="dash-welcome">
                    <div>
                        <p className="dash-eyebrow"><Sparkles size={14} /> Visao geral do salao</p>
                        <h1>{saudacao}, {nome}</h1>
                        <p>Acompanhe o desempenho do salao, os atendimentos e a fidelizacao dos clientes.</p>
                    </div>
                    <div className="dash-quick-actions">
                        {podeAtender && (
                            <button type="button" className="dash-action primary" onClick={() => navigate("/novoAtendimento")}>
                                <Plus size={17} /> Novo atendimento
                            </button>
                        )}
                        {podeClientes && (
                            <button type="button" className="dash-action" onClick={() => navigate("/clientes")}>
                                <UserPlus size={17} /> Cliente
                            </button>
                        )}
                        {podeServicos && (
                            <button type="button" className="dash-action" onClick={() => navigate("/servicos")}>
                                <Scissors size={17} /> Servico
                            </button>
                        )}
                    </div>
                </header>

                {error && <div className="dash-alert">{error}</div>}

                {loading ? (
                    <div className="dash-loading">A carregar o dashboard...</div>
                ) : (
                    <>
                        <section className="dash-kpis">
                            <article className="dash-kpi receita">
                                <div className="dash-kpi-icon"><Wallet /></div>
                                <div>
                                    <span>Receita do mes</span>
                                    <strong>{formatarMoeda(resumo.receita)}</strong>
                                    <Trend valor={variacao(resumo.receita, resumo.receita_anterior)} />
                                </div>
                            </article>
                            <article className="dash-kpi despesas">
                                <div className="dash-kpi-icon"><Receipt /></div>
                                <div>
                                    <span>Despesas do mes</span>
                                    <strong>{formatarMoeda(resumo.despesas)}</strong>
                                    <Trend valor={variacao(resumo.despesas, resumo.despesas_anterior)} invertido />
                                </div>
                            </article>
                            <article className="dash-kpi lucro">
                                <div className="dash-kpi-icon"><TrendingUp /></div>
                                <div>
                                    <span>Resultado liquido</span>
                                    <strong>{formatarMoeda(resumo.resultado)}</strong>
                                    <Trend valor={variacao(resumo.resultado, resumo.resultado_anterior)} />
                                </div>
                            </article>
                            <article className="dash-kpi atendimentos">
                                <div className="dash-kpi-icon"><CalendarDays /></div>
                                <div>
                                    <span>Atendimentos do mes</span>
                                    <strong>{Number(indicadores.atendimentos_mes || 0).toLocaleString("pt-MZ")}</strong>
                                    <span className="dash-kpi-note">{indicadores.atendimentos_hoje || 0} hoje · {indicadores.em_andamento || 0} em andamento</span>
                                </div>
                            </article>
                        </section>

                        <section className="dash-mini-stats">
                            <article>
                                <span className="dash-mini-icon clientes"><UserRound /></span>
                                <div><strong>{indicadores.clientes_ativos || 0}</strong><span>Clientes ativos</span></div>
                            </article>
                            <article>
                                <span className="dash-mini-icon equipa"><Users /></span>
                                <div><strong>{indicadores.funcionarios_ativos || 0}</strong><span>Profissionais ativos</span></div>
                            </article>
                            <article>
                                <span className="dash-mini-icon servicos"><Scissors /></span>
                                <div><strong>{indicadores.servicos_ativos || 0}</strong><span>Servicos ativos</span></div>
                            </article>
                            <article>
                                <span className="dash-mini-icon fidelizacao"><Heart /></span>
                                <div><strong>{indicadores.cartoes_fidelizacao || 0}</strong><span>Cartoes de fidelizacao</span></div>
                            </article>
                        </section>

                        <section className="dash-main-grid">
                            <article className="dash-card dash-chart-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Evolucao financeira</h2>
                                        <p>Receita e despesas dos ultimos 6 meses</p>
                                    </div>
                                    <span className="dash-legend">
                                        <i className="receita" /> Receita
                                        <i className="despesas" /> Despesas
                                    </span>
                                </header>

                                <div className={`dash-chart ${serieVazia ? "is-empty" : ""}`}>
                                    {serieVazia ? (
                                        <div className="dash-chart-empty">
                                            <Wallet size={22} />
                                            <strong>Sem movimentos financeiros</strong>
                                            <span>Nao ha receita nem despesas registadas nos ultimos 6 meses.</span>
                                        </div>
                                    ) : (
                                        serie.map((item) => {
                                            const receita = Number(item.receita) || 0
                                            const despesas = Number(item.despesas) || 0
                                            return (
                                                <div className="dash-chart-group" key={item.mes}>
                                                    <div className="dash-chart-bars">
                                                        <span
                                                            className="dash-bar receita"
                                                            style={{ height: `${Math.max((receita / maxSerie) * 100, receita > 0 ? 4 : 0)}%` }}
                                                            title={`Receita: ${formatarMoeda(receita)}`}
                                                        />
                                                        <span
                                                            className="dash-bar despesas"
                                                            style={{ height: `${Math.max((despesas / maxSerie) * 100, despesas > 0 ? 4 : 0)}%` }}
                                                            title={`Despesas: ${formatarMoeda(despesas)}`}
                                                        />
                                                    </div>
                                                    <span className="dash-chart-label">{rotuloMes(item.mes)}</span>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </article>

                            <article className="dash-card dash-fidelity-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Fidelizacao</h2>
                                        <p>Movimento do mes</p>
                                    </div>
                                    <span className="dash-card-icon"><Heart size={18} /></span>
                                </header>

                                <div className="dash-fidelity-main">
                                    <strong>{fidelizacao.marcas || 0}</strong>
                                    <span>marcas atribuidas no mes</span>
                                </div>

                                <div className="dash-fidelity-stats">
                                    <div>
                                        <strong>{fidelizacao.beneficios_ganhos || 0}</strong>
                                        <span>Beneficios ganhos</span>
                                    </div>
                                    <div>
                                        <strong>{fidelizacao.beneficios_utilizados || 0}</strong>
                                        <span>Beneficios usados</span>
                                    </div>
                                    <div>
                                        <strong>{indicadores.cartoes_fidelizacao || 0}</strong>
                                        <span>Cartoes ativos</span>
                                    </div>
                                </div>

                                <p className="dash-fidelity-hint">
                                    As marcas sao acumuladas por cliente, para ambos os sexos. Ao completar{" "}
                                    {META_FIDELIZACAO} marcas (uma por dia), o 6.º servico e gratuito
                                    ate {LIMITE_FIDELIZACAO} MT.
                                </p>
                            </article>
                        </section>

                        <section className="dash-secondary-grid">
                            <article className="dash-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Servicos mais realizados</h2>
                                        <p>No mes atual</p>
                                    </div>
                                    {podeServicos && (
                                        <button type="button" className="dash-link" onClick={() => navigate("/servicos")}>
                                            Ver todos <ChevronRight size={15} />
                                        </button>
                                    )}
                                </header>

                                {topServicos.length === 0 ? (
                                    <p className="dash-empty">Ainda nao ha servicos realizados este mes.</p>
                                ) : (
                                    <div className="dash-ranking">
                                        {topServicos.map((servico, index) => (
                                            <div className="dash-rank-row" key={servico.servico_id}>
                                                <span className="dash-rank-index">{index + 1}</span>
                                                <div className="dash-rank-info">
                                                    <div>
                                                        <strong>{servico.servico_nome}</strong>
                                                        <span>{formatarMoeda(servico.total)}</span>
                                                    </div>
                                                    <div className="dash-progress">
                                                        <span style={{ width: `${Math.max((Number(servico.quantidade) / maxServico) * 100, 6)}%` }} />
                                                    </div>
                                                </div>
                                                <span className="dash-rank-value">{servico.quantidade}x</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>

                            <article className="dash-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Profissionais em destaque</h2>
                                        <p>No mes atual</p>
                                    </div>
                                    {podeEquipa && (
                                        <button type="button" className="dash-link" onClick={() => navigate("/funcionarios")}>
                                            Ver equipa <ChevronRight size={15} />
                                        </button>
                                    )}
                                </header>

                                {topFuncionarios.length === 0 ? (
                                    <p className="dash-empty">Ainda nao existem profissionais registados.</p>
                                ) : (
                                    <div className="dash-professionals">
                                        {topFuncionarios.map((funcionario, index) => (
                                            <div className="dash-professional" key={funcionario.funcionario_id}>
                                                <span className="dash-avatar">{(funcionario.funcionario_nome || "?").charAt(0).toUpperCase()}</span>
                                                <div>
                                                    <strong>{funcionario.funcionario_nome}</strong>
                                                    <span>{funcionario.cargo || "Profissional"}</span>
                                                </div>
                                                <div className="dash-professional-numbers">
                                                    <strong>{funcionario.quantidade}x</strong>
                                                    <span>{formatarMoeda(funcionario.total)}</span>
                                                </div>
                                                <span className={`dash-medal medal-${index + 1}`}>{index + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>

                            <article className="dash-card dash-recent-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Atendimentos recentes</h2>
                                        <p>Ultimos movimentos registados</p>
                                    </div>
                                    {podeAtender && (
                                        <button type="button" className="dash-link" onClick={() => navigate("/novoAtendimento")}>
                                            Ver todos <ChevronRight size={15} />
                                        </button>
                                    )}
                                </header>

                                {recentes.length === 0 ? (
                                    <p className="dash-empty">Ainda nao existem atendimentos registados.</p>
                                ) : (
                                    <div className="dash-recent-list">
                                        {recentes.map((atendimento) => (
                                            <button
                                                type="button"
                                                className="dash-recent-item"
                                                key={atendimento.id}
                                                onClick={() => navigate("/novoAtendimento")}
                                            >
                                                <span className="dash-recent-icon"><Clock3 size={16} /></span>
                                                <span className="dash-recent-info">
                                                    <strong>{atendimento.cliente_nome}</strong>
                                                    <small>
                                                        #{atendimento.id} · {formatarData(atendimento.data_hora)}
                                                        {atendimento.metodos_pagamento ? ` · ${atendimento.metodos_pagamento}` : ""}
                                                    </small>
                                                </span>
                                                <span className={`dash-status ${String(atendimento.estado || "").toLowerCase().replace(/\s+/g, "-")}`}>
                                                    {atendimento.estado}
                                                </span>
                                                <strong className="dash-recent-value">{formatarMoeda(atendimento.valor_total)}</strong>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </article>

                            <article className="dash-card dash-quick-card">
                                <header className="dash-card-header">
                                    <div>
                                        <h2>Acoes rapidas</h2>
                                        <p>Atalhos do dia-a-dia</p>
                                    </div>
                                    <span className="dash-card-icon"><CircleDollarSign size={18} /></span>
                                </header>

                                <div className="dash-quick-grid">
                                    {podeAtender && (
                                        <button type="button" onClick={() => navigate("/novoAtendimento")}>
                                            <CalendarDays size={19} />
                                            <span>Registar atendimento</span>
                                        </button>
                                    )}
                                    {podeClientes && (
                                        <button type="button" onClick={() => navigate("/clientes")}>
                                            <UserPlus size={19} />
                                            <span>Novo cliente</span>
                                        </button>
                                    )}
                                    {podeServicos && (
                                        <button type="button" onClick={() => navigate("/servicos")}>
                                            <Scissors size={19} />
                                            <span>Servicos</span>
                                        </button>
                                    )}
                                    {podeCategorias && (
                                        <button type="button" onClick={() => navigate("/categorias")}>
                                            <Tags size={19} />
                                            <span>Categorias</span>
                                        </button>
                                    )}
                                </div>
                            </article>
                        </section>
                    </>
                )}
            </main>
        </article>
    )
}

export default DashBoard
