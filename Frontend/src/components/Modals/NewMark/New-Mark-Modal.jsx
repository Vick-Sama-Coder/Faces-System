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
    Gift,
    CheckCircle2,
    Wallet,
    Tag,
    Layers,
    Minus,
    Percent,
    ChevronDown,
    ChevronUp,
    UserCheck,
    UserX
} from "lucide-react";
import {
    createAtendimento,
    registrarPagamento,
    getClientes,
    getServicos,
    getFuncionarios,
    getFidelizacao,
    getServicoModalidades,
    getServicoAplicacoes,
    aplicarDesconto,
    getApiError,
    getApiErrorField
} from "../../../services/api.js";
import {
    LIMITE_FIDELIZACAO,
    servicoContaParaFidelizacao,
    validarAtendimento
} from "../../../utils/validacoes.js";
import { useAuthStore } from "../../../store/authStore.js";
import ClientModal from "../ClientModal/ClientModal.jsx";
import FidelizacaoCard from "../../FidelizacaoCard/FidelizacaoCard.jsx";
import './New-Mark-Modal.css'

const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"];

const itemVazio = () => ({
    categoria_id: "",
    servico_id: "",
    servico_principal_id: null,
    funcionario_id: "",
    modalidade_id: "",
    modalidade_nome: "",
    tipo_servico: "Servico",
    preco_praticado: "",
    usar_beneficio_fidelizacao: false
});

