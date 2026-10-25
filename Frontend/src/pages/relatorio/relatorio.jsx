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
    Tag,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Printer,
    HandCoins,
    Landmark,
    PiggyBank,
    TriangleAlert,
    Banknote,
    CreditCard,
    Percent
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
    getRelatorioFinanceiro,
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

function formatarPercentual(valor) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
        return "Nao calculavel";
    }
    const numero = Number(valor);
    return `${numero > 0 ? "+" : ""}${numero.toFixed(1)}%`;
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
    const [mostrarSalarios, setMostrarSalarios] = useState(false);
    const [funcionarioExpandido, setFuncionarioExpandido] = useState(null);
    const [filtroFuncionario, setFiltroFuncionario] = useState("");
    const [filtroMetodo, setFiltroMetodo] = useState("");

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
                    resFinanceiro,
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
                    getRelatorioFinanceiro(params),
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
                    financeiro: resFinanceiro.data || {},
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

    function imprimirRelatorio() {
        const tituloOriginal = document.title;
        document.title = `Relatorio financeiro ${periodo.de || "inicio"}-${periodo.ate || "hoje"}`;
        window.print();
        document.title = tituloOriginal;
    }

    const resumo = dados?.resumo || {};
    const financeiro = dados?.financeiro || {};
    const resumoFinanceiro = financeiro.resumo || {};
    const comparacao = financeiro.comparacao || {};
    const receitasFinanceiro = financeiro.receitas || {};
    const despesasFinanceiro = financeiro.despesas || {};
    const fluxoFinanceiro = financeiro.fluxo || {};
    const salarios = financeiro.salarios || {};
    const salarioResumo = salarios.resumo || {};
    const salariosFuncionarios = Array.isArray(salarios.funcionarios) ? salarios.funcionarios : [];
    const dividas = financeiro.dividas || {};
    const dividasReceber = Array.isArray(dividas.a_receber) ? dividas.a_receber : [];
    const dividasPagar = Array.isArray(dividas.a_pagar) ? dividas.a_pagar : [];
    const receitasMetodo = Array.isArray(receitasFinanceiro.por_metodo) ? receitasFinanceiro.por_metodo : [];
    const despesasMetodo = Array.isArray(despesasFinanceiro.por_metodo) ? despesasFinanceiro.por_metodo : [];
    const despesasDetalhe = Array.isArray(despesasFinanceiro.detalhe) ? despesasFinanceiro.detalhe : [];

    const caixa = dados?.caixa || {};
    const sessoes = Array.isArray(caixa.sessoes) ? caixa.sessoes : [];
    const servicos = dados?.servicos || [];
    const funcionarios = dados?.funcionarios || [];
    const assiduidade = dados?.assiduidade || [];
    const clientes = dados?.clientes || [];
    const fidelizacao = dados?.fidelizacao || {};
    const anulacoes = dados?.anulacoes || [];
    const movimentos = useMemo(() => dados?.movimentos || [], [dados]);
    const despesas = useMemo(() => dados?.despesas || [], [dados]);

    const receita = Number(resumoFinanceiro.receitas_recebidas ?? resumo.receita) || 0;
    const receitaGerada = Number(resumoFinanceiro.receitas_geradas) || 0;
    const despesasTotal = Number(resumoFinanceiro.despesas ?? resumo.despesas) || 0;
    const resultado = Number(resumoFinanceiro.resultado ?? resumo.resultado) || 0;
    const margem = Number(resumoFinanceiro.margem) || (receita > 0 ? (resultado / receita) * 100 : 0);
    const valoresReceber = Number(resumoFinanceiro.valores_a_receber) || 0;
    const valoresPagar = Number(resumoFinanceiro.valores_a_pagar) || 0;
    const saldoInicial = Number(resumoFinanceiro.saldo_inicial ?? fluxoFinanceiro.saldo_inicial) || 0;
    const saldoFinal = Number(resumoFinanceiro.saldo_final ?? fluxoFinanceiro.saldo_final) || 0;
    const outrasReceitas = Number(receitasFinanceiro.outras) || 0;
    const descontosTotal = Number(receitasFinanceiro.descontos) || 0;
    const salarioFixo = Number(salarioResumo.salario_fixo) || 0;
    const comissoesEquipa = Number(salarioResumo.comissoes) || 0;
    const deducoesEquipa = Number(salarioResumo.deducoes) || 0;
    const totalAPagarEquipa = Number(salarioResumo.total_a_pagar) || 0;
    const totalPagoEquipa = Number(salarioResumo.total_pago) || 0;
    const saldoPendenteEquipa = Number(salarioResumo.saldo_pendente) || 0;
    const geradoPor = financeiro.gerado_por || "";
    const geradoEm = financeiro.gerado_em || "";
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
    const totalReceitaServicos = servicos.reduce((soma, servico) => soma + Number(servico.total || 0), 0);

    //filtros de equipa e metodo aplicam-se as listas sem obrigar a recarregar o relatorio
    const funcionariosFiltrados = funcionarios.filter((funcionario) => (
        !filtroFuncionario || String(funcionario.funcionario_id) === String(filtroFuncionario)
    ));
    const salariosFiltrados = salariosFuncionarios.filter((funcionario) => (
        !filtroFuncionario || String(funcionario.funcionario_id) === String(filtroFuncionario)
    ));
    const funcionariosVisiveis = funcionariosFiltrados.slice(0, 50);
    const maxFuncionario = Math.max(1, ...funcionariosFiltrados.map((funcionario) => Number(funcionario.total_servicos) || 0));
    const receitasFuncionario = salariosFiltrados.filter((funcionario) => Number(funcionario.receita) > 0);
    const receitasMetodoFiltradas = receitasMetodo.filter((metodo) => (
        !filtroMetodo || metodo.metodo === filtroMetodo
    ));
    const despesasDetalheFiltradas = despesasDetalhe.filter((despesa) => (
        !filtroMetodo || despesa.metodo_pagamento === filtroMetodo
    ));
    const despesasPorCategoria = Array.isArray(despesasFinanceiro.por_categoria)
        ? despesasFinanceiro.por_categoria
        : [];
    const despesasPorMetodo = despesasMetodo.filter((metodo) => (
        !filtroMetodo || metodo.metodo === filtroMetodo
    ));
    const maxReceitaMetodo = Math.max(1, ...receitasMetodoFiltradas.map((metodo) => Number(metodo.total) || 0));
    const maxDespesaCategoria = Math.max(1, ...despesasPorCategoria.map((categoria) => Number(categoria.total) || 0));
    const maxDespesaMetodo = Math.max(1, ...despesasPorMetodo.map((metodo) => Number(metodo.total) || 0));
    const despesasMedia = despesas.length > 0 ? despesasTotal / despesas.length : 0;
    const despesasMaiorCategoria = despesasPorCategoria[0] || null;
    const clientesComAtendimentos = clientes.filter((cliente) => Number(cliente.atendimentos) > 0);
    const clientesVisiveis = clientesComAtendimentos.slice(0, 12);
    const funcionariosDestaque = funcionariosFiltrados
        .filter((funcionario) => Number(funcionario.total_servicos) > 0)
        .slice(0, 3);
    const funcionarioSalarioExpandido = salariosFuncionarios.find((funcionario) => (
        String(funcionario.funcionario_id) === String(funcionarioExpandido)
    )) || null;
    const salariosPendentes = salariosFiltrados.filter((funcionario) => Number(funcionario.saldo_pendente) > 0);

    const opcoesFuncionarios = [...new Map(
        [...salariosFuncionarios, ...funcionarios].map((funcionario) => [
            String(funcionario.funcionario_id),
            { id: String(funcionario.funcionario_id), nome: funcionario.funcionario_nome }
        ])
    ).values()].sort((a, b) => a.nome.localeCompare(b.nome));

    const opcoesMetodos = [...new Set([
        ...receitasMetodo.map((metodo) => metodo.metodo),
        ...despesasMetodo.map((metodo) => metodo.metodo)
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const marcas = Number(fidelizacao.marcas) || 0;
    const beneficiosGanhos = Number(fidelizacao.beneficios_ganhos) || 0;
    const beneficiosUtilizados = Number(fidelizacao.beneficios_utilizados) || 0;
    const taxaBeneficios = beneficiosGanhos > 0 ? (beneficiosUtilizados / beneficiosGanhos) * 100 : 0;

    const totalAnulacoes = anulacoes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
    const atendimentosAnulados = anulacoes.filter((item) => item.tipo === "atendimento").length;
    const pagamentosAnulados = anulacoes.filter((item) => item.tipo === "pagamento").length;

    const rotuloPeriodo = periodo.de || periodo.ate
        ? `${periodo.de ? formatarDataCurta(periodo.de) : "Inicio"} — ${periodo.ate ? formatarDataCurta(periodo.ate) : "Hoje"}`
        : "Todo o periodo";

    const tabs = [
        { id: "resumo", label: "Resumo", Icone: ChartNoAxesCombinedIcon },
        { id: "receitas", label: "Receitas", Icone: TrendingUp, badge: receitasMetodo.length },
        { id: "despesas", label: "Despesas", Icone: Receipt, badge: despesas.length },
        { id: "caixa", label: "Fluxo de caixa", Icone: Wallet, badge: movimentos.length },
        { id: "equipa", label: "Equipa", Icone: Users, badge: funcionarios.length },
        { id: "dividas", label: "Dividas", Icone: HandCoins, badge: dividasReceber.length + dividasPagar.length },
        { id: "clientes", label: "Clientes", Icone: UserRound, badge: clientesComAtendimentos.length },
        { id: "anulacoes", label: "Anulacoes", Icone: Ban, badge: anulacoes.length }
    ];

    function exportarCsv() {
        const linhas = [];
        const adicionar = (...campos) => linhas.push(campos);
        const escapar = (valor) => {
            let texto = String(valor ?? "");
            //evita que texto livre seja interpretado como formula ao abrir no Excel
            if (typeof valor === "string" && /^[=+\-@]/.test(texto)) {
                texto = `'${texto}`;
            }
            return `"${texto.replace(/"/g, '""')}"`;
        };

        adicionar("Relatorio financeiro - Salao Faces");
        adicionar("Periodo", rotuloPeriodo);
        adicionar("Gerado por", geradoPor || "-", "em", formatarDataHora(geradoEm));
        adicionar();
        adicionar("RESUMO FINANCEIRO");
        adicionar("Indicador", "Valor");
        adicionar("Receitas recebidas", receita);
        adicionar("Receitas geradas", receitaGerada);
        adicionar("Despesas pagas", despesasTotal);
        adicionar("Resultado operacional", resultado);
        adicionar("Saldo inicial de caixa", saldoInicial);
        adicionar("Saldo final de caixa", saldoFinal);
        adicionar("Valores a receber", valoresReceber);
        adicionar("Valores a pagar a equipa", valoresPagar);
        adicionar("Salario fixo da equipa", salarioFixo);
        adicionar("Comissoes acumuladas", comissoesEquipa);
        adicionar("Descontos concedidos", descontosTotal);
        adicionar("Outras receitas", outrasReceitas);
        adicionar();
        adicionar("COMPARACAO COM PERIODO ANTERIOR");
        if (comparacao.disponivel) {
            adicionar("Indicador", "Periodo atual", "Periodo anterior", "Variacao");
            adicionar("Receitas", comparacao.atual.receitas, comparacao.anterior.receitas, formatarPercentual(comparacao.variacao.receitas));
            adicionar("Despesas", comparacao.atual.despesas, comparacao.anterior.despesas, formatarPercentual(comparacao.variacao.despesas));
            adicionar("Resultado", comparacao.atual.resultado, comparacao.anterior.resultado, formatarPercentual(comparacao.variacao.resultado));
        } else {
            adicionar("Sem periodo anterior para comparar");
        }
        adicionar();
        adicionar("RECEITAS POR METODO");
        adicionar("Metodo", "Quantidade", "Total");
        receitasMetodo.forEach((metodo) => adicionar(metodo.metodo, metodo.quantidade, metodo.total));
        adicionar();
        adicionar("RECEITAS POR SERVICO");
        adicionar("Servico", "Quantidade", "Valor bruto", "Descontos", "Receita liquida", "Comissoes");
        servicos.forEach((servico) => adicionar(
            servico.servico_nome,
            servico.quantidade,
            servico.valor_bruto ?? servico.total,
            servico.descontos,
            servico.total,
            servico.comissoes
        ));
        adicionar();
        adicionar("DESPESAS POR CATEGORIA");
        adicionar("Categoria", "Quantidade", "Total");
        despesasPorCategoria.forEach((categoria) => adicionar(categoria.categoria, categoria.quantidade, categoria.total));
        adicionar();
        adicionar("DETALHE DE DESPESAS");
        adicionar("Data", "Categoria", "Descricao", "Metodo", "Responsavel", "Valor");
        despesasDetalhe.forEach((despesa) => adicionar(
            despesa.data_compra,
            despesa.categoria,
            despesa.descricao,
            despesa.metodo_pagamento,
            despesa.responsavel,
            despesa.valor_total
        ));
        adicionar();
        adicionar("FLUXO DE CAIXA");
        adicionar("Saldo inicial", saldoInicial);
        adicionar("Entradas", fluxoFinanceiro.entradas || 0);
        adicionar("Saidas", fluxoFinanceiro.saidas || 0);
        adicionar("Levantamentos", fluxoFinanceiro.levantamentos || 0);
        adicionar("Saldo final", saldoFinal);
        adicionar();
        adicionar("FECHOS DE CAIXA");
        adicionar("Abertura", "Fecho", "Saldo inicial", "Esperado", "Contado", "Diferenca", "Fechado por");
        sessoes.forEach((sessao) => adicionar(
            formatarDataHora(sessao.data_abertura),
            formatarDataHora(sessao.data_fecho),
            sessao.saldo_inicial,
            sessao.valor_esperado,
            sessao.valor_contado,
            sessao.diferenca,
            sessao.fechado_por_nome
        ));
        adicionar();
        adicionar("SALARIOS E COMISSOES");
        adicionar("Funcionario", "Salario fixo", "Comissoes", "Deducoes", "Total a pagar", "Total pago", "Saldo pendente");
        salariosFuncionarios.forEach((funcionario) => adicionar(
            funcionario.funcionario_nome,
            funcionario.salario_fixo,
            funcionario.comissoes,
            funcionario.deducoes,
            funcionario.total_a_pagar,
            funcionario.total_pago,
            funcionario.saldo_pendente
        ));
        adicionar();
        adicionar("VALORES A RECEBER");
        adicionar("Cliente", "Data", "Servicos", "Valor original", "Pago", "Pendente", "Dias em atraso");
        dividasReceber.forEach((divida) => adicionar(
            divida.cliente_nome,
            formatarDataHora(divida.data_hora),
            divida.servicos,
            divida.valor_total,
            divida.pago,
            divida.pendente,
            divida.dias_atraso
        ));
        adicionar();
        adicionar("VALORES A PAGAR");
        adicionar("Beneficiario", "Periodo inicio", "Periodo fim", "Valor", "Estado");
        dividasPagar.forEach((divida) => adicionar(
            divida.beneficiario,
            divida.periodo_inicio,
            divida.periodo_fim,
            divida.valor,
            divida.estado
        ));

        const csv = linhas.map((linha) => linha.map(escapar).join(";")).join("\r\n");
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio-financeiro-${periodo.de || "inicio"}-${periodo.ate || "hoje"}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

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
                <div className="relatorio-print-only">
                    <h1>Relatorio financeiro</h1>
                    <p>{rotuloPeriodo}</p>
                    <p>Gerado por {geradoPor || "-"} em {formatarDataHora(geradoEm)}.</p>
                </div>

                <header className="admin-page-header">
                    <div className="admin-page-header-inner">
                        <div>
                            <h1 className="admin-page-title">Relatorio financeiro</h1>
                            <p className="admin-page-subtitle">
                                Receitas, despesas, caixa, dividas e o que a equipa tem a receber no periodo.
                            </p>
                        </div>
                        <div className="admin-page-actions relatorio-acoes">
                            <span className="relatorio-periodo-badge">
                                <CalendarDays size={15} />
                                {rotuloPeriodo}
                            </span>
                            <button type="button" className="admin-btn secondary" onClick={exportarCsv} disabled={!dados}>
                                <Download size={16} />
                                Exportar Excel (CSV)
                            </button>
                            <button type="button" className="admin-btn secondary" onClick={imprimirRelatorio} disabled={!dados}>
                                <Printer size={16} />
                                Imprimir / PDF
                            </button>
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

                    <div className="relatorio-filtros">
                        <label>
                            <span>Funcionario</span>
                            <select value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}>
                                <option value="">Todos os funcionarios</option>
                                {opcoesFuncionarios.map((funcionario) => (
                                    <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Metodo de pagamento</span>
                            <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
                                <option value="">Todos os metodos</option>
                                {opcoesMetodos.map((metodo) => (
                                    <option key={metodo} value={metodo}>{metodo}</option>
                                ))}
                            </select>
                        </label>
                        {(filtroFuncionario || filtroMetodo) && (
                            <button
                                type="button"
                                className="relatorio-filtro-limpar"
                                onClick={() => {
                                    setFiltroFuncionario("");
                                    setFiltroMetodo("");
                                }}
                            >
                                Limpar filtros
                            </button>
                        )}
                        <p className="relatorio-filtros-nota">
                            Os filtros aplicam-se as listas detalhadas de equipa, receitas e despesas. Os totais do
                            periodo continuam a ser globais.
                        </p>
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
                                    <span className="relatorio-kpi-label">Receitas recebidas</span>
                                    <strong>{formatarMoeda(receita)}</strong>
                                    <small>{formatarNumero(totalServicos)} servicos - geradas {formatarMoeda(receitaGerada)}</small>
                                </div>
                            </article>

                            <article className="relatorio-kpi despesa">
                                <span className="relatorio-kpi-icon"><Receipt size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Despesas pagas</span>
                                    <strong>{formatarMoeda(despesasTotal)}</strong>
                                    <small>{formatarNumero(despesas.length)} despesas ativas</small>
                                </div>
                            </article>

                            <article className={`relatorio-kpi resultado ${resultado < 0 ? "negativo" : ""}`}>
                                <span className="relatorio-kpi-icon"><Wallet size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Resultado operacional</span>
                                    <strong>{formatarMoeda(resultado)}</strong>
                                    <small>{resultado < 0 ? "Prejuizo no periodo" : "Lucro no periodo"} - margem {margem.toFixed(1)}%</small>
                                </div>
                            </article>

                            <article className="relatorio-kpi margem">
                                <span className="relatorio-kpi-icon"><Landmark size={20} /></span>
                                <div>
                                    <span className="relatorio-kpi-label">Saldo de caixa</span>
                                    <strong>{formatarMoeda(saldoFinal)}</strong>
                                    <small>Saldo inicial {formatarMoeda(saldoInicial)}</small>
                                </div>
                            </article>
                        </section>

                        <section className="relatorio-financeiro-resumo">
                            <article className="relatorio-stat-mini success">
                                <span><HandCoins size={18} /> Valores a receber</span>
                                <strong>{formatarMoeda(valoresReceber)}</strong>
                            </article>
                            <article className="relatorio-stat-mini danger">
                                <span><PiggyBank size={18} /> A pagar a equipa</span>
                                <strong>{formatarMoeda(valoresPagar)}</strong>
                            </article>
                            <article className="relatorio-stat-mini warning">
                                <span><Banknote size={18} /> Salario fixo</span>
                                <strong>{formatarMoeda(salarioFixo)}</strong>
                            </article>
                            <article className="relatorio-stat-mini primary">
                                <span><Percent size={18} /> Comissoes acumuladas</span>
                                <strong>{formatarMoeda(comissoesEquipa)}</strong>
                            </article>
                            <article className="relatorio-stat-mini neutral">
                                <span><CreditCard size={18} /> Saldo pendente equipa</span>
                                <strong>{formatarMoeda(saldoPendenteEquipa)}</strong>
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
                                            <h2>Comparacao com o periodo anterior</h2>
                                            <p>
                                                {comparacao.disponivel
                                                    ? `${formatarDataCurta(comparacao.periodo.de)} a ${formatarDataCurta(comparacao.periodo.ate)}`
                                                    : "Defina um intervalo de datas para comparar com o periodo anterior."}
                                            </p>
                                        </div>
                                        <span className="relatorio-card-chip">
                                            {comparacao.disponivel ? `${comparacao.periodo.dias} dias` : "Sem comparacao"}
                                        </span>
                                    </header>

                                    {comparacao.disponivel ? (
                                        <div className="relatorio-comparacao-grid">
                                            {[
                                                {
                                                    chave: "receitas",
                                                    label: "Receitas",
                                                    atual: comparacao.atual.receitas,
                                                    anterior: comparacao.anterior.receitas,
                                                    variacao: comparacao.variacao.receitas
                                                },
                                                {
                                                    chave: "despesas",
                                                    label: "Despesas",
                                                    atual: comparacao.atual.despesas,
                                                    anterior: comparacao.anterior.despesas,
                                                    variacao: comparacao.variacao.despesas
                                                },
                                                {
                                                    chave: "resultado",
                                                    label: "Resultado",
                                                    atual: comparacao.atual.resultado,
                                                    anterior: comparacao.anterior.resultado,
                                                    variacao: comparacao.variacao.resultado
                                                }
                                            ].map((item) => {
                                                const semBase = item.variacao === null || item.variacao === undefined;
                                                const positiva = !semBase && Number(item.variacao) >= 0;
                                                return (
                                                    <div className={`relatorio-comparacao-item ${item.chave}`} key={item.chave}>
                                                        <span>{item.label}</span>
                                                        <strong>{formatarMoeda(item.atual)}</strong>
                                                        <small>Periodo anterior: {formatarMoeda(item.anterior)}</small>
                                                        <span className={`relatorio-variacao ${semBase ? "neutral" : positiva ? "success" : "danger"}`}>
                                                            {semBase ? "Nao calculavel" : (
                                                                <>
                                                                    {positiva ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                                    {formatarPercentual(item.variacao)}
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Vazio
                                            titulo="Comparacao indisponivel"
                                            texto="Escolha um periodo com data inicial e final para ver a variacao face ao periodo anterior."
                                        />
                                    )}
                                </article>

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

                        {tabAtiva === "receitas" && (
                            <>
                                <section className="relatorio-caixa-resumo">
                                    <article className="relatorio-stat-mini success">
                                        <span><TrendingUp size={18} /> Receitas recebidas</span>
                                        <strong>{formatarMoeda(receita)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><Receipt size={18} /> Receitas geradas</span>
                                        <strong>{formatarMoeda(receitaGerada)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><HandCoins size={18} /> Por receber</span>
                                        <strong>{formatarMoeda(valoresReceber)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini danger">
                                        <span><Tag size={18} /> Descontos</span>
                                        <strong>{formatarMoeda(descontosTotal)}</strong>
                                    </article>
                                </section>

                                <div className="relatorio-grid-2">
                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Receitas por metodo de pagamento</h2>
                                                <p>Dinheiro efetivamente recebido no periodo</p>
                                            </div>
                                            <CreditCard size={17} className="relatorio-card-mark" />
                                        </header>

                                        {receitasMetodoFiltradas.length === 0 ? (
                                            <Vazio
                                                titulo="Sem pagamentos no periodo"
                                                texto="Os pagamentos recebidos por metodo aparecem aqui."
                                            />
                                        ) : (
                                            <div className="relatorio-breakdown-list">
                                                {receitasMetodoFiltradas.map((metodo) => (
                                                    <div className="relatorio-breakdown-row" key={metodo.metodo}>
                                                        <div className="relatorio-breakdown-line">
                                                            <span>{metodo.metodo}</span>
                                                            <strong>{formatarMoeda(metodo.total)}</strong>
                                                        </div>
                                                        <div className="relatorio-breakdown-bar">
                                                            <span style={{ width: `${Math.max((Number(metodo.total) / maxReceitaMetodo) * 100, 3)}%` }} />
                                                        </div>
                                                        <small>{formatarNumero(metodo.quantidade)} pagamentos</small>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>

                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Receita por funcionario</h2>
                                                <p>Quem gerou dinheiro para o salao</p>
                                            </div>
                                            <Users size={17} className="relatorio-card-mark" />
                                        </header>

                                        {receitasFuncionario.length === 0 ? (
                                            <Vazio
                                                titulo="Sem receita atribuida"
                                                texto="Os servicos concluidos por funcionario aparecem aqui."
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
                                                            <th>A pagar</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {receitasFuncionario.map((funcionario) => (
                                                            <tr key={funcionario.funcionario_id}>
                                                                <td>
                                                                    <div className="relatorio-person">
                                                                        <span className="relatorio-avatar">
                                                                            {iniciais(funcionario.funcionario_nome)}
                                                                        </span>
                                                                        <strong>{funcionario.funcionario_nome}</strong>
                                                                    </div>
                                                                </td>
                                                                <td>{formatarNumero(funcionario.servicos)}</td>
                                                                <td>{formatarMoeda(funcionario.receita)}</td>
                                                                <td>{formatarMoeda(funcionario.comissoes)}</td>
                                                                <td>{formatarMoeda(funcionario.total_a_pagar)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </article>

                                    <article className="relatorio-card relatorio-card-span2">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Desempenho financeiro por servico</h2>
                                                <p>Quantidade, preco medio, descontos e comissoes associadas</p>
                                            </div>
                                            <Scissors size={17} className="relatorio-card-mark" />
                                        </header>

                                        {servicos.length === 0 ? (
                                            <Vazio
                                                titulo="Sem servicos no periodo"
                                                texto="A receita por tipo de servico aparece quando existirem atendimentos concluidos."
                                            />
                                        ) : (
                                            <div className="relatorio-table-scroll">
                                                <table className="admin-table relatorio-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Servico</th>
                                                            <th>Qtd.</th>
                                                            <th>Preco medio</th>
                                                            <th>Valor bruto</th>
                                                            <th>Descontos</th>
                                                            <th>Receita liquida</th>
                                                            <th>Comissoes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {servicos.map((servico) => {
                                                            const quantidade = Number(servico.quantidade) || 0;
                                                            const total = Number(servico.total) || 0;
                                                            return (
                                                                <tr key={servico.servico_id}>
                                                                    <td>{servico.servico_nome}</td>
                                                                    <td>{formatarNumero(quantidade)}</td>
                                                                    <td>{formatarMoeda(quantidade > 0 ? total / quantidade : 0)}</td>
                                                                    <td>{formatarMoeda(servico.valor_bruto ?? total)}</td>
                                                                    <td>{formatarMoeda(servico.descontos)}</td>
                                                                    <td>{formatarMoeda(total)}</td>
                                                                    <td>{formatarMoeda(servico.comissoes)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <p className="relatorio-footnote">
                                            Receita gerada: {formatarMoeda(totalReceitaServicos)}. Uma receita alta nao significa
                                            necessariamente maior lucro: os produtos, o tempo e as comissoes tambem contam.
                                        </p>
                                    </article>

                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Outras receitas e ajustes</h2>
                                                <p>Entradas que nao vem diretamente dos servicos</p>
                                            </div>
                                            <CircleDollarSign size={17} className="relatorio-card-mark" />
                                        </header>

                                        <div className="relatorio-client-stats">
                                            <div>
                                                <span>Outras receitas</span>
                                                <strong>{formatarMoeda(outrasReceitas)}</strong>
                                            </div>
                                            <div>
                                                <span>Descontos concedidos</span>
                                                <strong>{formatarMoeda(descontosTotal)}</strong>
                                            </div>
                                            <div>
                                                <span>Total anulado</span>
                                                <strong>{formatarMoeda(totalAnulacoes)}</strong>
                                            </div>
                                            <div>
                                                <span>Receita gerada</span>
                                                <strong>{formatarMoeda(receitaGerada)}</strong>
                                            </div>
                                        </div>
                                    </article>

                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Pagamentos pendentes</h2>
                                                <p>Clientes que ainda devem ao salao</p>
                                            </div>
                                            <HandCoins size={17} className="relatorio-card-mark" />
                                        </header>

                                        {dividasReceber.length === 0 ? (
                                            <Vazio
                                                titulo="Nenhum valor em divida"
                                                texto="Todos os atendimentos do periodo estao liquidados."
                                            />
                                        ) : (
                                            <div className="relatorio-table-scroll">
                                                <table className="admin-table relatorio-table relatorio-table-compact">
                                                    <thead>
                                                        <tr>
                                                            <th>Cliente</th>
                                                            <th>Data</th>
                                                            <th>Em falta</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dividasReceber.slice(0, 8).map((divida) => (
                                                            <tr key={divida.id}>
                                                                <td>{divida.cliente_nome}</td>
                                                                <td>{formatarDataCurta(divida.data_hora)}</td>
                                                                <td>{formatarMoeda(divida.pendente)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </article>
                                </div>
                            </>
                        )}

                        {tabAtiva === "despesas" && (
                            <>
                                <section className="relatorio-caixa-resumo">
                                    <article className="relatorio-stat-mini danger">
                                        <span><Receipt size={18} /> Total de despesas</span>
                                        <strong>{formatarMoeda(despesasTotal)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><Tag size={18} /> Lancamentos</span>
                                        <strong>{formatarNumero(despesas.length)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><Percent size={18} /> Despesa media</span>
                                        <strong>{formatarMoeda(despesasMedia)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini neutral">
                                        <span><TrendingUp size={18} /> Maior categoria</span>
                                        <strong>{despesasMaiorCategoria ? formatarMoeda(despesasMaiorCategoria.total) : formatarMoeda(0)}</strong>
                                    </article>
                                </section>

                                <div className="relatorio-grid-2">
                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Despesas por categoria</h2>
                                                <p>Onde o dinheiro do salao esta a ser gasto</p>
                                            </div>
                                            <Tag size={17} className="relatorio-card-mark" />
                                        </header>

                                        {despesasPorCategoria.length === 0 ? (
                                            <Vazio
                                                titulo="Sem despesas no periodo"
                                                texto="As categorias com gastos aparecem aqui."
                                            />
                                        ) : (
                                            <div className="relatorio-breakdown-list">
                                                {despesasPorCategoria.map((categoria) => (
                                                    <div className="relatorio-breakdown-row" key={categoria.categoria}>
                                                        <div className="relatorio-breakdown-line">
                                                            <span>{categoria.categoria}</span>
                                                            <strong>{formatarMoeda(categoria.total)}</strong>
                                                        </div>
                                                        <div className="relatorio-breakdown-bar despesa">
                                                            <span style={{ width: `${Math.max((Number(categoria.total) / maxDespesaCategoria) * 100, 3)}%` }} />
                                                        </div>
                                                        <small>{formatarNumero(categoria.quantidade)} lancamentos</small>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>

                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Despesas por metodo de pagamento</h2>
                                                <p>Como os gastos foram liquidados</p>
                                            </div>
                                            <CreditCard size={17} className="relatorio-card-mark" />
                                        </header>

                                        {despesasPorMetodo.length === 0 ? (
                                            <Vazio
                                                titulo="Sem metodos registados"
                                                texto="Os metodos usados nas despesas aparecem aqui."
                                            />
                                        ) : (
                                            <div className="relatorio-breakdown-list">
                                                {despesasPorMetodo.map((metodo) => (
                                                    <div className="relatorio-breakdown-row" key={metodo.metodo}>
                                                        <div className="relatorio-breakdown-line">
                                                            <span>{metodo.metodo}</span>
                                                            <strong>{formatarMoeda(metodo.total)}</strong>
                                                        </div>
                                                        <div className="relatorio-breakdown-bar despesa">
                                                            <span style={{ width: `${Math.max((Number(metodo.total) / maxDespesaMetodo) * 100, 3)}%` }} />
                                                        </div>
                                                        <small>{formatarNumero(metodo.quantidade)} despesas</small>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>

                                    <article className="relatorio-card relatorio-card-span2">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Detalhe das despesas</h2>
                                                <p>Data, categoria, descricao, metodo e responsavel pelo registo</p>
                                            </div>
                                            <span className="relatorio-card-chip">
                                                {despesasDetalheFiltradas.length} registos
                                            </span>
                                        </header>

                                        {despesasDetalheFiltradas.length === 0 ? (
                                            <Vazio
                                                titulo="Sem despesas para mostrar"
                                                texto="Ajuste os filtros ou escolha outro periodo."
                                            />
                                        ) : (
                                            <div className="relatorio-table-scroll relatorio-table-scroll-tall">
                                                <table className="admin-table relatorio-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Data</th>
                                                            <th>Categoria</th>
                                                            <th>Descricao</th>
                                                            <th>Metodo</th>
                                                            <th>Responsavel</th>
                                                            <th>Valor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {despesasDetalheFiltradas.map((despesa) => (
                                                            <tr key={despesa.id}>
                                                                <td>{formatarDataCurta(despesa.data_compra)}</td>
                                                                <td>{despesa.categoria}</td>
                                                                <td>{despesa.descricao}</td>
                                                                <td>{despesa.metodo_pagamento}</td>
                                                                <td>{despesa.responsavel}</td>
                                                                <td>{formatarMoeda(despesa.valor_total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </article>
                                </div>
                            </>
                        )}

                        {tabAtiva === "dividas" && (
                            <>
                                <section className="relatorio-caixa-resumo">
                                    <article className="relatorio-stat-mini success">
                                        <span><HandCoins size={18} /> A receber</span>
                                        <strong>{formatarMoeda(dividas.resumo?.a_receber ?? valoresReceber)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><TriangleAlert size={18} /> Vencido ha mais de 30 dias</span>
                                        <strong>{formatarMoeda(dividas.resumo?.vencido)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini danger">
                                        <span><PiggyBank size={18} /> A pagar a equipa</span>
                                        <strong>{formatarMoeda(valoresPagar)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><Receipt size={18} /> Processamentos pendentes</span>
                                        <strong>{formatarNumero(dividas.resumo?.processamentos_pendentes)}</strong>
                                    </article>
                                </section>

                                <div className="relatorio-grid-2">
                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Valores a receber</h2>
                                                <p>Clientes com pagamentos em divida (todos os periodos)</p>
                                            </div>
                                            <HandCoins size={17} className="relatorio-card-mark" />
                                        </header>

                                        {dividasReceber.length === 0 ? (
                                            <Vazio
                                                titulo="Nenhum valor a receber"
                                                texto="Nao existem atendimentos com saldo pendente."
                                            />
                                        ) : (
                                            <div className="relatorio-table-scroll relatorio-table-scroll-tall">
                                                <table className="admin-table relatorio-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Cliente</th>
                                                            <th>Data</th>
                                                            <th>Servicos</th>
                                                            <th>Original</th>
                                                            <th>Pago</th>
                                                            <th>Pendente</th>
                                                            <th>Atraso</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dividasReceber.map((divida) => (
                                                            <tr key={divida.id}>
                                                                <td>
                                                                    <div className="relatorio-person">
                                                                        <span className="relatorio-avatar">{iniciais(divida.cliente_nome)}</span>
                                                                        <div>
                                                                            <strong>{divida.cliente_nome}</strong>
                                                                            <small>{divida.telefone || "Sem telefone"}</small>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>{formatarDataCurta(divida.data_hora)}</td>
                                                                <td>{divida.servicos || "-"}</td>
                                                                <td>{formatarMoeda(divida.valor_total)}</td>
                                                                <td>{formatarMoeda(divida.pago)}</td>
                                                                <td>{formatarMoeda(divida.pendente)}</td>
                                                                <td>
                                                                    <span className={`relatorio-pill ${Number(divida.dias_atraso) > 30 ? "danger" : "warning"}`}>
                                                                        {formatarNumero(divida.dias_atraso)} dias
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </article>

                                    <article className="relatorio-card">
                                        <header className="relatorio-card-header">
                                            <div>
                                                <h2>Valores a pagar</h2>
                                                <p>Salarios e comissoes ainda nao liquidados</p>
                                            </div>
                                            <PiggyBank size={17} className="relatorio-card-mark" />
                                        </header>

                                        {salariosPendentes.length === 0 ? (
                                            <div className="relatorio-empty relatorio-empty-success">
                                                <CheckCircle2 size={28} />
                                                <strong>Nenhum salario pendente</strong>
                                                <span>Os salarios e comissoes do periodo estao liquidados.</span>
                                            </div>
                                        ) : (
                                            <div className="relatorio-table-scroll relatorio-table-scroll-tall">
                                                <table className="admin-table relatorio-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Beneficiario</th>
                                                            <th>Referencia</th>
                                                            <th>Total a pagar</th>
                                                            <th>Pago</th>
                                                            <th>Pendente</th>
                                                            <th>Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {salariosPendentes.map((funcionario) => {
                                                            const processamentoAtual = funcionario.processamentos?.[0];
                                                            const estado = processamentoAtual?.estado || "Por processar";
                                                            return (
                                                                <tr key={funcionario.funcionario_id}>
                                                                    <td>{funcionario.funcionario_nome}</td>
                                                                    <td>
                                                                        {formatarDataCurta(salarioResumo.referencia_inicio)} —{" "}
                                                                        {formatarDataCurta(salarioResumo.referencia_fim)}
                                                                    </td>
                                                                    <td>{formatarMoeda(funcionario.total_a_pagar)}</td>
                                                                    <td>{formatarMoeda(funcionario.total_pago)}</td>
                                                                    <td>
                                                                        <span className="relatorio-pill warning">
                                                                            {formatarMoeda(funcionario.saldo_pendente)}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`relatorio-pill ${estado === "Pago" ? "success" : estado === "Aprovado" ? "warning" : "neutral"}`}>
                                                                            {estado}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <p className="relatorio-note">
                                            As comissoes elegiveis ainda nao processadas entram no total a pagar da equipa.
                                            O modulo de despesas nao tem estado de pagamento, por isso os gastos registados sao
                                            tratados como pagos no fluxo de caixa.
                                        </p>
                                    </article>
                                </div>
                            </>
                        )}

                        {tabAtiva === "equipa" && (
                            <div className="relatorio-grid-2">
                                <article className="relatorio-card relatorio-card-span2 relatorio-payroll-card">
                                    <header className="relatorio-card-header">
                                        <div>
                                            <h2>Salarios e comissoes da equipa</h2>
                                            <p>Quanto o salao tem a pagar, separando salario fixo, comissoes e deducoes</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="relatorio-payroll-toggle"
                                            aria-expanded={mostrarSalarios}
                                            onClick={() => setMostrarSalarios((valor) => !valor)}
                                        >
                                            <span>{mostrarSalarios ? "Ocultar resumo salarial" : "Ver resumo salarial"}</span>
                                            {mostrarSalarios ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </header>

                                    <div className="relatorio-payroll-highlight">
                                        <div>
                                            <span>Total a pagar a equipa</span>
                                            <strong>{formatarMoeda(totalAPagarEquipa)}</strong>
                                            <small>Salario fixo + comissoes acumuladas - deducoes</small>
                                        </div>
                                        <div className="relatorio-payroll-highlight-meta">
                                            <span><Banknote size={14} /> Fixo {formatarMoeda(salarioFixo)}</span>
                                            <span><Percent size={14} /> Comissoes {formatarMoeda(comissoesEquipa)}</span>
                                            <span><CheckCircle2 size={14} /> Pago {formatarMoeda(totalPagoEquipa)}</span>
                                        </div>
                                    </div>

                                    {mostrarSalarios && (
                                        <div className="relatorio-payroll-dropdown">
                                            <div className="relatorio-payroll-summary">
                                                {[
                                                    { label: "Salario fixo", valor: salarioFixo, nota: `${salarioResumo.dias_referencia || 0} dia(s) em ${salarioResumo.meses_referencia || 1} mes(es)` },
                                                    { label: "Comissoes acumuladas", valor: comissoesEquipa, nota: `${formatarMoeda(salarioResumo.comissoes_pendentes)} pendentes` },
                                                    { label: "Deducoes", valor: deducoesEquipa, nota: "adiantamentos e ajustes" },
                                                    { label: "Total a pagar", valor: totalAPagarEquipa, nota: "valor liquido devido" },
                                                    { label: "Total pago", valor: totalPagoEquipa, nota: "processamentos liquidados" },
                                                    { label: "Saldo pendente", valor: saldoPendenteEquipa, nota: "ainda por pagar" }
                                                ].map((item) => (
                                                    <div className="relatorio-payroll-summary-item" key={item.label}>
                                                        <span>{item.label}</span>
                                                        <strong>{formatarMoeda(item.valor)}</strong>
                                                        <small>{item.nota}</small>
                                                    </div>
                                                ))}
                                            </div>

                                            <p className="relatorio-note">
                                                Referencia do salario fixo: {formatarDataCurta(salarioResumo.referencia_inicio)} a{" "}
                                                {formatarDataCurta(salarioResumo.referencia_fim)}. O salario fixo e mensal e proporcional
                                                aos {salarioResumo.dias_referencia || 0} dia(s) do periodo dentro de{" "}
                                                {salarioResumo.meses_referencia || 1} mes(es) de referencia.
                                            </p>

                                            {salariosFiltrados.length === 0 ? (
                                                <Vazio
                                                    titulo="Sem funcionarios para mostrar"
                                                    texto="Ajuste o filtro de funcionario para consultar os salarios."
                                                />
                                            ) : (
                                                <div className="relatorio-table-scroll">
                                                    <table className="admin-table relatorio-table relatorio-payroll-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Funcionario</th>
                                                                <th>Salario fixo</th>
                                                                <th>Comissoes</th>
                                                                <th>Deducoes</th>
                                                                <th>Total a pagar</th>
                                                                <th>Pago</th>
                                                                <th>Pendente</th>
                                                                <th />
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {salariosFiltrados.map((funcionario) => (
                                                                <tr key={funcionario.funcionario_id}>
                                                                    <td>
                                                                        <div className="relatorio-person">
                                                                            <span className="relatorio-avatar">
                                                                                {iniciais(funcionario.funcionario_nome)}
                                                                            </span>
                                                                            <div>
                                                                                <strong>{funcionario.funcionario_nome}</strong>
                                                                                <small>
                                                                                    {funcionario.cargo || "Equipa"}
                                                                                    {funcionario.estado !== "Ativo" ? " - Inativo" : ""}
                                                                                </small>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>{formatarMoeda(funcionario.salario_fixo)}</td>
                                                                    <td>{formatarMoeda(funcionario.comissoes)}</td>
                                                                    <td>{formatarMoeda(funcionario.deducoes)}</td>
                                                                    <td><strong>{formatarMoeda(funcionario.total_a_pagar)}</strong></td>
                                                                    <td>{formatarMoeda(funcionario.total_pago)}</td>
                                                                    <td>
                                                                        <span className={`relatorio-pill ${Number(funcionario.saldo_pendente) > 0 ? "warning" : "success"}`}>
                                                                            {formatarMoeda(funcionario.saldo_pendente)}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="relatorio-payroll-detail-toggle"
                                                                            onClick={() => setFuncionarioExpandido((atual) => (
                                                                                String(atual) === String(funcionario.funcionario_id)
                                                                                    ? null
                                                                                    : funcionario.funcionario_id
                                                                            ))}
                                                                        >
                                                                            {String(funcionarioExpandido) === String(funcionario.funcionario_id)
                                                                                ? <ChevronUp size={15} />
                                                                                : <ChevronDown size={15} />}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {funcionarioSalarioExpandido && (
                                                <div className="relatorio-payroll-detail">
                                                    <div className="relatorio-payroll-detail-head">
                                                        <div>
                                                            <strong>{funcionarioSalarioExpandido.funcionario_nome}</strong>
                                                            <small>Processamentos salariais no periodo</small>
                                                        </div>
                                                        <button type="button" onClick={() => setFuncionarioExpandido(null)}>
                                                            <ChevronUp size={15} /> Fechar
                                                        </button>
                                                    </div>

                                                    {funcionarioSalarioExpandido.processamentos.length === 0 ? (
                                                        <p className="relatorio-note">
                                                            Ainda nao existe processamento salarial para este periodo. Os valores acima
                                                            sao a estimativa de salario fixo e comissoes acumuladas.
                                                        </p>
                                                    ) : (
                                                        <div className="relatorio-table-scroll">
                                                            <table className="admin-table relatorio-table relatorio-table-compact">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Periodo</th>
                                                                        <th>Salario base</th>
                                                                        <th>Comissoes</th>
                                                                        <th>Deducoes</th>
                                                                        <th>Total</th>
                                                                        <th>Estado</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {funcionarioSalarioExpandido.processamentos.map((processamento) => (
                                                                        <tr key={processamento.id}>
                                                                            <td>
                                                                                {formatarDataCurta(processamento.periodo_inicio)} —{" "}
                                                                                {formatarDataCurta(processamento.periodo_fim)}
                                                                            </td>
                                                                            <td>{formatarMoeda(processamento.salario_base)}</td>
                                                                            <td>{formatarMoeda(processamento.total_comissoes)}</td>
                                                                            <td>{formatarMoeda(processamento.total_deducoes)}</td>
                                                                            <td>{formatarMoeda(processamento.total_a_pagar)}</td>
                                                                            <td>
                                                                                <span className={`relatorio-pill ${processamento.estado === "Pago" ? "success" : processamento.estado === "Aprovado" ? "warning" : "neutral"}`}>
                                                                                    {processamento.estado}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>

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
                                                        <th>Salario base</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {funcionariosVisiveis.map((funcionario) => (
                                                        <tr key={funcionario.funcionario_id}>
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

                                    {funcionariosFiltrados.length > funcionariosVisiveis.length && (
                                        <p className="relatorio-footnote">
                                            A mostrar os {funcionariosVisiveis.length} funcionarios com mais receita.
                                        </p>
                                    )}
                                </article>

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
                                <section className="relatorio-caixa-resumo relatorio-caixa-resumo-5">
                                    <article className="relatorio-stat-mini neutral">
                                        <span><Landmark size={18} /> Saldo inicial</span>
                                        <strong>{formatarMoeda(saldoInicial)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini success">
                                        <span><TrendingUp size={18} /> Entradas</span>
                                        <strong>{formatarMoeda(fluxoFinanceiro.entradas ?? caixa.entradas)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini danger">
                                        <span><Receipt size={18} /> Saidas</span>
                                        <strong>{formatarMoeda(fluxoFinanceiro.saidas ?? caixa.saidas)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini warning">
                                        <span><Wallet size={18} /> Levantamentos</span>
                                        <strong>{formatarMoeda(fluxoFinanceiro.levantamentos ?? caixa.levantamentos)}</strong>
                                    </article>
                                    <article className="relatorio-stat-mini primary">
                                        <span><CircleDollarSign size={18} /> Saldo final esperado</span>
                                        <strong>{formatarMoeda(saldoFinal)}</strong>
                                    </article>
                                </section>

                                <p className="relatorio-note relatorio-fluxo-nota">
                                    Saldo final = saldo inicial + entradas - saidas - levantamentos. Dinheiro recebido nao e
                                    lucro: entradas de origem manual podem nao ser receita de servicos.
                                </p>

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
                                                        <th>Fechado por</th>
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
                                                                <td>{sessao.fechado_por_nome || "-"}</td>
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

                {dados && (
                    <footer className="relatorio-rodape">
                        <span>
                            Relatorio gerado por <strong>{geradoPor || "Sistema"}</strong> em{" "}
                            {formatarDataHora(geradoEm)}.
                        </span>
                        <span>{rotuloPeriodo}</span>
                    </footer>
                )}
            </main>
        </div>
    );
}

export default Relatorio;
