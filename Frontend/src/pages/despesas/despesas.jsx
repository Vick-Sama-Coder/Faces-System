import { useEffect, useMemo, useState } from "react";
import SideBar from "../../components/sidebar/siderbar.jsx";
import Headers from "../../components/headers/header.jsx";
import DespesaModal from "../../components/Modals/DespesaModal/DespesaModal.jsx";
import "../admin/admin.css";
import "./despesas.css";
import {
    Receipt,
    Plus,
    Edit,
    Trash2,
    Wallet,
    CreditCard,
    TrendingDown,
    CalendarDays,
    Search,
    Tag,
    Check,
    X,
    RotateCcw
} from "lucide-react";
import {
    getDespesas,
    getCategoriasDespesa,
    createCategoriaDespesa,
    deleteDespesa,
    getMovimentosEstoque,
    getStockProduto,
    getApiError
} from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`;
}

function formatarData(valor) {
    if (!valor) return "-";

    const texto = String(valor).slice(0, 10);
    const [ano, mes, dia] = texto.split("-").map(Number);
    if (!ano || !mes || !dia) return "-";

    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-MZ", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function chaveCategoria(despesa) {
    return despesa.categoria_id !== null && despesa.categoria_id !== undefined
        ? String(despesa.categoria_id)
        : "sem";
}

function Despesas() {
    const { user } = useAuthStore();
    const podeEscrever = user?.permissoes?.includes("despesas:escrever");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDespesa, setEditingDespesa] = useState(null);

    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroDe, setFiltroDe] = useState("");
    const [filtroAte, setFiltroAte] = useState("");

    const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false);
    const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
    const [savingCategoria, setSavingCategoria] = useState(false);
    const [categoriaError, setCategoriaError] = useState(null);

    const [carregarStock, setCarregarStock] = useState(false);
    const [produtosStock, setProdutosStock] = useState([]);
    const [movimentosStock, setMovimentosStock] = useState([]);
    const [stockError, setStockError] = useState(null);

    const produtosAcabaram = produtosStock.filter((produto) =>
        produto.stock_atual !== null &&
        produto.stock_atual <= 0
    );

    const produtosAbaixoMinimo = produtosStock.filter((produto) =>
        produto.stock_atual !== null &&
        produto.stock_minimo !== null &&
        produto.stock_atual > 0 &&
        produto.stock_atual < produto.stock_minimo
    );

    const produtosComStock = produtosStock.filter((produto) =>
        produto.stock_atual !== null &&
        produto.stock_atual >= produto.stock_minimo
    );

    useEffect(() => {
        carregarDados();
    }, []);

    useEffect(() => {
        async function carregarStock() {
            setCarregarStock(true);
            setStockError(null);

            try {
                const resMovimentos = await getMovimentosEstoque({});
                const movimentos = Array.isArray(resMovimentos.data) ? resMovimentos.data : [];
                const produtos = [...new Map(
                    movimentos
                        .filter((movimento) => movimento.produto_id != null)
                        .map((movimento) => [
                            String(movimento.produto_id),
                            { id: movimento.produto_id, nome: movimento.produto_nome }
                        ])
                ).values()];
                const produtosComStock = await Promise.all(
                    produtos.map(async (produto) => {
                        try {
                            const resStock = await getStockProduto(produto.id);
                            const dados = resStock.data || {};
                            const stockAtual =
                                Number(dados.total_entradas || 0) -
                                Number(dados.total_saidas || 0) +
                                Number(dados.total_ajustes || 0);

                            return {
                                ...produto,
                                stock_atual: stockAtual,
                                stock_minimo: Number(dados.stock_minimo || 0)
                            };
                        } catch {
                            return { ...produto, stock_atual: null, stock_minimo: null };
                        }
                    })
                );

                setMovimentosStock(movimentos);
                setProdutosStock(produtosComStock);
            } catch (err) {
                setStockError(getApiError(err));
            } finally {
                setCarregarStock(false);
            }
        }

        carregarStock();
    }, []);

    async function carregarDados() {
        setLoading(true);
        setError(null);

        try {
            const [resDespesas, resCategorias] = await Promise.all([
                getDespesas({}),
                getCategoriasDespesa()
            ]);

            setDespesas(Array.isArray(resDespesas.data) ? resDespesas.data : []);
            setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoading(false);
        }
    }

    function handleNovaDespesa() {
        setEditingDespesa(null);
        setIsModalOpen(true);
    }

    function handleEditarDespesa(despesa) {
        setEditingDespesa(despesa);
        setIsModalOpen(true);
    }

    async function handleEliminarDespesa(despesa) {
        if (!window.confirm(`Tem a certeza que deseja eliminar a despesa "${despesa.descricao}"?`)) return;

        try {
            await deleteDespesa(despesa.id);
            await carregarDados();
        } catch (err) {
            setError(getApiError(err));
        }
    }

    async function handleSucesso() {
        setIsModalOpen(false);
        setEditingDespesa(null);
        await carregarDados();
    }

    async function criarCategoria(e) {
        e.preventDefault();
        if (savingCategoria) return;

        const nome = novaCategoriaNome.trim();
        if (!nome) {
            setCategoriaError("Indique o nome da categoria.");
            return;
        }

        setSavingCategoria(true);
        setCategoriaError(null);

        try {
            const res = await createCategoriaDespesa({ nome });
            const criada = res.data;

            if (criada?.id) {
                setCategorias((anteriores) => (
                    [...anteriores, criada].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt"))
                ));
            }

            setNovaCategoriaNome("");
            setNovaCategoriaAberta(false);
        } catch (err) {
            setCategoriaError(getApiError(err));
        } finally {
            setSavingCategoria(false);
        }
    }

    function limparFiltros() {
        setSearchTerm("");
        setFiltroCategoria("");
        setFiltroEstado("");
        setFiltroDe("");
        setFiltroAte("");
    }

    const despesasFiltradas = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase();

        return despesas.filter((despesa) => {
            const data = String(despesa.data_compra || "").slice(0, 10);
            const descricao = String(despesa.descricao || "").toLowerCase();
            const comprovativo = String(despesa.comprovativo || "").toLowerCase();

            const correspondePesquisa = !termo
                || descricao.includes(termo)
                || comprovativo.includes(termo);
            const correspondeCategoria = !filtroCategoria
                || chaveCategoria(despesa) === filtroCategoria;
            const correspondeEstado = !filtroEstado
                || despesa.estado === filtroEstado;
            const correspondeDe = !filtroDe || data >= filtroDe;
            const correspondeAte = !filtroAte || data <= filtroAte;

            return correspondePesquisa
                && correspondeCategoria
                && correspondeEstado
                && correspondeDe
                && correspondeAte;
        });
    }, [despesas, searchTerm, filtroCategoria, filtroEstado, filtroDe, filtroAte]);

    const totais = useMemo(() => {
        const total = despesasFiltradas.reduce((soma, despesa) => soma + Number(despesa.valor_total || 0), 0);
        const quantidade = despesasFiltradas.length;
        const ticketMedio = quantidade > 0 ? total / quantidade : 0;
        const maiorDespesa = despesasFiltradas.reduce((maior, despesa) => (
            Number(despesa.valor_total || 0) > Number(maior?.valor_total || 0) ? despesa : maior
        ), null);

        const agora = new Date();
        const totalMes = despesasFiltradas.reduce((soma, despesa) => {
            const [ano, mes] = String(despesa.data_compra || "").slice(0, 10).split("-").map(Number);
            return ano === agora.getFullYear() && mes === agora.getMonth() + 1
                ? soma + Number(despesa.valor_total || 0)
                : soma;
        }, 0);

        return { total, quantidade, ticketMedio, maiorDespesa, totalMes };
    }, [despesasFiltradas]);

    const resumoCategorias = useMemo(() => {
        const contagem = new Map();

        despesasFiltradas.forEach((despesa) => {
            const chave = chaveCategoria(despesa);
            const atual = contagem.get(chave) || { total: 0, quantidade: 0 };
            contagem.set(chave, {
                total: atual.total + Number(despesa.valor_total || 0),
                quantidade: atual.quantidade + 1
            });
        });

        const nomes = new Map(categorias.map((categoria) => [String(categoria.id), categoria.nome]));
        nomes.set("sem", "Sem categoria");

        return [...nomes.entries()]
            .map(([id, nome]) => ({
                id,
                nome,
                ...(contagem.get(id) || { total: 0, quantidade: 0 })
            }))
            .filter((categoria) => categoria.id !== "sem" || categoria.quantidade > 0)
            .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt"));
    }, [categorias, despesasFiltradas]);

    const maxCategoria = Math.max(1, ...resumoCategorias.map((categoria) => categoria.total));
    const categoriasComDespesas = resumoCategorias.filter((categoria) => categoria.total > 0).length;
    const categoriaPrincipal = resumoCategorias.find((categoria) => categoria.total > 0);

    const resumoPagamentos = useMemo(() => {
        const contagem = new Map();

        despesasFiltradas.forEach((despesa) => {
            const nome = despesa.metodo_pagamento || "Nao indicado";
            const atual = contagem.get(nome) || { total: 0, quantidade: 0 };
            contagem.set(nome, {
                total: atual.total + Number(despesa.valor_total || 0),
                quantidade: atual.quantidade + 1
            });
        });

        return [...contagem.entries()]
            .map(([nome, dados]) => ({ nome, ...dados }))
            .sort((a, b) => b.total - a.total);
    }, [despesasFiltradas]);

    const maxPagamento = Math.max(1, ...resumoPagamentos.map((pagamento) => pagamento.total));
    const temFiltros = Boolean(searchTerm || filtroCategoria || filtroEstado || filtroDe || filtroAte);

    return (
        <>
            {isModalOpen && (
                <DespesaModal
                    despesa={editingDespesa}
                    onclose={() => {
                        setIsModalOpen(false);
                        setEditingDespesa(null);
                    }}
                    onSuccess={handleSucesso}
                />
            )}

            <div className="admin-main">
                <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="admin-header"
                    title="Despesas"
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
                                <h1 className="admin-page-title">Despesas</h1>
                                <p className="admin-page-subtitle">
                                    Controle os custos do salao, acompanhe o peso de cada categoria e mantenha os comprovativos organizados.
                                </p>
                            </div>
                            {podeEscrever && (
                                <div className="admin-page-actions">
                                    <button type="button" className="admin-btn primary" onClick={handleNovaDespesa}>
                                        <Plus size={18} />
                                        Nova Despesa
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    <section className="despesas-kpis">
                        <article className="despesas-kpi total">
                            <span className="despesas-kpi-icon"><Wallet size={20} /></span>
                            <div>
                                <span className="despesas-kpi-label">Total no periodo</span>
                                <strong>{formatarMoeda(totais.total)}</strong>
                                <small>{formatarMoeda(totais.totalMes)} no mes atual</small>
                            </div>
                        </article>

                        <article className="despesas-kpi quantidade">
                            <span className="despesas-kpi-icon"><Receipt size={20} /></span>
                            <div>
                                <span className="despesas-kpi-label">Despesas registadas</span>
                                <strong>{totais.quantidade.toLocaleString("pt-MZ")}</strong>
                                <small>{categoriasComDespesas} categorias com despesas</small>
                            </div>
                        </article>

                        <article className="despesas-kpi ticket">
                            <span className="despesas-kpi-icon"><CreditCard size={20} /></span>
                            <div>
                                <span className="despesas-kpi-label">Ticket medio</span>
                                <strong>{formatarMoeda(totais.ticketMedio)}</strong>
                                <small>valor medio por registo</small>
                            </div>
                        </article>

                        <article className="despesas-kpi maior">
                            <span className="despesas-kpi-icon"><TrendingDown size={20} /></span>
                            <div>
                                <span className="despesas-kpi-label">Maior despesa</span>
                                <strong>{formatarMoeda(totais.maiorDespesa?.valor_total)}</strong>
                                <small title={totais.maiorDespesa?.descricao || ""}>
                                    {totais.maiorDespesa?.descricao || "Sem registos"}
                                </small>
                            </div>
                        </article>
                    </section>

                    <section className="despesas-filter">
                        <div className="despesas-filter-field">
                            <label htmlFor="despesa-de">De</label>
                            <input
                                id="despesa-de"
                                type="date"
                                value={filtroDe}
                                max={filtroAte || undefined}
                                onChange={(e) => setFiltroDe(e.target.value)}
                            />
                        </div>

                        <div className="despesas-filter-field">
                            <label htmlFor="despesa-ate">Ate</label>
                            <input
                                id="despesa-ate"
                                type="date"
                                value={filtroAte}
                                min={filtroDe || undefined}
                                onChange={(e) => setFiltroAte(e.target.value)}
                            />
                        </div>

                        <div className="despesas-filter-field">
                            <label htmlFor="despesa-categoria">Categoria</label>
                            <select
                                id="despesa-categoria"
                                value={filtroCategoria}
                                onChange={(e) => setFiltroCategoria(e.target.value)}
                            >
                                <option value="">Todas as categorias</option>
                                {categorias.map((categoria) => (
                                    <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                                ))}
                                <option value="sem">Sem categoria</option>
                            </select>
                        </div>

                        <div className="despesas-filter-field">
                            <label htmlFor="despesa-estado">Estado</label>
                            <select
                                id="despesa-estado"
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                <option value="">Todos os estados</option>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>

                        <div className="despesas-filter-field despesas-filter-search">
                            <label htmlFor="despesa-pesquisa">Pesquisar</label>
                            <div className="despesas-search">
                                <Search size={16} />
                                <input
                                    id="despesa-pesquisa"
                                    type="search"
                                    placeholder="Descricao ou comprovativo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="despesas-filter-footer">
                            <button
                                type="button"
                                className="admin-btn secondary"
                                onClick={limparFiltros}
                                disabled={!temFiltros}
                            >
                                <RotateCcw size={16} />
                                Limpar filtros
                            </button>
                            <span className="despesas-filter-counter">
                                {despesasFiltradas.length} de {despesas.length} registos
                            </span>
                        </div>
                    </section>

                    <div className="despesas-layout">
                        <section className="despesas-table-column">
                            <header className="despesas-section-title">
                                <div>
                                    <Receipt size={18} />
                                    <span>Lancamentos do periodo</span>
                                </div>
                                <span className="admin-badge primary">{despesasFiltradas.length} registos</span>
                            </header>

                            <div className="admin-table-wrap despesas-table-wrap">
                                {loading ? (
                                    <p className="admin-empty">A carregar despesas...</p>
                                ) : despesasFiltradas.length === 0 ? (
                                    <div className="despesas-empty">
                                        <span className="despesas-empty-icon"><Receipt size={30} /></span>
                                        <strong>
                                            {despesas.length === 0
                                                ? "Ainda nao existem despesas registadas"
                                                : "Nenhuma despesa corresponde aos filtros"}
                                        </strong>
                                        <span>
                                            {despesas.length === 0
                                                ? "Registe a primeira despesa para comecar a acompanhar os custos do salao."
                                                : "Ajuste o periodo, a categoria ou a pesquisa para encontrar o registo."}
                                        </span>
                                        {despesas.length === 0 && podeEscrever && (
                                            <button type="button" className="admin-btn primary" onClick={handleNovaDespesa}>
                                                <Plus size={16} />
                                                Registar despesa
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <table className="admin-table despesas-table">
                                        <thead>
                                            <tr>
                                                <th>Despesa</th>
                                                <th>Categoria</th>
                                                <th>Data</th>
                                                <th>Pagamento</th>
                                                <th>Valor</th>
                                                {podeEscrever && <th className="admin-actions-cell">Acoes</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {despesasFiltradas.map((despesa) => (
                                                <tr key={despesa.id}>
                                                    <td>
                                                        <div className="despesas-cell-main">
                                                            <div className="despesas-cell-title">
                                                                <strong>{despesa.descricao}</strong>
                                                                <span className={`admin-badge ${despesa.estado === "Inativo" ? "neutral" : "success"}`}>
                                                                    {despesa.estado || "Ativo"}
                                                                </span>
                                                            </div>
                                                            <span>
                                                                {despesa.comprovativo
                                                                    ? `Comprovativo: ${despesa.comprovativo}`
                                                                    : "Sem comprovativo"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="despesas-category-cell">
                                                            <Tag size={14} />
                                                            {despesa.categoria_nome || "Sem categoria"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="despesas-date-cell">
                                                            <CalendarDays size={14} />
                                                            {formatarData(despesa.data_compra)}
                                                        </span>
                                                    </td>
                                                    <td>{despesa.metodo_pagamento || "-"}</td>
                                                    <td>
                                                        <strong className="despesas-value">{formatarMoeda(despesa.valor_total)}</strong>
                                                    </td>
                                                    {podeEscrever && (
                                                        <td className="admin-actions-cell">
                                                            <button
                                                                type="button"
                                                                className="admin-icon-btn edit"
                                                                title="Editar despesa"
                                                                onClick={() => handleEditarDespesa(despesa)}
                                                            >
                                                                <Edit size={17} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-icon-btn danger"
                                                                title="Eliminar despesa"
                                                                onClick={() => handleEliminarDespesa(despesa)}
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
                        </section>

                        <aside className="despesas-side">
                            <article className="despesas-panel">
                                <header className="despesas-panel-header">
                                    <div className="despesas-panel-title">
                                        <Tag size={17} />
                                        <div>
                                            <strong>Categorias</strong>
                                            <span>Peso de cada categoria no periodo</span>
                                        </div>
                                    </div>
                                    {podeEscrever && (
                                        <button
                                            type="button"
                                            className="despesas-panel-add"
                                            title="Nova categoria"
                                            onClick={() => {
                                                setNovaCategoriaAberta((aberta) => !aberta);
                                                setCategoriaError(null);
                                            }}
                                        >
                                            {novaCategoriaAberta ? <X size={16} /> : <Plus size={16} />}
                                        </button>
                                    )}
                                </header>

                                {novaCategoriaAberta && (
                                    <form className="despesas-category-form" onSubmit={criarCategoria}>
                                        <input
                                            type="text"
                                            value={novaCategoriaNome}
                                            onChange={(e) => {
                                                setNovaCategoriaNome(e.target.value);
                                                if (categoriaError) setCategoriaError(null);
                                            }}
                                            placeholder="Nome da categoria"
                                            maxLength={100}
                                            autoFocus
                                        />
                                        <button type="submit" className="admin-icon-btn success" title="Criar categoria" disabled={savingCategoria}>
                                            <Check size={16} />
                                        </button>
                                    </form>
                                )}

                                {categoriaError && <p className="despesas-inline-error">{categoriaError}</p>}

                                {loading ? (
                                    <p className="despesas-panel-empty">A carregar categorias...</p>
                                ) : resumoCategorias.length === 0 ? (
                                    <p className="despesas-panel-empty">Ainda sem categorias registadas.</p>
                                ) : (
                                    <div className="despesas-category-list">
                                        {resumoCategorias.map((categoria) => (
                                            <div className="despesas-category-row" key={categoria.id}>
                                                <div className="despesas-category-line">
                                                    <span>{categoria.nome}</span>
                                                    <strong>{formatarMoeda(categoria.total)}</strong>
                                                </div>
                                                <div className="despesas-category-bar">
                                                    <span style={{ width: `${categoria.total > 0 ? Math.max((categoria.total / maxCategoria) * 100, 4) : 0}%` }} />
                                                </div>
                                                <small>
                                                    {categoria.quantidade} {categoria.quantidade === 1 ? "registo" : "registos"}
                                                </small>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {categoriaPrincipal && (
                                    <p className="despesas-panel-hint">
                                        Maior peso: <strong>{categoriaPrincipal.nome}</strong> com {formatarMoeda(categoriaPrincipal.total)}.
                                    </p>
                                )}
                            </article>

                            <article className="despesas-panel">
                                <header className="despesas-panel-header">
                                    <div className="despesas-panel-title">
                                        <Tag size={17} />
                                        <div>
                                            <strong>Stock do salao</strong>
                                            <span>Consultar quantidades e ajustes</span>
                                        </div>
                                    </div>
                                </header>

                                {stockError ? (
                                    <p className="despesas-panel-empty">{stockError}</p>
                                ) : carregarStock ? (
                                    <p className="despesas-panel-empty">A carregar informações de stock...</p>
                                ) : produtosStock.length === 0 ? (
                                    <p className="despesas-panel-empty">Ainda nao ha produtos com stock registado. Registe uma compra de produtos para comecar a acompanhar o stock.</p>
                                ) : (
                                    <div className="despesas-stock-info">
                                        {produtosAcabaram.length > 0 ? (
                                            <p>
                                                Produtos <strong style={{ color: 'red' }}>acabados</strong> (stock zero):{" "}
                                                {produtosAcabaram.map((produto) => produto.nome).join(", ")}
                                            </p>
                                        ) : (
                                            <p>Nenhum produto completamente acabado.</p>
                                        )}
                                        {produtosAbaixoMinimo.length > 0 ? (
                                            <p>
                                                Produtos com stock <strong style={{ color: 'orange' }}>{produtosAbaixoMinimo.length}</strong> abaixo do mínimo:{" "}
                                                <strong style={{ color: 'red' }}>
                                                    {produtosAbaixoMinimo.map((produto) => produto.nome).join(", ")}
                                                </strong>
                                            </p>
                                        ) : (
                                            <p>Stock dentro do mínimo definido.</p>
                                        )}
                                        {produtosComStock.length > 0 ? (
                                            <p>
                                                Produtos com stock <strong style={{ color: 'green' }}>{produtosComStock.length}</strong> dentro do normal:
                                                <strong style={{ color: 'green' }}>
                                                    {produtosComStock.map((produto) => `${produto.nome} (${produto.stock_atual} utd)`).join(", ")}
                                                </strong>
                                            </p>
                                        ) : null}
                                        <p>Total de produtos: {produtosStock.length}</p>
                                        <p>Total de movimentos: {movimentosStock.length}</p>
                                    </div>
                                )}
                            </article>

                            <article className="despesas-panel">
                                <header className="despesas-panel-header">
                                    <div className="despesas-panel-title">
                                        <CreditCard size={17} />
                                        <div>
                                            <strong>Formas de pagamento</strong>
                                            <span>Como as despesas foram liquidadas</span>
                                        </div>
                                    </div>
                                </header>

                                {loading ? (
                                    <p className="despesas-panel-empty">A carregar pagamentos...</p>
                                ) : resumoPagamentos.length === 0 ? (
                                    <p className="despesas-panel-empty">Sem pagamentos no periodo.</p>
                                ) : (
                                    <div className="despesas-payment-list">
                                        {resumoPagamentos.map((pagamento) => (
                                            <div className="despesas-payment-row" key={pagamento.nome}>
                                                <div className="despesas-payment-line">
                                                    <span>{pagamento.nome}</span>
                                                    <strong>{formatarMoeda(pagamento.total)}</strong>
                                                </div>
                                                <div className="despesas-category-bar">
                                                    <span style={{ width: `${Math.max((pagamento.total / maxPagamento) * 100, 4)}%` }} />
                                                </div>
                                                <small>
                                                    {pagamento.quantidade} {pagamento.quantidade === 1 ? "registo" : "registos"}
                                                </small>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        </aside>
                    </div>
                </main>
            </div>
        </>
    );
}

export default Despesas;
