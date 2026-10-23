import { useEffect, useMemo, useState } from "react";
import {
    CalendarPlus,
    X,
    UserRound,
    ScissorsIcon,
    PlusIcon,
    Trash2,
    Receipt,
    CreditCard,
    Heart,
    CheckCircle2,
    Wallet
} from "lucide-react";
import {
    createAtendimento,
    registrarPagamento,
    getClientes,
    getServicos,
    getFuncionarios,
    getFidelizacao,
    getApiError,
    getApiErrorField
} from "../../../services/api.js";
import { validarAtendimento } from "../../../utils/validacoes.js";
import { useAuthStore } from "../../../store/authStore.js";
import ClientModal from "../ClientModal/ClientModal.jsx";
import FidelizacaoCard from "../../FidelizacaoCard/FidelizacaoCard.jsx";
import './New-Mark-Modal.css'

const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"];

const itemVazio = () => ({
    categoria_id: "",
    servico_id: "",
    funcionario_id: "",
    preco_praticado: ""
});

function NewMarkModal({ onclose, onSuccess }) {
    const { user } = useAuthStore();
    const podePagar = user?.permissoes?.includes("pagamentos:registar");

    const [clientes, setClientes] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);

    const [clienteId, setClienteId] = useState("");
    const [pesquisaCliente, setPesquisaCliente] = useState("");
    const [itens, setItens] = useState([itemVazio()]);
    const [fidelizacaoCarregada, setFidelizacaoCarregada] = useState({ clienteId: null, dados: null });
    const [pagamento, setPagamento] = useState({
        metodo: "Dinheiro",
        valor: ""
    });
    const [pagamentoManual, setPagamentoManual] = useState(false);

    const [carregandoDados, setCarregandoDados] = useState(true);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let activo = true;

        async function carregarDados() {
            try {
                const [resClientes, resServicos, resFuncionarios] = await Promise.all([
                    getClientes(),
                    getServicos(),
                    getFuncionarios()
                ]);

                if (!activo) return;

                const listaClientes = Array.isArray(resClientes.data)
                    ? resClientes.data
                    : (resClientes.data?.clientes || []);
                const listaServicos = Array.isArray(resServicos.data)
                    ? resServicos.data
                    : (resServicos.data?.servicos || []);
                const listaFuncionarios = Array.isArray(resFuncionarios.data)
                    ? resFuncionarios.data
                    : (resFuncionarios.data?.funcionarios || []);

                setClientes(listaClientes.filter((c) => c.estado === "Ativo"));
                setServicos(listaServicos.filter((s) => s.estado === "Ativo"));
                setFuncionarios(listaFuncionarios.filter((f) => f.estado === "Ativo"));
            } catch (err) {
                if (activo) setError(getApiError(err));
            } finally {
                if (activo) setCarregandoDados(false);
            }
        }

        carregarDados();
        return () => { activo = false };
    }, []);

    useEffect(() => {
        if (!clienteId) return undefined;

        let activo = true;

        getFidelizacao(clienteId)
            .then((res) => {
                if (activo) {
                    setFidelizacaoCarregada({ clienteId: String(clienteId), dados: res.data || null });
                }
            })
            .catch(() => {
                if (activo) {
                    setFidelizacaoCarregada({ clienteId: String(clienteId), dados: null });
                }
            });

        return () => { activo = false };
    }, [clienteId]);

    const categoriasServicos = useMemo(() => {
        const mapa = new Map()
        servicos.forEach((servico) => {
            if (servico.categoria_id && servico.categoria_nome) {
                mapa.set(String(servico.categoria_id), servico.categoria_nome)
            }
        })
        return [...mapa.entries()]
            .map(([id, nome]) => ({ id, nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
    }, [servicos])

    const clientesVisiveis = useMemo(() => {
        const termo = pesquisaCliente.trim().toLowerCase()
        if (!termo) return clientes

        return clientes.filter((cliente) => {
            const nome = `${cliente.nome || ""} ${cliente.apelido || ""}`.toLowerCase()
            const telefone = String(cliente.telefone || "")
            return nome.includes(termo)
                || telefone.includes(termo)
                || String(cliente.id) === String(clienteId)
        })
    }, [clientes, pesquisaCliente, clienteId])

    const limparErro = (campo) => {
        if (errors[campo]) {
            setErrors((anteriores) => ({ ...anteriores, [campo]: null }));
        }
        if (error) setError(null);
    };

    function handleClienteChange(value) {
        setClienteId(value);
        limparErro("cliente_id");
    }

    function handleCategoriaChange(index, categoriaId) {
        setItens((anteriores) => anteriores.map((item, i) => (
            i === index
                ? { ...item, categoria_id: categoriaId, servico_id: "", preco_praticado: "" }
                : item
        )));
        limparErro(`servico_${index}`);
        limparErro(`preco_${index}`);
    }

    function handleItemChange(index, campo, value) {
        setItens((anteriores) => anteriores.map((item, i) => (
            i === index ? { ...item, [campo]: value } : item
        )));
        limparErro(campo === "preco_praticado" ? `preco_${index}` : `${campo}_${index}`);
    }

    function handleServicoChange(index, servicoId) {
        const servico = servicos.find((s) => String(s.id) === servicoId);

        setItens((anteriores) => anteriores.map((item, i) => (
            i === index
                ? {
                    ...item,
                    servico_id: servicoId,
                    preco_praticado: servico ? String(servico.valor) : ""
                }
                : item
        )));

        limparErro(`servico_${index}`);
        limparErro(`preco_${index}`);
    }

    function adicionarItem() {
        setItens((anteriores) => [...anteriores, itemVazio()]);
    }

    function removerItem(index) {
        setItens((anteriores) => {
            if (anteriores.length === 1) return [itemVazio()];
            return anteriores.filter((_, i) => i !== index);
        });
        setErrors({});
    }

    async function handleNovoCliente(clienteCriado) {
        setIsClientModalOpen(false);

        if (clienteCriado?.id) {
            setClienteId(String(clienteCriado.id));
            setPesquisaCliente("");
        }

        try {
            const res = await getClientes();
            const lista = Array.isArray(res.data) ? res.data : (res.data?.clientes || []);
            setClientes(lista.filter((c) => c.estado === "Ativo"));
        } catch (err) {
            setError(getApiError(err));
        }
    }

    const total = useMemo(() => (
        itens.reduce((acc, item) => acc + (Number(item.preco_praticado) || 0), 0)
    ), [itens]);

    const valorPagamentoAtual = pagamentoManual
        ? pagamento.valor
        : (total > 0 ? String(total) : "");
    const valorPago = Math.max(Number(valorPagamentoAtual) || 0, 0);
    const saldo = Math.max(total - valorPago, 0);
    const clienteSelecionado = clientes.find((cliente) => String(cliente.id) === String(clienteId));
    const itensComServico = itens.filter((item) => item.servico_id);
    const fidelizacao = clienteId && String(fidelizacaoCarregada.clienteId) === String(clienteId)
        ? fidelizacaoCarregada.dados
        : null;
    const carregandoFidelizacao = Boolean(clienteId)
        && String(fidelizacaoCarregada.clienteId) !== String(clienteId);

    const temServicoElegivel = useMemo(() => (
        itens.some((item) => {
            const servico = servicos.find((s) => String(s.id) === String(item.servico_id));
            return !!servico?.elegivel_fidelizacao;
        })
    ), [itens, servicos]);

    function alterarPagamento(campo, valor) {
        setPagamento((anterior) => ({ ...anterior, [campo]: valor }));
        if (campo === "valor") setPagamentoManual(true);
        limparErro("pagamento");
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        const erros = validarAtendimento({ cliente_id: clienteId, servicos: itens });

        if (podePagar) {
            if (Number(valorPagamentoAtual) < 0) {
                erros.pagamento = "O valor pago nao pode ser negativo";
            } else if (valorPago > total) {
                erros.pagamento = "O valor pago nao pode exceder o total do atendimento";
            } else if (valorPago > 0 && !pagamento.metodo) {
                erros.pagamento = "Selecione a forma de pagamento";
            }
        }

        setErrors(erros);
        if (Object.keys(erros).length > 0) return;

        setError(null);
        setConfirmOpen(true);
    }

    async function confirmarRegisto() {
        if (loading) return;

        setLoading(true);
        setError(null);
        setSucesso(null);

        try {
            const payload = {
                cliente_id: Number(clienteId),
                servicos: itens.map((item) => ({
                    servico_id: Number(item.servico_id),
                    funcionario_id: Number(item.funcionario_id),
                    preco_praticado: Number(item.preco_praticado),
                    desconto: 0
                }))
            };

            const resposta = await createAtendimento(payload);
            const novoAtendimento = resposta.data;
            let avisoPagamento = "";

            if (podePagar && valorPago > 0 && novoAtendimento?.id) {
                try {
                    await registrarPagamento(novoAtendimento.id, {
                        parcelas: [{
                            metodo_pagamento: pagamento.metodo,
                            valor: valorPago
                        }]
                    });
                } catch (err) {
                    avisoPagamento = ` O atendimento foi registado, mas o pagamento falhou: ${getApiError(err)}. Pode registar o pagamento no detalhe.`;
                }
            }

            setLoading(false);
            setConfirmOpen(false);
            setSucesso(
                valorPago > 0 && !avisoPagamento
                    ? "Atendimento e pagamento registados com sucesso"
                    : `Atendimento registado com sucesso.${avisoPagamento}`
            );

            if (onSuccess) onSuccess();

            setTimeout(() => {
                setSucesso(null);
                onclose();
            }, avisoPagamento ? 2600 : 1400);
        } catch (err) {
            setLoading(false);
            setConfirmOpen(false);
            const field = getApiErrorField(err);
            const msg = getApiError(err);
            if (field) {
                setErrors((anteriores) => ({ ...anteriores, [field]: msg }));
            } else {
                setError(msg);
            }
        }
    }

    return (
        <div className="modal-backdrop" onClick={onclose}>
            <section
                className="new-mark-modal open"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="header-modal">
                    <p className="Modal-Icon">
                        <CalendarPlus />
                    </p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>Novo Atendimento</strong>
                            <span>Registe os servicos, o pagamento e a fidelizacao num so fluxo</span>
                        </p>
                    </div>
                    <p className="plusIcon"><X onClick={onclose} /></p>
                </header>

                {sucesso && (
                    <div className="success-banner">
                        <CheckCircle2 size={17} />
                        <span>{sucesso}</span>
                    </div>
                )}

                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                    </div>
                )}

                <form className="nm-form" onSubmit={handleSubmit}>
                    <div className="nm-body">
                        <div className="nm-section">
                            <div className="nm-section-title">
                                <UserRound size={18} />
                                <span>Cliente</span>
                            </div>

                            {carregandoDados ? (
                                <p className="nm-hint">A carregar dados...</p>
                            ) : clientes.length === 0 ? (
                                <p className="nm-hint">Nenhum cliente registado. Cadastre o primeiro abaixo.</p>
                            ) : (
                                <>
                                    <input
                                        type="search"
                                        className="nm-select nm-client-search"
                                        placeholder="Pesquisar cliente por nome ou telefone..."
                                        value={pesquisaCliente}
                                        onChange={(e) => setPesquisaCliente(e.target.value)}
                                        aria-label="Pesquisar cliente por nome ou telefone"
                                    />
                                    <select
                                        className={`nm-select ${errors.cliente_id ? "input-invalido" : ""}`}
                                        value={clienteId}
                                        onChange={(e) => handleClienteChange(e.target.value)}
                                        aria-invalid={errors.cliente_id ? "true" : undefined}
                                    >
                                        <option value="">Selecione o cliente...</option>
                                        {clientesVisiveis.length === 0 && (
                                            <option value="" disabled>Nenhum cliente encontrado</option>
                                        )}
                                        {clientesVisiveis.map((cliente) => (
                                            <option key={cliente.id} value={cliente.id}>
                                                {cliente.nome} {cliente.apelido || ""} - {cliente.telefone}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {clienteSelecionado && (
                                <p className="nm-hint">
                                    {clienteSelecionado.telefone}
                                    {clienteSelecionado.endereco ? ` · ${clienteSelecionado.endereco}` : ""}
                                </p>
                            )}

                            {errors.cliente_id && (
                                <span className="field-error" role="alert">{errors.cliente_id}</span>
                            )}

                            <button
                                type="button"
                                className="nm-secondary-btn"
                                onClick={() => setIsClientModalOpen(true)}
                            >
                                <PlusIcon size={16} />
                                Cadastrar novo cliente
                            </button>
                        </div>

                        <div className="nm-section nm-section-wide">
                            <div className="nm-section-title">
                                <ScissorsIcon size={18} />
                                <span>Servicos e funcionarios</span>
                            </div>

                            {servicos.length === 0 && !carregandoDados && (
                                <p className="nm-hint">
                                    Nenhum servico activo. Registe um servico antes de criar atendimentos.
                                </p>
                            )}

                            {itens.map((item, index) => {
                                const servicoSelecionado = servicos.find((s) => String(s.id) === String(item.servico_id));
                                const servicosDoItem = servicos.filter((servico) => (
                                    String(servico.categoria_id) === String(item.categoria_id)
                                ));
                                return (
                                    <div className="nm-item" key={index}>
                                        <div className="nm-item-fields">
                                            <div className="nm-field">
                                                <label>Categoria</label>
                                                <select
                                                    className="nm-select"
                                                    value={item.categoria_id}
                                                    onChange={(e) => handleCategoriaChange(index, e.target.value)}
                                                >
                                                    <option value="">Selecione a categoria...</option>
                                                    {categoriasServicos.map((categoria) => (
                                                        <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="nm-field">
                                                <label>Servico</label>
                                                <select
                                                    className={`nm-select ${errors[`servico_${index}`] ? "input-invalido" : ""}`}
                                                    value={item.servico_id}
                                                    onChange={(e) => handleServicoChange(index, e.target.value)}
                                                    disabled={!item.categoria_id || servicosDoItem.length === 0}
                                                >
                                                    <option value="">
                                                        {!item.categoria_id
                                                            ? "Escolha primeiro a categoria"
                                                            : servicosDoItem.length === 0
                                                                ? "Sem servicos nesta categoria"
                                                                : "Selecione o servico..."}
                                                    </option>
                                                    {servicosDoItem.map((servico) => (
                                                        <option key={servico.id} value={servico.id}>
                                                            {servico.nome} ({Number(servico.valor).toLocaleString("pt-MZ")} MT){servico.elegivel_fidelizacao ? " · fidelizacao" : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`servico_${index}`] && (
                                                    <span className="field-error" role="alert">
                                                        {errors[`servico_${index}`]}
                                                    </span>
                                                )}
                                                {servicoSelecionado?.elegivel_fidelizacao && (
                                                    <span className="nm-loyalty-tag">
                                                        <Heart size={12} /> Conta para fidelizacao
                                                    </span>
                                                )}
                                            </div>

                                            <div className="nm-field">
                                                <label>Funcionario</label>
                                                <select
                                                    className={`nm-select ${errors[`funcionario_${index}`] ? "input-invalido" : ""}`}
                                                    value={item.funcionario_id}
                                                    onChange={(e) => handleItemChange(index, "funcionario_id", e.target.value)}
                                                >
                                                    <option value="">Selecione o funcionario...</option>
                                                    {funcionarios.map((funcionario) => (
                                                        <option key={funcionario.id} value={funcionario.id}>
                                                            {funcionario.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`funcionario_${index}`] && (
                                                    <span className="field-error" role="alert">
                                                        {errors[`funcionario_${index}`]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="nm-field nm-field-price">
                                                <label>Valor (MT)</label>
                                                <input
                                                    type="number"
                                                    className={errors[`preco_${index}`] ? "input-invalido" : ""}
                                                    min="1"
                                                    step="1"
                                                    value={item.preco_praticado}
                                                    onChange={(e) => handleItemChange(index, "preco_praticado", e.target.value)}
                                                />
                                                {errors[`preco_${index}`] && (
                                                    <span className="field-error" role="alert">
                                                        {errors[`preco_${index}`]}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="nm-remove-btn"
                                                onClick={() => removerItem(index)}
                                                title="Remover servico"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                className="nm-secondary-btn"
                                onClick={adicionarItem}
                                disabled={servicos.length === 0}
                            >
                                <PlusIcon size={16} />
                                Adicionar outro servico
                            </button>

                            {errors.servicos && (
                                <span className="field-error" role="alert">{errors.servicos}</span>
                            )}
                        </div>

                        {clienteId && (
                            <div className="nm-section nm-section-wide">
                                <div className="nm-section-title">
                                    <Heart size={18} />
                                    <span>Fidelizacao</span>
                                </div>
                                <FidelizacaoCard fidelizacao={fidelizacao} loading={carregandoFidelizacao} />
                                {temServicoElegivel && (
                                    <p className="nm-hint">
                                        Este atendimento inclui servico elegivel: a marca sera registada automaticamente
                                        (uma marca por cliente por dia).
                                    </p>
                                )}
                            </div>
                        )}

                        {podePagar && (
                            <div className="nm-section nm-section-wide">
                                <div className="nm-section-title">
                                    <CreditCard size={18} />
                                    <span>Pagamento</span>
                                </div>

                                <div className="nm-payment-grid">
                                    <div className="nm-field">
                                        <label>Forma de pagamento</label>
                                        <select
                                            className="nm-select"
                                            value={pagamento.metodo}
                                            onChange={(e) => alterarPagamento("metodo", e.target.value)}
                                        >
                                            {FORMAS_PAGAMENTO.map((forma) => (
                                                <option key={forma} value={forma}>{forma}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="nm-field">
                                        <label>Valor pago agora (MT)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={total || undefined}
                                            step="1"
                                            value={valorPagamentoAtual}
                                            onChange={(e) => alterarPagamento("valor", e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                </div>

                                <div className={`nm-payment-balance ${saldo > 0 ? "pending" : "settled"}`}>
                                    <Wallet size={16} />
                                    {valorPago <= 0
                                        ? "Pagamento depois: o atendimento fica pendente."
                                        : saldo > 0
                                            ? `${valorPago.toLocaleString("pt-MZ")} MT pagos · faltam ${saldo.toLocaleString("pt-MZ")} MT.`
                                            : "Pagamento total: o atendimento fica liquidado."}
                                </div>

                                {errors.pagamento && (
                                    <span className="field-error" role="alert">{errors.pagamento}</span>
                                )}
                            </div>
                        )}

                    </div>

                    <footer className="nm-footer">
                        <div className="nm-total">
                            <Receipt size={20} />
                            <span>Total do atendimento</span>
                            <strong>{total.toLocaleString("pt-MZ")} MT</strong>
                        </div>

                        <div className="nm-footer-actions">
                            <button type="button" className="nm-cancel-btn" onClick={onclose}>
                                Cancelar
                            </button>
                            <button type="submit" className="submit-btn" disabled={loading || carregandoDados}>
                                {loading ? "A registar..." : "Confirmar Atendimento"}
                            </button>
                        </div>
                    </footer>
                </form>

                {confirmOpen && (
                    <div
                        className="nm-confirm-layer"
                        onClick={() => {
                            if (!loading) setConfirmOpen(false);
                        }}
                    >
                        <section className="nm-confirm-modal" onClick={(e) => e.stopPropagation()}>
                            <header className="nm-confirm-header">
                                <span className="nm-confirm-icon"><CheckCircle2 size={21} /></span>
                                <div>
                                    <h2>Confirmar atendimento</h2>
                                    <p>Reveja todas as informacoes antes de registar.</p>
                                </div>
                                <button
                                    type="button"
                                    className="nm-confirm-close"
                                    onClick={() => setConfirmOpen(false)}
                                    disabled={loading}
                                    aria-label="Fechar confirmacao"
                                >
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="nm-confirm-body">
                                <div className="nm-summary-grid">
                                    <div className="nm-summary-row">
                                        <span>Cliente</span>
                                        <strong>
                                            {clienteSelecionado
                                                ? `${clienteSelecionado.nome} ${clienteSelecionado.apelido || ""}`.trim()
                                                : "Por selecionar"}
                                        </strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Telefone</span>
                                        <strong>{clienteSelecionado?.telefone || "-"}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Servicos</span>
                                        <strong>{itensComServico.length}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Total</span>
                                        <strong>{total.toLocaleString("pt-MZ")} MT</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Pagamento</span>
                                        <strong>
                                            {!podePagar
                                                ? "Sem permissao para registar"
                                                : valorPago <= 0
                                                    ? "Pendente"
                                                    : `${pagamento.metodo} · ${valorPago.toLocaleString("pt-MZ")} MT`}
                                        </strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Fidelizacao</span>
                                        <strong>
                                            {fidelizacao?.cartao
                                                ? `${fidelizacao.marcas_no_ciclo}/${fidelizacao.meta} marcas`
                                                : "Sem cartao ativo"}
                                        </strong>
                                    </div>
                                </div>

                                {itensComServico.length > 0 && (
                                    <ul className="nm-summary-services">
                                        {itensComServico.map((item, index) => {
                                            const servico = servicos.find((s) => String(s.id) === String(item.servico_id));
                                            const funcionario = funcionarios.find((f) => String(f.id) === String(item.funcionario_id));
                                            return (
                                                <li key={index}>
                                                    <span>
                                                        <strong>{servico?.nome || "Servico"}</strong>
                                                        <small>{servico?.categoria_nome || "Sem categoria"}</small>
                                                    </span>
                                                    <span>{funcionario?.nome || "Sem funcionario"}</span>
                                                    <strong>{Number(item.preco_praticado || 0).toLocaleString("pt-MZ")} MT</strong>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                <div className={`nm-payment-balance ${saldo > 0 ? "pending" : "settled"}`}>
                                    <Wallet size={16} />
                                    {!podePagar
                                        ? "Sem permissao para registar pagamento; o atendimento fica pendente."
                                        : valorPago <= 0
                                            ? `Pagamento pendente: faltam ${total.toLocaleString("pt-MZ")} MT.`
                                            : saldo > 0
                                                ? `${valorPago.toLocaleString("pt-MZ")} MT pagos · faltam ${saldo.toLocaleString("pt-MZ")} MT.`
                                                : "Pagamento total: o atendimento fica liquidado."}
                                </div>

                                {temServicoElegivel && (
                                    <p className="nm-hint">
                                        Este atendimento inclui servico elegivel. A marca de fidelizacao do cliente
                                        sera registada automaticamente (uma por cliente por dia).
                                    </p>
                                )}
                            </div>

                            <footer className="nm-confirm-footer">
                                <button
                                    type="button"
                                    className="nm-cancel-btn"
                                    onClick={() => setConfirmOpen(false)}
                                    disabled={loading}
                                >
                                    Voltar e editar
                                </button>
                                <button
                                    type="button"
                                    className="submit-btn"
                                    onClick={confirmarRegisto}
                                    disabled={loading}
                                >
                                    {loading ? "A registar..." : "Confirmar e registar"}
                                </button>
                            </footer>
                        </section>
                    </div>
                )}

                {isClientModalOpen && (
                    <div className="nm-client-layer">
                        <ClientModal
                            onclose={() => setIsClientModalOpen(false)}
                            onSuccess={handleNovoCliente}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

export default NewMarkModal;
