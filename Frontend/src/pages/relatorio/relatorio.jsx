import { useEffect, useMemo, useState } from "react";
import SideBar from "../../components/sidebar/siderbar.jsx";
import Headers from "../../components/headers/header.jsx";
import "../admin/admin.css";
import "./relatorio.css";
import {
    Wallet,
    Receipt,
    TrendingUp,
    CalendarDays,
    Users,
    UserRound,
    Scissors,
    Heart,
    Clock3,
    CircleDollarSign,
    CheckCircle2,
    Ban,
    RotateCcw,
    ChartNoAxesCombinedIcon,
    Tag
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    getRelatorioResumo,
    getRelatorioCaixa,
    getRelatorioServicos,
    getRelatorioFuncionarios,
    getRelatorioAssiduidade,
    getRelatorioClientes,
    getRelatorioFidelizacao,
    getRelatorioAnulacoes,
    getRelatorioMovimentos,
    getDespesas,
    getApiError
} from "../../services/api.js";

const PRESETS = [
    { id: "mes", label: "Este mes" },
    { id: "mes-anterior", label: "Mes anterior" },
    { id: "30d", label: "Ultimos 30 dias" },
    { id: "ano", label: "Este ano" },
    { id: "tudo", label: "Todo o periodo" }
];

const CORES_DESPESAS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--chart-7)"
];

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`;
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-MZ");
}

function formatarDataHora(valor) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" });
}

function formatarDataCurta(valor) {
    if (!valor) return "-";
    const [ano, mes, dia] = String(valor).slice(0, 10).split("-").map(Number);
    if (!ano || !mes || !dia) return "-";
    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-MZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatarDiaCurto(chave) {
    const [ano, mes, dia] = String(chave).split("-").map(Number);
    if (!ano || !mes || !dia) return chave;
    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-MZ", {
        day: "2-digit",
        month: "2-digit"
    });
}

function formatarMesCurto(chave) {
    const [ano, mes] = String(chave).split("-").map(Number);
    if (!ano || !mes) return chave;
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-MZ", {
        month: "short",
        year: "2-digit"
    }).replace(".", "");
}

function isoData(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function periodoDoPreset(preset) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    switch (preset) {
        case "mes":
            return { de: isoData(new Date(ano, mes, 1)), ate: isoData(hoje) };
        case "mes-anterior":
            return { de: isoData(new Date(ano, mes - 1, 1)), ate: isoData(new Date(ano, mes, 0)) };
        case "30d": {
            const inicio = new Date(hoje);
            inicio.setDate(inicio.getDate() - 29);
            return { de: isoData(inicio), ate: isoData(hoje) };
        }
        case "ano":
            return { de: isoData(new Date(ano, 0, 1)), ate: isoData(hoje) };
        default:
            return { de: "", ate: "" };
    }
}

function iniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function Vazio({ titulo, texto }) {
    return (
        <div className="relatorio-empty">
            <CalendarDays size={26} />
            <strong>{titulo}</strong>
            <span>{texto}</span>
        </div>
    );
}

function Relatorio() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filtros, setFiltros] = useState(() => periodoDoPreset("mes"));
    const [periodo, setPeriodo] = useState(() => periodoDoPreset("mes"));
    const [presetAtivo, setPresetAtivo] = useState("mes");
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tabAtiva, setTabAtiva] = useState("resumo");
    const [recarregar, setRecarregar] = useState(0);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
    const [salarioDetalhe, setSalarioDetalhe] = useState(null);

    useEffect(() => {
        let activo = true;

        async function carregar() {
            setLoading(true);
            setError(null);

            try {
                const params = {};
                if (periodo.de) params.de = periodo.de;
                if (periodo.ate) params.ate = periodo.ate;

                const [
                    resResumo,
                    resCaixa,
                    resServicos,
                    resFuncionarios,
                    resAssiduidade,
                    resClientes,
                    resFidelizacao,
                    resAnulacoes,
                    resMovimentos,
                    resDespesas
                ] = await Promise.all([
                    getRelatorioResumo(params),
                    getRelatorioCaixa(params),
                    getRelatorioServicos(params),
                    getRelatorioFuncionarios(params),
                    getRelatorioAssiduidade(params),
                    getRelatorioClientes(params),
                    getRelatorioFidelizacao(params),
                    getRelatorioAnulacoes(params),
                    getRelatorioMovimentos(params),
                    getDespesas({ ...params, estado: "Ativo" })
                ]);

                if (!activo) return;

                setDados({
                    resumo: resResumo.data || {},
                    caixa: resCaixa.data || {},
                    servicos: Array.isArray(resServicos.data) ? resServicos.data : [],
                    funcionarios: Array.isArray(resFuncionarios.data) ? resFuncionarios.data : [],
                    assiduidade: Array.isArray(resAssiduidade.data) ? resAssiduidade.data : [],
                    clientes: Array.isArray(resClientes.data) ? resClientes.data : [],
                    fidelizacao: resFidelizacao.data || {},
                    anulacoes: Array.isArray(resAnulacoes.data) ? resAnulacoes.data : [],
                    movimentos: Array.isArray(resMovimentos.data) ? resMovimentos.data : [],
                    despesas: Array.isArray(resDespesas.data) ? resDespesas.data : []
                });
            } catch (err) {
                if (activo) setError(getApiError(err));
            } finally {
                if (activo) setLoading(false);
            }
        }

        carregar();
        return () => { activo = false; };
    }, [periodo.de, periodo.ate, recarregar]);

    useEffect(() => {
        let activo = true;

        async function carregarSalario() {
            if (!funcionarioSelecionado) {
                setSalarioDetalhe(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Converter periodo para formato YYYY-MM baseado nos filtros atuais
                const periodoFmt = filtros.de 
                    ? `${filtros.de.slice(0, 4)}-${filtros.de.slice(5, 7)}` 
                    : undefined;

                const { data } = await getProcessamentosFuncionario(funcionarioSelecionado.id, {
                    periodo: periodoFmt
                });

                if (!activo) return;

                const processamentos = data.rows || data || [];
                const ultimoProcessamento = processamentos[0];

                if (!ultimoProcessamento) {
                    setSalarioDetalhe(null);
                    return;
                }

                const periodoTexto = `${ultimoProcessamento.periodo_inicio} a ${ultimoProcessamento.periodo_fim}`;
                const salarioBase = ultimoProcessamento.salario_base || 0;
                const totalComissoes = ultimoProcessamento.total_comissoes || 0;
                const totalAPagar = ultimoProcessamento.total_a_pagar || 0;

                setSalarioDetalhe({
                    periodo: periodoTexto,
                    salario_base: salarioBase,
                    total_comissoes: totalComissoes,
                    total_a_pagar: totalAPagar,
                    estado: ultimoProcessamento.estado
                });
            } catch (err) {
                if (activo) setError(getApiError(err));
            } finally {
                if (activo) setLoading(false);
            }
        }

        carregarSalario();
        return () => { activo = false; };
    }, [funcionarioSelecionado, filtros.de, filtros.ate]);

    function escolherPreset(preset) {
        const novoPeriodo = periodoDoPreset(preset);
        setPresetAtivo(preset);
        setFiltros(novoPeriodo);
        setPeriodo(novoPeriodo);
        setError(null);
    }

    function alterarFiltro(campo, valor) {
        setFiltros((anteriores) => ({ ...anteriores, [campo]: valor }));
        setPresetAtivo("custom");
        if (error) setError(null);
    }

    function aplicarPeriodo() {
        if (filtros.de && filtros.ate && filtros.de > filtros.ate) {
            setError("A data inicial nao pode ser posterior a data final.");
            return;
        }

        setPresetAtivo("custom");
        setPeriodo({ ...filtros });
        setError(null);
    }

    function atualizar() {
        setRecarregar((valor) => valor + 1);
    }

    const resumo = dados?.resumo || {};
    const caixa = dados?.caixa || {};
    const sessoes = Array.isArray(caixa.sessoes) ? caixa.sessoes : [];
    const servicos = dados?.servicos || [];
    const funcionarios = dados?.funcionarios || [];
    const assiduidade = dados?.assiduidade || [];
    const clientes = dados?.clientes || [];
    const fidelizacao = dados?.fidelizacao || {};
    const anulacoes = dados?.anulacoes || [];
    const movimentos = dados?.movimentos || [];
    const despesas = dados?.despesas || [];

    const receita = Number(resumo.receita) || 0;
    const despesasTotal = Number(resumo.despesas) || 0;
    const resultado = Number(resumo.resultado) || 0;
    const margem = receita > 0 ? (resultado / receita) * 100 : 0;
    const totalServicos = servicos.reduce((soma, servico) => soma + Number(servico.quantidade || 0), 0);

    const fluxo = useMemo(() => {
        const activos = movimentos.filter((movimento) => movimento.estado === "Ativo");

        if (activos.length === 0) {
            return { itens: [], porMes: false };
        }

        const dias = new Set(
            activos
                .map((movimento) => String(movimento.data_hora || "").slice(0, 10))
                .filter(Boolean)
        );
        const porMes = dias.size > 45;
        const mapa = new Map();

        activos.forEach((movimento) => {
            const data = String(movimento.data_hora || "").slice(0, 10);
            if (!data) return;

            const chave = porMes ? data.slice(0, 7) : data;
            if (!mapa.has(chave)) {
                mapa.set(chave, {
                    chave,
                    label: porMes ? formatarMesCurto(chave) : formatarDiaCurto(chave),
                    entradas: 0,
                    saidas: 0,
                    levantamentos: 0
                });
            }

            const item = mapa.get(chave);
            const valor = Number(movimento.valor || 0);

            if (movimento.tipo_movimento === "Entrada") item.entradas += valor;
            if (movimento.tipo_movimento === "Saida") item.saidas += valor;
            if (movimento.tipo_movimento === "Levantamento") item.levantamentos += valor;
        });

        return {
            itens: [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave)),
            porMes
        };
    }, [movimentos]);

    const despesasCategoria = useMemo(() => {
        const mapa = new Map();

        despesas.forEach((despesa) => {
            const nome = despesa.categoria_nome || "Sem categoria";
            mapa.set(nome, (mapa.get(nome) || 0) + Number(despesa.valor_total || 0));
        });

        const lista = [...mapa.entries()]
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (lista.length <= 6) return lista;

        const principais = lista.slice(0, 5);
        const outros = lista.slice(5).reduce((soma, item) => soma + item.value, 0);
        return [...principais, { name: "Outros", value: outros }];
    }, [despesas]);

    const totalDespesasCategoria = despesasCategoria.reduce((soma, item) => soma + item.value, 0);
    const maxServico = Math.max(1, ...servicos.map((servico) => Number(servico.total) || 0));
    const servicosVisiveis = servicos.slice(0, 8);
    const funcionariosVisiveis = funcionarios.slice(0, 12);
    const maxFuncionario = Math.max(1, ...funcionarios.map((funcionario) => Number(funcionario.total_servicos) || 0));
    const clientesComAtendimentos = clientes.filter((cliente) => Number(cliente.atendimentos) > 0);
    const clientesVisiveis = clientesComAtendimentos.slice(0, 12);
    const funcionariosDestaque = funcionarios
        .filter((funcionario) => Number(funcionario.total_servicos) > 0)
        .slice(0, 3);

    const marcas = Number(fidelizacao.marcas) || 0;
    const beneficiosGanhos = Number(fidelizacao.beneficios_ganhos) || 0;
    const beneficiosUtilizados = Number(fidelizacao.beneficios_utilizados) || 0;
    const taxaBeneficios = beneficiosGanhos > 0 ? (beneficiosUtilizados / beneficiosGanhos) * 100 : 0;

    const totalAnulacoes = anulacoes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
    const atendimentosAnulados = anulacoes.filter((item) => item.tipo === "atendimento").length;
    const pagamentosAnulados = anulacoes.filter((item) => item.tipo === "pagamento").length;
    const saldoCaixa = (Number(caixa.entradas) || 0) - (Number(caixa.saidas) || 0) - (Number(caixa.levantamentos) || 0);

    const rotuloPeriodo = periodo.de || periodo.ate
        ? `${periodo.de ? formatarDataCurta(periodo.de) : "Inicio"} — ${periodo.ate ? formatarDataCurta(periodo.ate) : "Hoje"}`
        : "Todo o periodo";

    const tabs = [
        { id: "resumo", label: "Resumo", Icone: ChartNoAxesCombinedIcon },
        { id: "equipa", label: "Equipa", Icone: Users, badge: funcionarios.length },
        { id: "clientes", label: "Clientes", Icone: UserRound, badge: clientesComAtendimentos.length },
        { id: "caixa", label: "Caixa", Icone: Wallet, badge: movimentos.length },
        { id: "anulacoes", label: "Anulacoes", Icone: Ban, badge: anulacoes.length }
    ];

    return (
        <div className="admin-main">
            <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <Headers
                heady="admin-header"
                title="Relatorios"
                h1Class="admin-header-title"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
                onMenuClick={() => setIsSidebarOpen(true)}
            />

            <main className="admin-content">
                <header className="admin-page-header">
                    <div className="admin-page-header-inner">
                        <div>
                            <h1 className="admin-page-title">Relatorios</h1>
                            <p className="admin-page-subtitle">
                                Leia o pulso do salao: receita, despesas, equipa, clientes e caixa num unico painel.
                            </p>
                        </div>
                        <div className="admin-page-actions">
                            <span className="relatorio-periodo-badge">
                                <CalendarDays size={15} />
                                {rotuloPeriodo}
                            </span>
                            <button type="button" className="admin-btn secondary" onClick={atualizar} disabled={loading}>
                                <RotateCcw size={16} className={loading ? "relatorio-spin" : ""} />
                                {loading ? "A atualizar..." : "Atualizar"}
                            </button>
                        </div>
                    </div>
                </header>

                {error && <div className="admin-alert error">{error}</div>}

                <section className="relatorio-periodo">
                    <div className="relatorio-presets">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                className={`relatorio-preset ${presetAtivo === preset.id ? "active" : ""}`}
                                onClick={() => escolherPreset(preset.id)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="relatorio-datas">
                        <label>
                            <span>De</span>
                            <input
                                type="date"
                                value={filtros.de}
                                max={filtros.ate || undefined}
                                onChange={(e) => alterarFiltro("de", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Ate</span>
                            <input
                                type="date"
                                value={filtros.ate}
                                min={filtros.de || undefined}
                                onChange={(e) => alterarFiltro("ate", e.target.value)}
                            />
                        </label>
                        <button type="button" className="admin-btn primary relatorio-apply" onClick={aplicarPeriodo}>
                            Aplicar
                        </button>
                    </div>
                </section>

                {!dados ? (
                    <section className="relatorio-loading-card">
                        {loading ? (
                            <>
                                <span className="relatorio-loader" />
                                <strong>A carregar relatorios...</strong>
                                <span>Estamos a reunir os dados do periodo selecionado.</span>
                            </>
                        ) : (
                            <>
                                <Ban size={30} />
                                <strong>Nao foi possivel carregar os relatorios</strong>
                                <span>Verifique a ligacao ao servidor e tente novamente.</span>
                                <button type="button" className="admin-btn secondary" onClick={atualizar}>
                                    <RotateCcw size={16} />
                                    Tentar novamente
                                </button>
                            </>
                        )}
                    </section>
                ) : (
                    <>
                        <section className="relatorio-kpis">
                            <article className="relatorio-kpi receita">
                                <span className="relatorio-kpi-icon"><TrendingUp size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Receita</span>
                                    <strong>{formatarMoeda(receita)}</strong>
                                    <small>{formatarNumero(totalServicos)} servicos realizados</small>
                                </div>
                            </article>

                            <article className="relatorio-kpi despesa">
                                <span className="relatorio-kpi-icon"><Receipt size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Despesas</span>
                                    <strong>{formatarMoeda(despesasTotal)}</strong>
                                    <small>{formatarNumero(despesas.length)} despesas ativas</small>
                                </div>
                            </article>

                            <article className={`relatorio-kpi resultado ${resultado < 0 ? "negativo" : ""}`}>
                                <span className="relatorio-kpi-icon"><Wallet size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Resultado</span>
                                    <strong>{formatarMoeda(resultado)}</strong>
                                    <small>{resultado < 0 ? "Resultado negativo" : "Resultado positivo"}</small>
                                </div>
                            </article>

                            <article className={`relatorio-kpi margem ${margem < 0 ? "negativo" : ""}`}>
                                <span className="relatorio-kpi-icon"><CircleDollarSign size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Margem</span>
                                    <strong>{margem.toFixed(1)}%</strong>
                                    <div className="relatorio-margin-bar">
                                        <span style={{ width: `${Math.max(0, Math.min(100, margem))}%` }} />
                                    </div>
                                </div>
                            </article>
                        </section>

                        <nav className="relatorio-tabs" role="tablist" aria-label="Seccoes do relatorio">
                            {tabs.map((tab) => {
                                const Icone = tab.Icone;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tabAtiva === tab.id}
                                        className={`relatorio-tab ${tabAtiva === tab.id ? "active" : ""}`}
                                        onClick={() => setTabAtiva(tab.id)}
                                    >
                                        <Icone size={16} />
                                        <span>{tab.label}</span>
                                        {tab.badge !== undefined && <span className="relatorio-tab-count">{tab.badge}</span>}
                                    </button>
                                );
                            })}
                        </nav>

                        {tabAtiva === "resumo" && (
                            <div className="relatorio-resumo-grid">
                                <article className="relatorio-card relatorio-card-span2">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Fluxo de caixa</h2>
                                            <p>{fluxo.porMes ? "Movimentos ativos agrupados por mes" : "Movimentos ativos por dia"}</p>
                                        </div>
                                        <span className="relatorio-card-chip">
                                            {fluxo.itens.length} {fluxo.porMes ? "meses" : "dias"}
                                        </span>
                                    </header>

                                    {fluxo.itens.length === 0 ? (
                                        <Vazio
                                            titulo="Sem movimentos no periodo"
                                            texto="As entradas, saidas e levantamentos de caixa aparecem aqui."
                                        />
                                    ) : (
                                        <>
                                            <div className="relatorio-chart" role="img" aria-label="Grafico de fluxo de caixa">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={fluxo.itens} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                                        <XAxis
                                                            dataKey="label"
                                                            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            minTickGap={18}
                                                        />
                                                        <YAxis
                                                            tickFormatter={(valor) => Number(valor) >= 1000 ? `${Math.round(Number(valor) / 1000)}k` : String(valor)}
                                                            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            width={42}
                                                        />
                                                        <Tooltip
                                                            formatter={(valor) => formatarMoeda(valor)}
                                                            cursor={{ fill: "var(--surface-tint)", fillOpacity: 0.55 }}
                                                            contentStyle={{
                                                                background: "var(--surface)",
                                                                color: "var(--text)",
                                                                borderRadius: 10,
                                                                border: "1px solid var(--border)",
                                                                boxShadow: "var(--shadow-md)",
                                                                fontSize: 12
                                                            }}
                                                            itemStyle={{ color: "var(--text-muted)" }}
                                                            labelStyle={{ color: "var(--text)", fontWeight: 700 }}
                                                        />
                                                        <Bar dataKey="entradas" name="Entradas" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="saidas" name="Saidas" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="levantamentos" name="Levantamentos" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="relatorio-chart-legend">
                                                <span><i style={{ background: "var(--success)" }} /> Entradas</span>
                                                <span><i style={{ background: "var(--danger)" }} /> Saidas</span>
                                                <span><i style={{ background: "var(--warning)" }} /> Levantamentos</span>
                                            </div>
                                        </>
                                    )}
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Despesas por categoria</h2>
                                            <p>Peso de cada categoria no periodo</p>
                                        </div>
                                        <Tag size={17} className="relatorio-card-mark" />
                                    </header>

                                    {despesasCategoria.length === 0 ? (
                                        <Vazio
                                            titulo="Sem despesas ativas"
                                            texto="As categorias com gastos aparecem assim que existirem despesas no periodo."
                                        />
                                    ) : (
                                        <div className="relatorio-pie-layout">
                                            <div className="relatorio-pie-chart">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={despesasCategoria}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            innerRadius="62%"
                                                            outerRadius="90%"
                                                            paddingAngle={3}
                                                            stroke="none"
                                                        >
                                                            {despesasCategoria.map((item, indice) => (
                                                                <Cell key={item.name} fill={CORES_DESPESAS[indice % CORES_DESPESAS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(valor) => formatarMoeda(valor)}
                                                            contentStyle={{
                                                                background: "var(--surface)",
                                                                color: "var(--text)",
                                                                borderRadius: 10,
                                                                border: "1px solid var(--border)",
                                                                boxShadow: "var(--shadow-md)",
                                                                fontSize: 12
                                                            }}
                                                            itemStyle={{ color: "var(--text-muted)" }}
                                                            labelStyle={{ color: "var(--text)", fontWeight: 700 }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="relatorio-pie-center">
                                                    <span>Total</span>
                                                    <strong>{formatarMoeda(totalDespesasCategoria)}</strong>
                                                </div>
                                            </div>

                                            <div className="relatorio-pie-legend">
                                                {despesasCategoria.map((item, indice) => (
                                                    <div className="relatorio-pie-legend-item" key={item.name}>
                                                        <span className="relatorio-pie-dot" style={{ background: CORES_DESPESAS[indice % CORES_DESPESAS.length] }} />
                                                        <span className="relatorio-pie-name">{item.name}</span>
                                                        <strong>{formatarMoeda(item.value)}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Servicos mais realizados</h2>
                                            <p>Por receita gerada no periodo</p>
                                        </div>
                                        <Scissors size={17} className="relatorio-card-mark" />
                                    </header>

                                    {servicosVisiveis.length === 0 ? (
                                        <Vazio
                                            titulo="Sem servicos no periodo"
                                            texto="Ainda nao ha servicos concluidos para o intervalo escolhido."
                                        />
                                    ) : (
                                        <div className="relatorio-rank-list">
                                            {servicosVisiveis.map((servico, indice) => (
                                                <div className="relatorio-rank-row" key={servico.servico_id}>
                                                    <span className="relatorio-rank-index">{String(indice + 1).padStart(2, "0")}</span>
                                                    <div className="relatorio-rank-main">
                                                        <div className="relatorio-rank-line">
                                                            <span>{servico.servico_nome}</span>
                                                            <strong>{formatarMoeda(servico.total)}</strong>
                                                        </div>
                                                        <div className="relatorio-rank-bar">
                                                            <span style={{ width: `${Math.max((Number(servico.total) / maxServico) * 100, 4)}%` }} />
                                                        </div>
                                                        <small>{formatarNumero(servico.quantidade)} realizacoes</small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Fidelizacao</h2>
                                            <p>O ciclo de beneficios no periodo</p>
                                        </div>
                                        <Heart size={17} className="relatorio-card-mark" />
                                    </header>

                                    <div className="relatorio-loyalty-grid">
                                        <div className="relatorio-loyalty-item">
                                            <span>Marcas</span>
                                            <strong>{formatarNumero(marcas)}</strong>
                                            <small>visitas registadas</small>
                                        </div>
                                        <div className="relatorio-loyalty-item">
                                            <span>Ganhos</span>
                                            <strong>{formatarNumero(beneficiosGanhos)}</strong>
                                            <small>beneficios gerados</small>
                                        </div>
                                        <div className="relatorio-loyalty-item">
                                            <span>Usados</span>
                                            <strong>{formatarNumero(beneficiosUtilizados)}</strong>
                                            <small>beneficios resgatados</small>
                                        </div>
                                    </div>

                                    <div className="relatorio-loyalty-progress">
                                        <div className="relatorio-loyalty-progress-line">
                                            <span>Utilizacao dos beneficios</span>
                                            <strong>{taxaBeneficios.toFixed(0)}%</strong>
                                        </div>
                                        <div className="relatorio-mini-bar">
                                            <span style={{ width: `${Math.min(100, Math.max(0, taxaBeneficios))}%` }} />
                                        </div>
                                    </div>
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Equipa em destaque</h2>
                                            <p>Quem mais receita gerou</p>
                                        </div>
                                        <Users size={17} className="relatorio-card-mark" />
                                    </header>

                                    {funcionariosDestaque.length === 0 ? (
                                        <Vazio
                                            titulo="Sem atividade da equipa"
                                            texto="Os servicos atribuidos aos funcionarios aparecem aqui."
                                        />
                                    ) : (
                                        <div className="relatorio-team-list">
                                            {funcionariosDestaque.map((funcionario, indice) => (
                                                <div className="relatorio-team-row" key={funcionario.funcionario_id}>
                                                    <span className={`relatorio-avatar posicao-${indice + 1}`}>
                                                        {iniciais(funcionario.funcionario_nome)}
                                                    </span>
                                                    <div className="relatorio-team-info">
                                                        <strong>{funcionario.funcionario_nome}</strong>
                                                        <small>{formatarNumero(funcionario.servicos)} servicos</small>
                                                    </div>
                                                    <strong className="relatorio-team-value">
                                                        {formatarMoeda(funcionario.total_servicos)}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            </div>
                        )}

                        {tabAtiva === "equipa" && (
                            <div className="relatorio-grid-2">
                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Desempenho da equipa</h2>
                                            <p>Servicos, receita e comissoes por funcionario</p>
                                        </div>
                                        <Users size={17} className="relatorio-card-mark" />
                                    </header>

                                    {funcionariosVisiveis.length === 0 ? (
                                        <Vazio
                                            titulo="Sem funcionarios registados"
                                            texto="Adicione funcionarios para acompanhar o desempenho da equipa."
                                        />
                                    ) : (
                                        <div className="relatorio-table-scroll">
                                            <table className="admin-table relatorio-table">
                                                <thead>
                                                    <tr>
                                                        <th>Funcionario</th>
                                                        <th>Servicos</th>
                                                        <th>Receita</th>
                                                        <th>Comissoes</th>
                                                        <th>Salario</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {funcionariosVisiveis.map((funcionario) => (
                                                        <tr key={funcionario.funcionario_id} onClick={() => setFuncionarioSelecionado(funcionario)}>
                                                            <td>
                                                                <div className="relatorio-person">
                                                                    <span className="relatorio-avatar">
                                                                        {iniciais(funcionario.funcionario_nome)}
                                                                    </span>
                                                                    <div>
                                                                        <strong>{funcionario.funcionario_nome}</strong>
                                                                        <div className="relatorio-mini-bar">
                                                                            <span style={{ width: `${Math.max((Number(funcionario.total_servicos) / maxFuncionario) * 100, 3)}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>{formatarNumero(funcionario.servicos)}</td>
                                                            <td>{formatarMoeda(funcionario.total_servicos)}</td>
                                                            <td>{formatarMoeda(funcionario.total_comissoes)}</td>
                                                            <td>{formatarMoeda(funcionario.salario_base)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {funcionarios.length > funcionariosVisiveis.length && (
                                        <p className="relatorio-footnote">
                                            A mostrar os {funcionariosVisiveis.length} funcionarios com mais receita.
                                        </p>
                                    )}
                                </article>

                                {/* Painel de detalhes do salário */}
                                {funcionarioSelecionado && (
                                    <div className="salario-detalhe-panel">
                                        <div className="salario-detalhe-header">
                                            <h3>Detalhes Salariais - {funcionarioSelecionado.nome}</h3>
                                            <button
                                                onClick={() => setFuncionarioSelecionado(null)}
                                                className="btn-fechar-detalhe"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="salario-detalhe-conteudo">
                                            {salarioDetalhe ? (
                                                <div className="salario-detalhe-grid">
                                                    <div className="salario-detalhe-item">
                                                        <strong>Mês Referente:</strong> {salarioDetalhe.periodo}
                                                    </div>
                                                    <div className="salario-detalhe-item">
                                                        <strong>Salário Base:</strong> {formatarMoeda(salarioDetalhe.salario_base)}
                                                    </div>
                                                    <div className="salario-detalhe-item">
                                                        <strong>Comissões Acumuladas:</strong> {formatarMoeda(salarioDetalhe.total_comissoes)}
                                                    </div>
                                                    <div className="salario-detalhe-item total">
                                                        <strong>Total a Pagar:</strong> {formatarMoeda(salarioDetalhe.total_a_pagar)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p>Carregando detalhes salariais...</p>
                                            )}
                                            <div className="salario-detalhe-status">
                                                <strong>Estado:</strong> {salarioDetalhe?.estado === 'Pago' ? 'Pago' : salarioDetalhe?.estado === 'Aprovado' ? 'Aprovado' : 'Preparado'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Assiduidade</h2>
                                            <p>Registos e ocorrencias no periodo</p>
                                        </div>
                                        <Clock3 size={17} className="relatorio-card-mark" />
                                    </header>

                                    {assiduidade.length === 0 ? (
                                        <Vazio
                                            titulo="Sem registos de assiduidade"
                                            texto="Os registos de presenca e ocorrencias aparecem aqui."
                                        />
                                    ) : (
                                        <div className="relatorio-table-scroll">
                                            <table className="admin-table relatorio-table relatorio-table-compact">
                                                <thead>
                                                    <tr>
                                                        <th>Funcionario</th>
                                                        <th>Registos</th>
                                                        <th>Ocorrencias</th>
                                                        <th>Atrasos</th>
                                                        <th>Faltas</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {assiduidade.map((registo) => (
                                                        <tr key={registo.funcionario_id}>
                                                            <td>{registo.funcionario_nome}</td>
                                                            <td>{formatarNumero(registo.registos)}</td>
                                                            <td>
                                                                <span className={`relatorio-pill ${Number(registo.ocorrencias) > 0 ? "warning" : "success"}`}>
                                                                    {formatarNumero(registo.ocorrencias)}
                                                                </span>
                                                            </td>
                                                            <td>{formatarNumero(registo.atrasos)}</td>
                                                            <td>{formatarNumero(registo.faltas)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </article>
                            </div>
                        )}

                        {tabAtiva === "clientes" && (
                            <div className="relatorio-grid-2">
                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Clientes mais frequentes</h2>
                                            <p>Frequencia e valor gerado no periodo</p>
                                        </div>
                                        <UserRound size={17} className="relatorio-card-mark" />
                                    </header>

                                    <div className="relatorio-client-stats">
                                        <div>
                                            <span>Base de clientes</span>
                                            <strong>{formatarNumero(clientes.length)}</strong>
                                        </div>
                                        <div>
                                            <span>Atendidos no periodo</span>
                                            <strong>{formatarNumero(clientesComAtendimentos.length)}</strong>
                                        </div>
                                    </div>

                                    {clientesVisiveis.length === 0 ? (
                                        <Vazio
                                            titulo="Sem atendimentos no periodo"
                                            texto="Escolha outro intervalo para ver os clientes que mais voltaram."
                                        />
                                    ) : (
                                        <div className="relatorio-table-scroll">
                                            <table className="admin-table relatorio-table">
                                                <thead>
                                                    <tr>
                                                        <th>Cliente</th>
                                                        <th>Atendimentos</th>
                                                        <th>Total gasto</th>
                                                        <th>Media</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {clientesVisiveis.map((cliente) => {
                                                        const media = Number(cliente.atendimentos) > 0
                                                            ? Number(cliente.total_gasto) / Number(cliente.atendimentos)
                                                            : 0;
                                                        return (
                                                            <tr key={cliente.cliente_id}>
                                                                <td>
                                                                    <div className="relatorio-person">
                                                                        <span className="relatorio-avatar">{iniciais(cliente.cliente_nome)}</span>
                                                                        <div>
                                                                            <strong>{cliente.cliente_nome}</strong>
                                                                            <small>{cliente.telefone || "Sem telefone"}</small>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>{formatarNumero(cliente.atendimentos)}</td>
                                                                <td>{formatarMoeda(cliente.total_gasto)}</td>
                                                                <td>{formatarMoeda(media)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {clientesComAtendimentos.length > clientesVisiveis.length && (
                                        <p className="relatorio-footnote">
                                            A mostrar os {clientesVisiveis.length} clientes com mais atendimentos.
                                        </p>
                                    )}
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Fidelizacao</h2>
                                            <p>Como o programa de beneficios esta a rodar</p>
                                        </div>
                                        <Heart size={17} className="relatorio-card-mark" />
                                    </header>

                                    <div className="relatorio-loyalty-list">
                                        <div className="relatorio-loyalty-row">
                                            <span><Heart size={15} /> Marcas de fidelizacao</span>
                                            <strong>{formatarNumero(marcas)}</strong>
                                        </div>
                                        <div className="relatorio-loyalty-row">
                                            <span><CheckCircle2 size={15} /> Beneficios ganhos</span>
                                            <strong>{formatarNumero(beneficiosGanhos)}</strong>
                                        </div>
                                        <div className="relatorio-loyalty-row">
                                            <span><CircleDollarSign size={15} /> Beneficios utilizados</span>
                                            <strong>{formatarNumero(beneficiosUtilizados)}</strong>
                                        </div>
                                    </div>

                                    <div className="relatorio-loyalty-progress relatorio-loyalty-progress-large">
                                        <div className="relatorio-loyalty-progress-line">
                                            <span>Taxa de utilizacao</span>
                                            <strong>{taxaBeneficios.toFixed(0)}%</strong>
                                        </div>
                                        <div className="relatorio-mini-bar">
                                            <span style={{ width: `${Math.min(100, Math.max(0, taxaBeneficios))}%` }} />
                                        </div>
                                    </div>

                                    <p className="relatorio-note">
                                        As marcas sao acumuladas por dia. Ao completar 5/5, o 6.º servico tem de ser gratuito e nao pode ser guardado para depois.
                                    </p>
                                </article>
                            </div>
                        )}

                        {tabAtiva === "caixa" && (
                            <>
                                <section className="relatorio-caixa-resumo">
                                    <article className="relatorio-stat-mini success">
                                        <span><TrendingUp size={18} /> Entradas</span>
                                        <strong>{formatarMoeda(caixa.entradas)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini danger">
                                        <span><Receipt size={18} /> Saidas</span>
                                        <strong>{formatarMoeda(caixa.saidas)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><Wallet size={18} /> Levantamentos</span>
                                        <strong>{formatarMoeda(caixa.levantamentos)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><CircleDollarSign size={18} /> Saldo</span>
                                        <strong>{formatarMoeda(saldoCaixa)}</strong>
                                    </article>
                                </section>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Fechos de caixa</h2>
                                            <p>Sessoes fechadas no periodo</p>
                                        </div>
                                        <span className="relatorio-card-chip">{sessoes.length} sessoes</span>
                                    </header>

                                    {sessoes.length === 0 ? (
                                        <Vazio
                                            titulo="Sem sessoes fechadas"
                                            texto="Os fechos de caixa realizados no intervalo aparecem aqui."
                                        />
                                    ) : (
                                        <div className="relatorio-table-scroll">
                                            <table className="admin-table relatorio-table">
                                                <thead>
                                                    <tr>
                                                        <th>Abertura</th>
                                                        <th>Fecho</th>
                                                        <th>Saldo inicial</th>
                                                        <th>Esperado</th>
                                                        <th>Contado</th>
                                                        <th>Diferenca</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sessoes.map((sessao) => {
                                                        const diferenca = Number(sessao.diferenca) || 0;
                                                        return (
                                                            <tr key={sessao.id}>
                                                                <td>{formatarDataHora(sessao.data_abertura)}</td>
                                                                <td>{formatarDataHora(sessao.data_fecho)}</td>
                                                                <td>{formatarMoeda(sessao.saldo_inicial)}</td>
                                                                <td>{formatarMoeda(sessao.valor_esperado)}</td>
                                                                <td>{formatarMoeda(sessao.valor_contado)}</td>
                                                                <td>
                                                                    <span className={`relatorio-pill ${diferenca === 0 ? "success" : "danger"}`}>
                                                                        {formatarMoeda(diferenca)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </article>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Movimentos de caixa</h2>
                                            <p>Historico completo do periodo, incluindo anulados</p>
                                        </div>
                                        <span className="relatorio-card-chip">{movimentos.length} movimentos</span>
                                    </header>

                                    {movimentos.length === 0 ? (
                                        <Vazio
                                            titulo="Sem movimentos de caixa"
                                            texto="As entradas, saidas e levantamentos aparecem neste historico."
                                        />
                                    ) : (
                                        <div className="relatorio-table-scroll relatorio-table-scroll-tall">
                                            <table className="admin-table relatorio-table">
                                                <thead>
                                                    <tr>
                                                        <th>Data</th>
                                                        <th>Tipo</th>
                                                        <th>Descricao</th>
                                                        <th>Origem</th>
                                                        <th>Valor</th>
                                                        <th>Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {movimentos.map((movimento) => (
                                                        <tr key={movimento.id}>
                                                            <td>{formatarDataHora(movimento.data_hora)}</td>
                                                            <td>
                                                                <span className={`relatorio-pill tipo-${String(movimento.tipo_movimento || "").toLowerCase()}`}>
                                                                    {movimento.tipo_movimento}
                                                                </span>
                                                            </td>
                                                            <td>{movimento.descricao || "-"}</td>
                                                            <td>{movimento.origem || "-"}</td>
                                                            <td>{formatarMoeda(movimento.valor)}</td>
                                                            <td>
                                                                <span className={`relatorio-pill ${movimento.estado === "Anulado" ? "neutral" : "success"}`}>
                                                                    {movimento.estado || "Ativo"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </article>
                            </>
                        )}

                        {tabAtiva === "anulacoes" && (
                            <>
                                <section className="relatorio-anulacoes-resumo">
                                    <article className="relatorio-stat-mini danger">
                                        <span><Ban size={18} /> Total anulado</span>
                                        <strong>{formatarMoeda(totalAnulacoes)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><Receipt size={18} /> Registo</span>
                                        <strong>{formatarNumero(anulacoes.length)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><Scissors size={18} /> Atendimentos</span>
                                        <strong>{formatarNumero(atendimentosAnulados)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini neutral">
                                        <span><Wallet size={18} /> Pagamentos</span>
                                        <strong>{formatarNumero(pagamentosAnulados)}</strong>
                                    </article>
                                </section>

                                <article className="relatorio-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Anulacoes do periodo</h2>
                                            <p>Atendimentos e pagamentos anulados com o respetivo motivo</p>
                                        </div>
                                        <span className="relatorio-card-chip">{anulacoes.length} registos</span>
                                    </header>

                                    {anulacoes.length === 0 ? (
                                        <div className="relatorio-empty relatorio-empty-success">
                                            <CheckCircle2 size={30} />
                                            <strong>Nenhuma anulacao no periodo</strong>
                                            <span>Nao existem atendimentos nem pagamentos anulados no intervalo selecionado.</span>
                                        </div>
                                    ) : (
                                        <div className="relatorio-table-scroll">
                                            <table className="admin-table relatorio-table">
                                                <thead>
                                                    <tr>
                                                        <th>Data</th>
                                                        <th>Tipo</th>
                                                        <th>Referencia</th>
                                                        <th>Cliente</th>
                                                        <th>Valor</th>
                                                        <th>Motivo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {anulacoes.map((item) => (
                                                        <tr key={`${item.tipo}-${item.id}`}>
                                                            <td>{formatarDataHora(item.data_hora)}</td>
                                                            <td>
                                                                <span className={`relatorio-pill ${item.tipo === "pagamento" ? "warning" : "danger"}`}>
                                                                    {item.tipo}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {item.tipo === "atendimento"
                                                                    ? `Atendimento #${item.id}`
                                                                    : `Pagamento #${item.id}`}
                                                            </td>
                                                            <td>
                                                                {item.cliente_nome
                                                                    || (item.cliente_id ? `Atendimento #${item.cliente_id}` : "-")}
                                                            </td>
                                                            <td>{formatarMoeda(item.valor)}</td>
                                                            <td className="relatorio-motivo">{item.motivo || "Sem motivo registado"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </article>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default Relatorio;
