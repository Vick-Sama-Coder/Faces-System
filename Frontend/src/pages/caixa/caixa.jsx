import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar/Sidebar.jsx";
import Headers from "../../components/headers/header.jsx";
import { useAuthStore } from "../../store/authStore.js";
import {
    abrirCaixa,
    fecharCaixa,
    getApiError,
    getCaixaAtual,
    getCaixaFechos,
    getMovimentosCaixa,
    registarLevantamentoCaixa,
} from "../../services/api.js";
import {
    ArrowDownLeft,
    CalendarCheck2,
    Landmark,
    PlusCircle,
    TrendingDown,
    Wallet,
} from "lucide-react";
import "../admin/admin.css";
import "./caixa.css";

const METODOS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"];

function formatarMoeda(valor) {
    const numero = Number(valor ?? 0);
    return `${numero.toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} MT`;
}

function formataDataHora(valor) {
    if (!valor) return "-";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";

    return data.toLocaleString("pt-MZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatarDataCurta(valor) {
    if (!valor) return "-";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";

    return data.toLocaleDateString("pt-MZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function Caixa() {
    const { user } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [estado, setEstado] = useState({
        aberta: false,
        sessao: null,
        saldo_esperado: null,
        saldo_por_metodo: [],
    });
    const [movimentos, setMovimentos] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [saldoInicial, setSaldoInicial] = useState("");
    const [levantamento, setLevantamento] = useState({
        valor: "",
        metodo_pagamento: "Dinheiro",
        descricao: "",
    });
    const [fecho, setFecho] = useState({ valor_contado: "", observacoes: "" });

    const podeOperar = user?.permissoes?.includes("caixa:operar");
    const podeLevantar = user?.permissoes?.includes("caixa:levantar");
    const podeFechar = user?.permissoes?.includes("caixa:fechar");

    const resumo = useMemo(() => {
        const saldoInicialSessao = Number(estado?.sessao?.saldo_inicial ?? 0);
        const esperado = Number(estado?.saldo_esperado ?? 0);
        const totalMovimentos = movimentos.length;

        return {
            saldoInicialSessao,
            esperado,
            totalMovimentos,
        };
    }, [estado, movimentos]);

    async function carregarDados() {
        setLoading(true);
        setError(null);

        try {
            const [resAtual, resMovimentos, resHistorico] = await Promise.all([
                getCaixaAtual(),
                getMovimentosCaixa().catch((err) => {
                    if (err?.response?.status === 404 || err?.response?.status === 409) {
                        return { data: { sessao_id: null, movimentos: [] } };
                    }
                    throw err;
                }),
                getCaixaFechos().catch(() => ({ data: [] })),
            ]);

            const atual = resAtual?.data ?? {
                aberta: false,
                sessao: null,
                saldo_esperado: null,
                saldo_por_metodo: [],
            };
            const listaMovimentos = Array.isArray(resMovimentos?.data?.movimentos)
                ? resMovimentos.data.movimentos
                : [];
            const fechamentos = Array.isArray(resHistorico?.data)
                ? resHistorico.data.slice(0, 5)
                : [];

            setEstado(atual);
            setMovimentos(listaMovimentos);
            setHistorico(fechamentos);
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarDados();
    }, []);

    async function handleAbrirCaixa(event) {
        event.preventDefault();
        if (!podeOperar) return;

        const valor = Number(saldoInicial);
        if (!Number.isFinite(valor) || valor < 0) {
            setError("Indique um saldo inicial válido.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await abrirCaixa({ saldo_inicial: valor });
            setSaldoInicial("");
            await carregarDados();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLevantamento(event) {
        event.preventDefault();
        if (!podeLevantar) return;

        const valor = Number(levantamento.valor);
        if (!Number.isFinite(valor) || valor <= 0) {
            setError("Indique um valor de levantamento válido.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await registarLevantamentoCaixa({
                valor,
                metodo_pagamento: levantamento.metodo_pagamento,
                descricao: levantamento.descricao.trim() || "Levantamento de caixa",
            });
            setLevantamento({ valor: "", metodo_pagamento: "Dinheiro", descricao: "" });
            await carregarDados();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFecharCaixa(event) {
        event.preventDefault();
        if (!podeFechar) return;

        const valor = Number(fecho.valor_contado);
        if (!Number.isFinite(valor) || valor < 0) {
            setError("Indique o valor contado válido.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await fecharCaixa({
                valor_contado: valor,
                observacoes: fecho.observacoes.trim() || undefined,
            });
            setFecho({ valor_contado: "", observacoes: "" });
            await carregarDados();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-main">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <Headers
                title="Caixa"
                subtitle="Gestão da sessão ativa e movimentos do dia"
                onMenuClick={() => setIsSidebarOpen(true)}
                sidebarOpen={isSidebarOpen}
            />

            <main className="admin-content">
                <header className="admin-page-header caixa-page-header">
                    <div className="admin-page-header-inner">
                        <div>
                            <p className="admin-page-subtitle">Operações financeiras</p>
                            <h1 className="admin-page-title">Caixa</h1>
                        </div>
                        <div className="admin-page-actions">
                            {estado?.aberta ? (
                                <span className="caixa-status status-open">Sessão aberta</span>
                            ) : (
                                <span className="caixa-status status-closed">Sessão fechada</span>
                            )}
                        </div>
                    </div>
                </header>

                {error && <div className="caixa-alert caixa-alert-error">{error}</div>}

                {loading ? (
                    <div className="caixa-skeleton">
                        <div className="caixa-skeleton-card" />
                        <div className="caixa-skeleton-card" />
                        <div className="caixa-skeleton-card" />
                    </div>
                ) : (
                    <>
                        <section className="caixa-grid-summary">
                            <article className="caixa-summary-card">
                                <div className="caixa-summary-icon accent-wallet">
                                    <Wallet size={22} />
                                </div>
                                <div>
                                    <span>Saldo inicial em dinheiro</span>
                                    <strong>{formatarMoeda(resumo.saldoInicialSessao)}</strong>
                                </div>
                            </article>

                            <article className="caixa-summary-card">
                                <div className="caixa-summary-icon accent-landmark">
                                    <Landmark size={22} />
                                </div>
                                <div>
                                    <span>Saldo esperado</span>
                                    <strong>{formatarMoeda(resumo.esperado)}</strong>
                                </div>
                            </article>

                            <article className="caixa-summary-card">
                                <div className="caixa-summary-icon accent-shift">
                                    <TrendingDown size={22} />
                                </div>
                                <div>
                                    <span>Movimentos</span>
                                    <strong>{resumo.totalMovimentos}</strong>
                                </div>
                            </article>
                        </section>

                        {estado?.aberta && (
                            <section className="caixa-card">
                                <div className="caixa-card-header">
                                    <div className="caixa-card-title-wrap">
                                        <Wallet size={18} />
                                        <h2>Saldos por método de pagamento</h2>
                                    </div>
                                </div>
                                <div className="caixa-table-wrap">
                                    <table className="admin-table caixa-table">
                                        <thead>
                                            <tr>
                                                <th>Método</th>
                                                <th>Saldo da sessão</th>
                                                <th>Conferência no fecho</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(estado.saldo_por_metodo ?? []).map((item) => (
                                                <tr key={item.metodo_pagamento}>
                                                    <td>{item.metodo_pagamento}</td>
                                                    <td>{formatarMoeda(item.saldo)}</td>
                                                    <td>{item.conferido_no_fecho ? "Valor contado" : "Registado, não conferido"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {!estado?.aberta && (
                            <section className="caixa-card">
                                <div className="caixa-card-header">
                                    <div className="caixa-card-title-wrap">
                                        <PlusCircle size={18} />
                                        <h2>Abrir caixa</h2>
                                    </div>
                                </div>

                                <form onSubmit={handleAbrirCaixa} className="caixa-form">
                                    <label>
                                        <span>Saldo inicial em dinheiro</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={saldoInicial}
                                            onChange={(event) => setSaldoInicial(event.target.value)}
                                            placeholder="0.00"
                                            disabled={!podeOperar || submitting}
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        className="admin-btn primary"
                                        disabled={!podeOperar || submitting}
                                    >
                                        {submitting ? "A abrir..." : "Abrir caixa"}
                                    </button>
                                </form>
                            </section>
                        )}

                        {estado?.aberta && (
                            <section className="caixa-grid-2">
                                <article className="caixa-card">
                                    <div className="caixa-card-header">
                                        <div className="caixa-card-title-wrap">
                                            <ArrowDownLeft size={18} />
                                            <h2>Levantamento</h2>
                                        </div>
                                    </div>

                                    <form onSubmit={handleLevantamento} className="caixa-form compact">
                                        <label>
                                            <span>Método de pagamento</span>
                                            <select
                                                value={levantamento.metodo_pagamento}
                                                onChange={(event) =>
                                                    setLevantamento((anterior) => ({
                                                        ...anterior,
                                                        metodo_pagamento: event.target.value,
                                                    }))
                                                }
                                                disabled={!podeLevantar || submitting}
                                            >
                                                {METODOS_PAGAMENTO.map((metodo) => (
                                                    <option key={metodo} value={metodo}>{metodo}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            <span>Valor</span>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={levantamento.valor}
                                                onChange={(event) =>
                                                    setLevantamento((anterior) => ({
                                                        ...anterior,
                                                        valor: event.target.value,
                                                    }))
                                                }
                                                placeholder="0.00"
                                                disabled={!podeLevantar || submitting}
                                            />
                                        </label>

                                        <label>
                                            <span>Descrição</span>
                                            <input
                                                type="text"
                                                value={levantamento.descricao}
                                                onChange={(event) =>
                                                    setLevantamento((anterior) => ({
                                                        ...anterior,
                                                        descricao: event.target.value,
                                                    }))
                                                }
                                                placeholder="Motivo do levantamento"
                                                disabled={!podeLevantar || submitting}
                                            />
                                        </label>

                                        <button
                                            type="submit"
                                            className="admin-btn primary"
                                            disabled={!podeLevantar || submitting}
                                        >
                                            {submitting ? "A registar..." : "Registar levantamento"}
                                        </button>
                                    </form>
                                </article>

                                <article className="caixa-card">
                                    <div className="caixa-card-header">
                                        <div className="caixa-card-title-wrap">
                                            <CalendarCheck2 size={18} />
                                            <h2>Fecho do caixa</h2>
                                        </div>
                                    </div>

                                    <form onSubmit={handleFecharCaixa} className="caixa-form compact">
                                        <label>
                                            <span>Dinheiro contado</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={fecho.valor_contado}
                                                onChange={(event) =>
                                                    setFecho((anterior) => ({
                                                        ...anterior,
                                                        valor_contado: event.target.value,
                                                    }))
                                                }
                                                placeholder="0.00"
                                                disabled={!podeFechar || submitting}
                                            />
                                        </label>
                                        <p className="caixa-form-hint">
                                            Apenas o dinheiro é contado fisicamente. Os outros métodos ficam registados por saldo, sem conferência no fecho.
                                        </p>

                                        <label>
                                            <span>Observações</span>
                                            <textarea
                                                rows={3}
                                                value={fecho.observacoes}
                                                onChange={(event) =>
                                                    setFecho((anterior) => ({
                                                        ...anterior,
                                                        observacoes: event.target.value,
                                                    }))
                                                }
                                                placeholder="Detalhes do fecho (opcional)"
                                                disabled={!podeFechar || submitting}
                                            />
                                        </label>

                                        <button
                                            type="submit"
                                            className="admin-btn danger"
                                            disabled={!podeFechar || submitting}
                                        >
                                            {submitting ? "A fechar..." : "Fechar caixa"}
                                        </button>
                                    </form>
                                </article>
                            </section>
                        )}

                        <section className="caixa-card">
                            <div className="caixa-card-header">
                                <div className="caixa-card-title-wrap">
                                    <Wallet size={18} />
                                    <h2>{estado?.aberta ? "Movimentos da sessão atual" : "Sessão não ativa"}</h2>
                                </div>
                            </div>

                            {movimentos.length === 0 ? (
                                <div className="caixa-empty-state">
                                    {estado?.aberta
                                        ? "Ainda não existem movimentos registados nesta sessão."
                                        : "Não existe nenhuma sessão de caixa aberta neste momento."}
                                </div>
                            ) : (
                                <div className="caixa-table-wrap">
                                    <table className="admin-table caixa-table">
                                        <thead>
                                            <tr>
                                                <th>Tipo</th>
                                                <th>Método</th>
                                                <th>Descrição</th>
                                                <th>Valor</th>
                                                <th>Data</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movimentos.map((movimento) => (
                                                <tr key={movimento.id}>
                                                    <td>
                                                        <span
                                                            className={`caixa-pill ${movimento.estado !== "Ativo" ? "muted" : movimento.tipo_movimento === "Levantamento" ? "warning" : "success"}`}
                                                        >
                                                            {movimento.tipo_movimento}
                                                        </span>
                                                    </td>
                                                    <td>{movimento.metodo_pagamento || "Dinheiro"}</td>
                                                    <td>{movimento.descricao || "-"}</td>
                                                    <td>{formatarMoeda(movimento.valor)}</td>
                                                    <td>{formataDataHora(movimento.data_hora)}</td>
                                                    <td>{movimento.estado}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="caixa-card">
                            <div className="caixa-card-header">
                                <div className="caixa-card-title-wrap">
                                    <CalendarCheck2 size={18} />
                                    <h2>Fechos recentes</h2>
                                </div>
                            </div>

                            {historico.length === 0 ? (
                                <div className="caixa-empty-state">
                                    Ainda não há fechamentos registados.
                                </div>
                            ) : (
                                <div className="caixa-table-wrap">
                                    <table className="admin-table caixa-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Saldo esperado</th>
                                                <th>Valor contado</th>
                                                <th>Diferença</th>
                                                <th>Saldos por método no fecho</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historico.map((fechoItem) => (
                                                <tr key={fechoItem.id}>
                                                    <td>{formatarDataCurta(fechoItem.data_fecho)}</td>
                                                    <td>{formatarMoeda(fechoItem.valor_esperado)}</td>
                                                    <td>{formatarMoeda(fechoItem.valor_contado)}</td>
                                                    <td>{formatarMoeda(fechoItem.diferenca)}</td>
                                                    <td>
                                                        {(fechoItem.saldos_por_metodo ?? [])
                                                            .map((item) => `${item.metodo_pagamento}: ${formatarMoeda(item.saldo)}`)
                                                            .join(" · ")}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default Caixa;