function itemPodeSerGratuito(item, servico) {
    const preco = Number(item?.preco_praticado);
    return servicoContaParaFidelizacao(servico)
        && Number.isFinite(preco)
        && preco > 0
        && preco <= LIMITE_FIDELIZACAO;
}

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

    // Cache de modalidades e aplicações por servico
    const [modalidadesCache, setModalidadesCache] = useState({});
    const [aplicacoesCache, setAplicacoesCache] = useState({});

    // Descontos
    const [descontos, setDescontos] = useState([]);
    const [showDescontoModal, setShowDescontoModal] = useState(false);
    const [descontoForm, setDescontoForm] = useState({
        escopo: "Servico",
        tipo: "Percentagem",
        percentagem: "",
        valor_desconto: "",
        atendimento_servico_id: "",
        valor_bruto: ""
    });

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
                setServicos(listaServicos.filter((s) => s.estado === "Ativo" && s.tipo_servico === "Servico"));
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

    // Carregar modalidades quando um servico e selecionado
    useEffect(() => {
        const servicoIds = [...new Set(itens.map(i => i.servico_id).filter(Boolean))];
        servicoIds.forEach(async (id) => {
            if (!modalidadesCache[id]) {
                try {
                    const res = await getServicoModalidades(id);
                    const lista = Array.isArray(res.data) ? res.data : [];
                    setModalidadesCache(prev => ({ ...prev, [id]: lista }));
                } catch (err) {
                    console.error("Erro ao carregar modalidades:", err);
                }
            }
        });
    }, [itens, modalidadesCache]);

    // Carregar aplicações quando um servico que permite aplicações é selecionado
    useEffect(() => {
        const servicoIds = [...new Set(itens.filter(i => i.tipo_servico === 'Servico').map(i => i.servico_id).filter(Boolean))];
        servicoIds.forEach(async (id) => {
            const servico = servicos.find(s => String(s.id) === String(id));
            if (servico?.permite_aplicacoes && !aplicacoesCache[id]) {
                try {
                    const res = await getServicoAplicacoes(id);
                    const lista = Array.isArray(res.data) ? res.data : [];
                    setAplicacoesCache(prev => ({ ...prev, [id]: lista }));
                } catch (err) {
                    console.error("Erro ao carregar aplicações:", err);
                }
            }
        });
    }, [itens, servicos, aplicacoesCache]);

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
        setItens((anteriores) => anteriores.map((item) => ({
            ...item,
            usar_beneficio_fidelizacao: false
        })));
        limparErro("cliente_id");
    }

    function handleCategoriaChange(index, categoriaId) {
        setItens((anteriores) => anteriores.map((item, i) => (
            i === index
                ? { ...item, categoria_id: categoriaId, servico_id: "", modalidade_id: "", modalidade_nome: "", preco_praticado: "", usar_beneficio_fidelizacao: false }
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
                    tipo_servico: servico?.tipo_servico || "Servico",
                    preco_praticado: servico ? String(servico.valor) : "",
                    modalidade_id: "",
                    modalidade_nome: "",
                    servico_principal_id: null,
                    usar_beneficio_fidelizacao: false
                }
                : item
        )));

        limparErro(`servico_${index}`);
        limparErro(`preco_${index}`);
    }

    function handleModalidadeChange(index, modalidadeId) {
        const servico = itens[index];
        const modalidades = modalidadesCache[servico.servico_id] || [];
        const modalidade = modalidades.find(m => String(m.id) === String(modalidadeId));

        setItens((anteriores) => anteriores.map((item, i) => (
            i === index
                ? {
                    ...item,
                    modalidade_id: modalidadeId,
                    modalidade_nome: modalidade?.nome || "",
                    preco_praticado: modalidade ? String(modalidade.valor) : item.preco_praticado
                }
                : item
        )));
        limparErro(`preco_${index}`);
    }

    function adicionarItem() {
        setItens((anteriores) => [...anteriores, itemVazio()]);
    }

    function removerItem(index) {
        setItens((anteriores) => {
            if (anteriores.length === 1) return [itemVazio()];
            const novo = anteriores.filter((_, i) => i !== index);
            // Se removeu um servico principal, remover aplicações associadas
            const removido = anteriores[index];
            if (removido.tipo_servico === 'Servico') {
                return novo.filter(item => item.servico_principal_id !== String(removido.id) && item.servico_principal_id !== removido.id);
            }
            return novo;
        });
        setErrors({});
    }

    function adicionarAplicacao(servicoPrincipalId, aplicacao) {
        setItens((anteriores) => [...anteriores, {
            ...itemVazio(),
            servico_id: aplicacao.id,
            servico_principal_id: servicoPrincipalId,
            funcionario_id: anteriores.find(a => String(a.servico_id) === String(servicoPrincipalId))?.funcionario_id || "",
            tipo_servico: "Aplicacao",
            preco_praticado: String(aplicacao.valor)
        }]);
    }

    function removerAplicacao(aplicacaoId, servicoPrincipalId) {
        setItens((anteriores) => anteriores.filter((item, i) =>
            !(String(item.servico_id) === String(aplicacaoId) && String(item.servico_principal_id) === String(servicoPrincipalId))
        ));
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
        itens.reduce((acc, item) => (
            acc + (item.usar_beneficio_fidelizacao ? 0 : (Number(item.preco_praticado) || 0))
        ), 0)
    ), [itens]);

    const totalDescontos = useMemo(() => (
        descontos.reduce((acc, d) => acc + (Number(d.valor_desconto) || 0), 0)
    ), [descontos]);

    const totalComDescontos = total - totalDescontos;
    const valorPagamentoAtual = pagamentoManual
        ? pagamento.valor
        : (totalComDescontos > 0 ? String(totalComDescontos) : "");
    const valorPago = Math.max(Number(valorPagamentoAtual) || 0, 0);
    const saldo = Math.max(totalComDescontos - valorPago, 0);
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
            return !item.usar_beneficio_fidelizacao && servicoContaParaFidelizacao(servico);
        })
    ), [itens, servicos]);

    const beneficiosDisponiveis = Number(fidelizacao?.beneficios_disponiveis) || 0;
    const temServicoGratuito = itens.some((item) => item.usar_beneficio_fidelizacao);

    function alternarBeneficio(index) {
        setItens((anteriores) => anteriores.map((item, i) => (
            i === index
                ? { ...item, usar_beneficio_fidelizacao: !item.usar_beneficio_fidelizacao }
                : { ...item, usar_beneficio_fidelizacao: false }
        )));
        limparErro("servicos");
    }

    function alterarPagamento(campo, valor) {
        setPagamento((anterior) => ({ ...anterior, [campo]: valor }));
        if (campo === "valor") setPagamentoManual(true);
        limparErro("pagamento");
    }

    // Descontos
    function abrirDescontoModal(item = null) {
        if (item) {
            setDescontoForm({
                escopo: "Servico",
                tipo: "Percentagem",
                percentagem: "",
                valor_desconto: "",
                atendimento_servico_id: item.id,
                valor_bruto: String(item.preco_praticado)
            });
        } else {
            setDescontoForm({
                escopo: "Atendimento",
                tipo: "Percentagem",
                percentagem: "",
                valor_desconto: "",
                atendimento_servico_id: "",
                valor_bruto: String(total)
            });
        }
        setShowDescontoModal(true);
    }

    function fecharDescontoModal() {
        setShowDescontoModal(false);
        setDescontoForm({
            escopo: "Servico",
            tipo: "Percentagem",
            percentagem: "",
            valor_desconto: "",
            atendimento_servico_id: "",
            valor_bruto: ""
        });
    }

    function handleDescontoChange(campo, value) {
        setDescontoForm(prev => ({ ...prev, [campo]: value }));
    }

    function handleAplicarDesconto(e) {
        e.preventDefault();
        const { escopo, tipo, percentagem, valor_desconto, atendimento_servico_id, valor_bruto } = descontoForm;

        let valorDescontoNum = Number(valor_desconto) || 0;
        const valorBrutoNum = Number(valor_bruto) || 0;

        if (tipo === "Percentagem" && percentagem) {
            const perc = Number(percentagem);
            if (perc < 0 || perc > 100) {
                setErrors({ desconto: "Percentagem deve estar entre 0 e 100" });
                return;
            }
            valorDescontoNum = Math.round(valorBrutoNum * perc / 100);
        }

        if (valorDescontoNum <= 0) {
            setErrors({ desconto: "Valor do desconto deve ser maior que zero" });
            return;
        }
        if (valorDescontoNum > valorBrutoNum) {
            setErrors({ desconto: "Desconto não pode exceder o valor elegível" });
            return;
        }

        const novoDesconto = {
            ...descontoForm,
            valor_desconto: valorDescontoNum,
            valor_final: valorBrutoNum - valorDescontoNum
        };

        setDescontos(prev => [...prev, novoDesconto]);
        fecharDescontoModal();
        setErrors({});
    }

    function removerDesconto(index) {
        setDescontos(prev => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        const erros = validarAtendimento({ cliente_id: clienteId, servicos: itens });

        if (beneficiosDisponiveis > 0 && temServicoElegivel && !temServicoGratuito) {
            erros.servicos = "O cartão está completo (5/5). Selecione o serviço que será o 6.º gratuito.";
        }

        if (podePagar) {
            if (Number(valorPagamentoAtual) < 0) {
                erros.pagamento = "O valor pago nao pode ser negativo";
            } else if (valorPago > totalComDescontos) {
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
            // Preparar servicos com modalidades, aplicações e benefício
            const servicosParaEnviar = itens.map((item) => {
                const base = {
                    servico_id: Number(item.servico_id),
                    funcionario_id: Number(item.funcionario_id),
                    preco_praticado: Number(item.preco_praticado),
                    desconto: 0,
                    usar_beneficio_fidelizacao: item.usar_beneficio_fidelizacao === true,
                    tipo_servico: item.tipo_servico
                };

                if (item.modalidade_id) base.modalidade_id = Number(item.modalidade_id);
                if (item.modalidade_nome) base.modalidade_nome = item.modalidade_nome;
                if (item.servico_principal_id) base.servico_principal_id = Number(item.servico_principal_id);

                return base;
            });

            const payload = {
                cliente_id: Number(clienteId),
                servicos: servicosParaEnviar
            };

            const resposta = await createAtendimento(payload);
            const novoAtendimento = resposta.data;
            const usouBeneficio = payload.servicos.some((item) => item.usar_beneficio_fidelizacao);
            let avisoPagamento = "";

            // Actualiza o cartão dentro do próprio modal antes de fechar
            if (novoAtendimento?.fidelizacao) {
                setFidelizacaoCarregada({
                    clienteId: String(clienteId),
                    dados: novoAtendimento.fidelizacao
                });
            }

            // Aplicar descontos se houver
            if (descontos.length > 0 && novoAtendimento?.id) {
                for (const desconto of descontos) {
                    try {
                        await aplicarDesconto(novoAtendimento.id, {
                            atendimento_servico_id: Number(desconto.atendimento_servico_id) || (novoAtendimento.servicos?.[0]?.id),
                            escopo: desconto.escopo,
                            tipo: desconto.tipo,
                            percentagem: desconto.tipo === "Percentagem" ? Number(desconto.percentagem) : undefined,
                            valor_bruto: Number(desconto.valor_bruto),
                            valor_desconto: Number(desconto.valor_desconto),
                            valor_final: Number(desconto.valor_final)
                        }, user.id);
                    } catch (err) {
                        console.error("Erro ao aplicar desconto:", err);
                    }
                }
            }

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
                usouBeneficio
                    ? `6.º serviço gratuito registado. O cartão reiniciou em 0/${Number(novoAtendimento?.fidelizacao?.meta) || 5}.${avisoPagamento}`
                    : novoAtendimento?.valor_total === 0
                        ? "Atendimento gratuito registado com sucesso"
                        : valorPago > 0 && !avisoPagamento
                            ? "Atendimento e pagamento registados com sucesso"
                            : `Atendimento registado com sucesso.${avisoPagamento}`
            );

            if (onSuccess) onSuccess();

            setTimeout(() => {
                setSucesso(null);
                onclose();
            }, avisoPagamento ? 2600 : usouBeneficio ? 2200 : 1400);
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
                                    {clienteSelecionado.idade ? ` · Idade: ${clienteSelecionado.idade} anos` : ""}
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
                                const modalidades = modalidadesCache[item.servico_id] || [];
                                const aplicacoes = servicoSelecionado?.permite_aplicacoes ? (aplicacoesCache[item.servico_id] || []) : [];
                                const aplicacoesAssociadas = itens.filter(a =>
                                    a.tipo_servico === 'Aplicacao' &&
                                    String(a.servico_principal_id) === String(item.servico_id)
                                );
                                const isServicoPrincipal = item.tipo_servico === 'Servico';
                                const contaParaFidelizacao = servicoContaParaFidelizacao(servicoSelecionado);
                                const podeUsarBeneficio = beneficiosDisponiveis > 0
                                    && itemPodeSerGratuito(item, servicoSelecionado);

                                return (
                                    <div className={`nm-item ${item.usar_beneficio_fidelizacao ? "free" : ""}`} key={index}>
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
                                                <label>{isServicoPrincipal ? 'Serviço' : 'Aplicação'}</label>
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
                                                                : isServicoPrincipal ? "Selecione o servico..." : "Selecione a aplicação..."}
                                                    </option>
                                                    {isServicoPrincipal ? servicosDoItem.map((servico) => (
                                                        <option key={servico.id} value={servico.id}>
                                                            {servico.nome} ({Number(servico.valor).toLocaleString("pt-MZ")} MT){servico.elegivel_fidelizacao ? " · fidelizacao" : ""}
                                                        </option>
                                                    )) : servicos.filter(s => s.tipo_servico === 'Aplicacao' && s.estado === 'Ativo').map((aplicacao) => (
                                                        <option key={aplicacao.id} value={aplicacao.id}>
                                                            {aplicacao.nome} ({Number(aplicacao.valor).toLocaleString("pt-MZ")} MT)
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`servico_${index}`] && (
                                                    <span className="field-error" role="alert">
                                                        {errors[`servico_${index}`]}
                                                    </span>
                                                )}
                                                {(contaParaFidelizacao || isServicoPrincipal) && servicoSelecionado?.elegivel_fidelizacao && !item.usar_beneficio_fidelizacao && (
                                                    <span className="nm-loyalty-tag">
                                                        <Heart size={12} /> Conta para fidelizacao
                                                    </span>
                                                )}
                                                {item.usar_beneficio_fidelizacao && (
                                                    <span className="nm-loyalty-tag free">
                                                        <Gift size={12} /> 6.º serviço grátis
                                                    </span>
                                                )}
                                            </div>

                                            {isServicoPrincipal && modalidades.length > 0 && (
                                                <div className="nm-field">
                                                    <label>Modalidade</label>
                                                    <select
                                                        className="nm-select"
                                                        value={item.modalidade_id}
                                                        onChange={(e) => handleModalidadeChange(index, e.target.value)}
                                                    >
                                                        <option value="">Usar preço base</option>
                                                        {modalidades.map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.nome} ({m.faixa_etaria}) - {Number(m.valor).toLocaleString("pt-MZ")} MT
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {item.modalidade_nome && (
                                                        <span className="nm-hint">Modalidade: {item.modalidade_nome}</span>
                                                    )}
                                                </div>
                                            )}

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
                                                    min="0"
                                                    step="1"
                                                    value={item.preco_praticado}
                                                    onChange={(e) => handleItemChange(index, "preco_praticado", e.target.value)}
                                                    disabled={item.usar_beneficio_fidelizacao}
                                                />
                                                {item.usar_beneficio_fidelizacao && (
                                                    <span className="nm-free-note">6.º serviço gratuito</span>
                                                )}
                                                {errors[`preco_${index}`] && (
                                                    <span className="field-error" role="alert">
                                                        {errors[`preco_${index}`]}
                                                    </span>
                                                )}
                                            </div>

                                            {isServicoPrincipal && servicoSelecionado?.permite_aplicacoes && aplicacoes.length > 0 && (
                                                <div className="nm-field nm-field-aplicacoes">
                                                    <label>
                                                        <Tag size={14} /> Aplicações associadas
                                                    </label>
                                                    <div className="aplicacoes-inline">
                                                        {aplicacoesAssociadas.length > 0 && (
                                                            <div className="aplicacoes-associadas-lista">
                                                                {aplicacoesAssociadas.map((app, i) => (
                                                                    <span key={i} className="aplicacao-tag">
                                                                        {app.preco_praticado ? `${app.preco_praticado} MT` : '0 MT'} {servicos.find(s => String(s.id) === String(app.servico_id))?.nome || 'Aplicação'}
                                                                        <button type="button" onClick={() => removerAplicacao(app.servico_id, item.servico_id)} className="btn-remove-inline" title="Remover">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="aplicacoes-disponiveis-inline">
                                                            {aplicacoes.filter(a => !aplicacoesAssociadas.some(aa => String(aa.servico_id) === String(a.id))).map((app) => (
                                                                <button
                                                                    key={app.id}
                                                                    type="button"
                                                                    className="btn-add-aplicacao"
                                                                    onClick={() => adicionarAplicacao(item.servico_id, app)}
                                                                    title="Adicionar aplicação"
                                                                >
                                                                    <Plus size={12} /> {app.nome} ({Number(app.valor).toLocaleString("pt-MZ")} MT)
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="nm-remove-btn"
                                                onClick={() => removerItem(index)}
                                                title={isServicoPrincipal ? "Remover servico (e aplicações)" : "Remover aplicação"}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {clienteId && contaParaFidelizacao && (
                                            <div className="nm-benefit-row">
                                                <button
                                                    type="button"
                                                    className={`nm-benefit-btn ${item.usar_beneficio_fidelizacao ? "active" : ""}`}
                                                    onClick={() => alternarBeneficio(index)}
                                                    disabled={!item.usar_beneficio_fidelizacao && !podeUsarBeneficio}
                                                    title={
                                                        beneficiosDisponiveis <= 0
                                                            ? "O cartão ainda não está completo (5/5)"
                                                            : !podeUsarBeneficio
                                                                ? `O serviço tem de ser elegível e custar até ${LIMITE_FIDELIZACAO} MT`
                                                                : "Marcar este serviço como o 6.º gratuito"
                                                    }
                                                >
                                                    <Gift size={14} />
                                                    {item.usar_beneficio_fidelizacao
                                                        ? "6.º serviço grátis selecionado"
                                                        : "Marcar 6.º serviço como grátis"}
                                                </button>
                                                <span>
                                                    {item.usar_beneficio_fidelizacao
                                                        ? `Este é o único serviço grátis do atendimento (limite ${LIMITE_FIDELIZACAO} MT).`
                                                        : beneficiosDisponiveis > 0
                                                            ? "O cartão está completo (5/5). Escolha apenas um serviço elegível para ser o 6.º gratuito."
                                                            : "O cartão ainda não tem o 6.º serviço gratuito pendente."}
                                                </span>
                                            </div>
                                        )}
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

                        {/* Resumo com descontos */}
                        {(itensComServico.length > 0 || descontos.length > 0) && (
                            <div className="nm-section nm-section-wide">
                                <div className="nm-section-title">
                                    <Receipt size={18} />
                                    <span>Resumo e Descontos</span>
                                </div>

                                <div className="nm-resumo">
                                    <div className="resumo-linha">
                                        <span>Subtotal</span>
                                        <strong>{total.toLocaleString("pt-MZ")} MT</strong>
                                    </div>

                                    {descontos.length > 0 && (
                                        <>
                                            {descontos.map((d, i) => (
                                                <div key={i} className="resumo-linha desconto-linha">
                                                    <span>
                                                        {d.escopo === 'Atendimento' ? 'Desconto no atendimento' : `Desconto: ${itens.find(it => String(it.id) === String(d.atendimento_servico_id) || String(it.servico_id) === String(d.atendimento_servico_id))?.modalidade_nome || itens.find(it => String(it.servico_id) === String(d.atendimento_servico_id))?.nome || 'Serviço'}`}
                                                        {d.tipo === 'Percentagem' && d.percentagem && ` (${d.percentagem}%)`}
                                                    </span>
                                                    <strong>- {Number(d.valor_desconto).toLocaleString("pt-MZ")} MT</strong>
                                                    <button
                                                        type="button"
                                                        className="btn-remove-inline"
                                                        onClick={() => removerDesconto(i)}
                                                        title="Remover desconto"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="resumo-linha total-com-desconto">
                                                <span>Total com descontos</span>
                                                <strong>{totalComDescontos.toLocaleString("pt-MZ")} MT</strong>
                                            </div>
                                        </>
                                    )}

                                    <div className="desconto-acoes">
                                        <button
                                            type="button"
                                            className="nm-secondary-btn"
                                            onClick={() => abrirDescontoModal()}
                                        >
                                            <Percent size={16} /> Desconto no Atendimento
                                        </button>
                                        {itensComServico.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className="nm-secondary-btn"
                                                onClick={() => abrirDescontoModal(item)}
                                            >
                                                <Minus size={16} /> Desconto: {item.modalidade_nome || 'Serviço'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                            max={totalComDescontos || undefined}
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
                            <strong>{totalComDescontos.toLocaleString("pt-MZ")} MT</strong>
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

                {/* Modal de Desconto */}
                {showDescontoModal && (
                    <div className="modal-backdrop" onClick={fecharDescontoModal}>
                        <section className="servico-modal open" onClick={(e) => e.stopPropagation()}>
                            <header className="header-modal">
                                <div className="header-text-modal">
                                    <p className="headerer">
                                        <strong>Aplicar Desconto</strong>
                                        <span>{descontoForm.escopo === 'Atendimento' ? 'Desconto sobre o total do atendimento' : 'Desconto sobre um serviço específico'}</span>
                                    </p>
                                </div>
                                <p className="plusIcon"><X onClick={fecharDescontoModal} /></p>
                            </header>

                            <form onSubmit={handleAplicarDesconto}>
                                <div className="main-content">
                                    <div className="form-group">
                                        <label>Escopo</label>
                                        <select
                                            value={descontoForm.escopo}
                                            onChange={(e) => handleDescontoChange("escopo", e.target.value)}
                                        >
                                            <option value="Servico">Serviço / Aplicação</option>
                                            <option value="Atendimento">Atendimento completo</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Tipo de desconto</label>
                                        <select
                                            value={descontoForm.tipo}
                                            onChange={(e) => handleDescontoChange("tipo", e.target.value)}
                                        >
                                            <option value="Percentagem">Percentagem (%)</option>
                                            <option value="Valor">Valor fixo (MT)</option>
                                        </select>
                                    </div>

                                    {descontoForm.tipo === 'Percentagem' && (
                                        <div className="form-group">
                                            <label>Percentagem (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={descontoForm.percentagem}
                                                onChange={(e) => handleDescontoChange("percentagem", e.target.value)}
                                                placeholder="Ex.: 10"
                                            />
                                        </div>
                                    )}

                                    {descontoForm.tipo === 'Valor' && (
                                        <div className="form-group">
                                            <label>Valor do desconto (MT)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={Number(descontoForm.valor_bruto) || undefined}
                                                step="1"
                                                value={descontoForm.valor_desconto}
                                                onChange={(e) => handleDescontoChange("valor_desconto", e.target.value)}
                                                placeholder="Ex.: 50"
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Valor elegível</label>
                                        <input
                                            type="text"
                                            value={Number(descontoForm.valor_bruto).toLocaleString("pt-MZ") + " MT"}
                                            readOnly
                                        />
                                    </div>

                                    {errors.desconto && (
                                        <span className="field-error" role="alert">{errors.desconto}</span>
                                    )}

                                    <div className="desconto-preview">
                                        <strong>Prévia: Desconto de {descontoForm.tipo === 'Percentagem' ? descontoForm.percentagem + '%' : (Number(descontoForm.valor_desconto) || 0).toLocaleString("pt-MZ") + ' MT'}</strong>
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={loading}
                                    >
                                        <span className="btn-icon">
                                            <CheckCircle2 size={16} />
                                        </span>
                                        Aplicar Desconto
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

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
                                        <span>Subtotal</span>
                                        <strong>{total.toLocaleString("pt-MZ")} MT</strong>
                                    </div>
                                    {totalDescontos > 0 && (
                                        <div className="nm-summary-row">
                                            <span>Descontos</span>
                                            <strong>- {totalDescontos.toLocaleString("pt-MZ")} MT</strong>
                                        </div>
                                    )}
                                    <div className="nm-summary-row">
                                        <span>Total</span>
                                        <strong>{totalComDescontos.toLocaleString("pt-MZ")} MT</strong>
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
                                                        {item.modalidade_nome && <small> · {item.modalidade_nome}</small>}
                                                        <small>{servico?.categoria_nome || "Sem categoria"}</small>
                                                        {item.usar_beneficio_fidelizacao && <span className="nm-loyalty-tag free"><Gift size={10} /> Grátis</span>}
                                                    </span>
                                                    <span>{funcionario?.nome || "Sem funcionario"}</span>
                                                    <strong>{Number(item.preco_praticado || 0).toLocaleString("pt-MZ")} MT</strong>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {descontos.length > 0 && (
                                    <ul className="nm-summary-services">
                                        {descontos.map((d, i) => (
                                            <li key={i} style={{ color: '#e74c3c' }}>
                                                <span>
                                                    {d.escopo === 'Atendimento' ? 'Desconto no atendimento' : 'Desconto no serviço'}
                                                    {d.tipo === 'Percentagem' && d.percentagem && ` (${d.percentagem}%)`}
                                                </span>
                                                <span></span>
                                                <strong>- {Number(d.valor_desconto).toLocaleString("pt-MZ")} MT</strong>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className={`nm-payment-balance ${saldo > 0 ? "pending" : "settled"}`}>
                                    <Wallet size={16} />
                                    {!podePagar
                                        ? "Sem permissao para registar pagamento; o atendimento fica pendente."
                                        : valorPago <= 0
                                            ? `Pagamento pendente: faltam ${totalComDescontos.toLocaleString("pt-MZ")} MT.`
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