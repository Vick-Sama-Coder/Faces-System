import { useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarPlus,
    X,
    UserRound,
    UserPlus,
    PlusIcon,
    Trash2,
    Receipt,
    CreditCard,
    Heart,
    Gift,
    CheckCircle2,
    Wallet,
    Tag
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

let sequenciaUid = 0;

function novoUid() {
    sequenciaUid += 1;
    return `nm-${Date.now()}-${sequenciaUid}`;
}

function criarItem(dados = {}) {
    return {
        uid: novoUid(),
        categoria_id: "",
        servico_id: "",
        servico_nome: "",
        servico_principal_uid: null,
        funcionario_id: "",
        modalidade_id: "",
        modalidade_nome: "",
        tipo_servico: "Servico",
        preco_praticado: "",
        usar_beneficio_fidelizacao: false,
        fidelizacao_selecionada: false,
        ...dados
    };
}

function criarGrupo(dados = {}) {
    return {
        uid: novoUid(),
        cliente_id: "",
        pesquisa: "",
        ...dados,
        itens: dados.itens ?? [criarItem()]
    };
}

function nomeCliente(cliente) {
    return `${cliente?.nome || ""} ${cliente?.apelido || ""}`.trim();
}

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`;
}

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
    const [grupos, setGrupos] = useState(() => [criarGrupo()]);
    const [fidelizacoes, setFidelizacoes] = useState({});
    const [pagamento, setPagamento] = useState({
        metodo: "Dinheiro",
        valor: ""
    });
    const [pagamentoManual, setPagamentoManual] = useState(false);
    const [dataRegisto] = useState(() => new Date());

    const [carregandoDados, setCarregandoDados] = useState(true);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [grupoNovoClienteUid, setGrupoNovoClienteUid] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(null);
    const [error, setError] = useState(null);

    // Cache de modalidades e aplicações por serviço.
    const [modalidadesCache, setModalidadesCache] = useState({});
    const [aplicacoesCache, setAplicacoesCache] = useState({});
    const pedidosModalidades = useRef(new Set());
    const pedidosAplicacoes = useRef(new Set());
    const pedidosFidelizacao = useRef(new Set());
    const montadoRef = useRef(true);

    useEffect(() => {
        montadoRef.current = true;
        return () => { montadoRef.current = false };
    }, []);

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

    const todosItens = useMemo(
        () => grupos.flatMap((grupo) => grupo.itens),
        [grupos]
    );

    const idsModalidades = useMemo(() => (
        [...new Set(todosItens
            .filter((item) => item.tipo_servico === "Servico" && item.servico_id)
            .map((item) => String(item.servico_id)))]
    ), [todosItens]);
    const idsModalidadesKey = idsModalidades.join(",");

    const idsAplicacoes = useMemo(() => (
        [...new Set(todosItens
            .filter((item) => item.tipo_servico === "Servico" && item.servico_id)
            .filter((item) => servicos.find((servico) => (
                String(servico.id) === String(item.servico_id) && servico.permite_aplicacoes
            )))
            .map((item) => String(item.servico_id)))]
    ), [todosItens, servicos]);
    const idsAplicacoesKey = idsAplicacoes.join(",");

    // Carregar modalidades quando um serviço é selecionado.
    useEffect(() => {
        const ids = idsModalidadesKey.split(",").filter(Boolean);

        ids.forEach(async (id) => {
            if (pedidosModalidades.current.has(id)) return;
            pedidosModalidades.current.add(id);

            try {
                const res = await getServicoModalidades(id);
                if (!montadoRef.current) return;
                const lista = Array.isArray(res.data) ? res.data : [];
                setModalidadesCache((prev) => ({ ...prev, [id]: lista }));
            } catch (err) {
                console.error("Erro ao carregar modalidades:", err);
                if (montadoRef.current) setModalidadesCache((prev) => ({ ...prev, [id]: [] }));
            }
        });
    }, [idsModalidadesKey]);

    // Carregar aplicações apenas para serviços que as permitem.
    useEffect(() => {
        const ids = idsAplicacoesKey.split(",").filter(Boolean);

        ids.forEach(async (id) => {
            if (pedidosAplicacoes.current.has(id)) return;
            pedidosAplicacoes.current.add(id);

            try {
                const res = await getServicoAplicacoes(id);
                if (!montadoRef.current) return;
                const lista = Array.isArray(res.data) ? res.data : [];
                setAplicacoesCache((prev) => ({ ...prev, [id]: lista }));
            } catch (err) {
                console.error("Erro ao carregar aplicações:", err);
                if (montadoRef.current) setAplicacoesCache((prev) => ({ ...prev, [id]: [] }));
            }
        });
    }, [idsAplicacoesKey]);

    const idsFidelizacao = useMemo(() => (
        [...new Set(grupos
            .map((grupo) => String(grupo.cliente_id || ""))
            .filter(Boolean))]
    ), [grupos]);
    const idsFidelizacaoKey = idsFidelizacao.join(",");

    // Carregar o cartão de cada cliente. A cache mantém o cartão mesmo que o
    // cliente seja removido e voltado a adicionar.
    useEffect(() => {
        const ids = idsFidelizacaoKey.split(",").filter(Boolean);

        ids.forEach((id) => {
            if (pedidosFidelizacao.current.has(id)) return;
            pedidosFidelizacao.current.add(id);

            setFidelizacoes((prev) => ({
                ...prev,
                [id]: { loading: true, dados: null, erro: null }
            }));

            getFidelizacao(id)
                .then((res) => {
                    if (!montadoRef.current) return;
                    setFidelizacoes((prev) => ({
                        ...prev,
                        [id]: { loading: false, dados: res.data || null, erro: null }
                    }));
                })
                .catch((err) => {
                    if (!montadoRef.current) return;
                    setFidelizacoes((prev) => ({
                        ...prev,
                        [id]: { loading: false, dados: null, erro: getApiError(err) }
                    }));
                });
        });
    }, [idsFidelizacaoKey]);

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

    const clientesPorId = useMemo(() => {
        const mapa = new Map()
        clientes.forEach((cliente) => mapa.set(String(cliente.id), cliente))
        return mapa
    }, [clientes])

    const subtotais = useMemo(() => {
        const valores = new Map()

        grupos.forEach((grupo) => {
            const subtotal = grupo.itens.reduce((acc, item) => (
                acc + (item.usar_beneficio_fidelizacao ? 0 : (Number(item.preco_praticado) || 0))
            ), 0)
            valores.set(grupo.uid, subtotal)
        })

        return valores
    }, [grupos])

    const total = useMemo(() => (
        grupos.reduce((acc, grupo) => acc + (subtotais.get(grupo.uid) || 0), 0)
    ), [grupos, subtotais])

    const valorPagamentoAtual = pagamentoManual
        ? pagamento.valor
        : (total > 0 ? String(total) : "");
    const valorPago = Math.max(Number(valorPagamentoAtual) || 0, 0);
    const saldo = Math.max(total - valorPago, 0);

    const totalServicos = todosItens.filter((item) => item.tipo_servico === "Servico" && item.servico_id).length;
    const totalAplicacoes = todosItens.filter((item) => item.tipo_servico === "Aplicacao" && item.servico_id).length;
    const dataRegistoFormatada = dataRegisto.toLocaleString("pt-MZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    function limparErro(campo) {
        setErrors((anteriores) => {
            if (!anteriores[campo]) return anteriores;
            const proximos = { ...anteriores };
            delete proximos[campo];
            return proximos;
        });
        if (error) setError(null);
    }

    function atualizarGrupo(grupoUid, transformar) {
        setGrupos((anteriores) => anteriores.map((grupo) => (
            grupo.uid === grupoUid ? transformar(grupo) : grupo
        )));
    }

    function clientesVisiveis(grupo) {
        const termo = grupo.pesquisa.trim().toLowerCase()
        const ocupados = new Set(
            grupos
                .filter((outro) => outro.uid !== grupo.uid && outro.cliente_id)
                .map((outro) => String(outro.cliente_id))
        )

        return clientes.filter((cliente) => {
            const id = String(cliente.id)
            if (ocupados.has(id) && id !== String(grupo.cliente_id)) return false

            if (!termo) return true

            const nome = `${cliente.nome || ""} ${cliente.apelido || ""}`.toLowerCase()
            const telefone = String(cliente.telefone || "")
            return nome.includes(termo)
                || telefone.includes(termo)
                || id === String(grupo.cliente_id)
        })
    }

    function handlePesquisaCliente(grupoUid, valor) {
        atualizarGrupo(grupoUid, (grupo) => ({ ...grupo, pesquisa: valor }))
    }

    function handleClienteChange(grupoUid, valor) {
        atualizarGrupo(grupoUid, (grupo) => ({
            ...grupo,
            cliente_id: valor,
            itens: grupo.itens.map((item) => ({
                ...item,
                usar_beneficio_fidelizacao: false,
                fidelizacao_selecionada: false
            }))
        }))
        limparErro(`cliente_${grupoUid}`)
        limparErro("servicos")
    }

    function adicionarCliente() {
        setGrupos((anteriores) => [...anteriores, criarGrupo()])
    }

    function removerCliente(grupoUid) {
        setGrupos((anteriores) => (
            anteriores.length <= 1
                ? anteriores
                : anteriores.filter((grupo) => grupo.uid !== grupoUid)
        ))
        setErrors({})
    }

    function handleCategoriaChange(grupoUid, itemUid, categoriaId) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            return {
                ...grupo,
                itens: grupo.itens
                    .map((item) => (
                        item.uid === itemUid
                            ? {
                                ...item,
                                categoria_id: categoriaId,
                                servico_id: "",
                                servico_nome: "",
                                modalidade_id: "",
                                modalidade_nome: "",
                                preco_praticado: "",
                                usar_beneficio_fidelizacao: false,
                                fidelizacao_selecionada: false
                            }
                            : item
                    ))
                    .filter((item) => item.servico_principal_uid !== itemUid)
            }
        }))

        limparErro(`servico_${itemUid}`)
        limparErro(`preco_${itemUid}`)
    }

    function handleItemChange(grupoUid, itemUid, campo, valor) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            const alvo = grupo.itens.find((item) => item.uid === itemUid)

            return {
                ...grupo,
                itens: grupo.itens.map((item) => {
                    const actualizarAlvo = item.uid === itemUid
                    // A aplicação acompanha o funcionário do serviço principal.
                    const actualizarAplicacao = campo === "funcionario_id"
                        && alvo?.tipo_servico === "Servico"
                        && item.servico_principal_uid === itemUid

                    if (!actualizarAlvo && !actualizarAplicacao) return item
                    return { ...item, [campo]: valor }
                })
            }
        }))

        limparErro(campo === "preco_praticado" ? `preco_${itemUid}` : `${campo}_${itemUid}`)
    }

    function handleServicoChange(grupoUid, itemUid, servicoId) {
        const servico = servicos.find((s) => String(s.id) === String(servicoId));

        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            return {
                ...grupo,
                itens: grupo.itens
                    .map((item) => (
                        item.uid === itemUid
                            ? {
                                ...item,
                                servico_id: servicoId,
                                servico_nome: servico?.nome || "",
                                tipo_servico: servico?.tipo_servico || "Servico",
                                preco_praticado: servico ? String(servico.valor) : "",
                                modalidade_id: "",
                                modalidade_nome: "",
                                usar_beneficio_fidelizacao: false,
                                fidelizacao_selecionada: false
                            }
                            : item
                    ))
                    .filter((item) => item.servico_principal_uid !== itemUid)
            }
        }))

        limparErro(`servico_${itemUid}`)
        limparErro(`preco_${itemUid}`)
        limparErro("servicos")
    }

    function handleModalidadeChange(grupoUid, itemUid, modalidadeId) {
        const item = grupos
            .find((grupo) => grupo.uid === grupoUid)
            ?.itens.find((linha) => linha.uid === itemUid);
        const modalidades = modalidadesCache[String(item?.servico_id)] || [];
        const modalidade = modalidades.find((m) => String(m.id) === String(modalidadeId));

        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            return {
                ...grupo,
                itens: grupo.itens.map((linha) => (
                    linha.uid === itemUid
                        ? {
                            ...linha,
                            modalidade_id: modalidadeId,
                            modalidade_nome: modalidade?.nome || "",
                            preco_praticado: modalidade ? String(modalidade.valor) : linha.preco_praticado
                        }
                        : linha
                ))
            }
        }))

        limparErro(`preco_${itemUid}`)
    }

    function adicionarItem(grupoUid) {
        atualizarGrupo(grupoUid, (grupo) => ({
            ...grupo,
            itens: [...grupo.itens, criarItem()]
        }))
    }

    function removerItem(grupoUid, itemUid) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            const removido = grupo.itens.find((item) => item.uid === itemUid)
            let itens = grupo.itens.filter((item) => item.uid !== itemUid)

            if (removido?.tipo_servico === "Servico") {
                itens = itens.filter((item) => item.servico_principal_uid !== itemUid)
            }

            if (itens.length === 0) itens = [criarItem()]

            return { ...grupo, itens }
        }))
        setErrors({})
    }

    function adicionarAplicacao(grupoUid, principalUid, aplicacao) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            const principal = grupo.itens.find((item) => item.uid === principalUid)
            if (!principal) return grupo

            const jaAssociada = grupo.itens.some((item) => (
                item.tipo_servico === "Aplicacao"
                && item.servico_principal_uid === principalUid
                && String(item.servico_id) === String(aplicacao.id)
            ))
            if (jaAssociada) return grupo

            return {
                ...grupo,
                itens: [
                    ...grupo.itens,
                    criarItem({
                        categoria_id: principal.categoria_id,
                        servico_id: String(aplicacao.id),
                        servico_nome: aplicacao.nome,
                        servico_principal_uid: principalUid,
                        funcionario_id: principal.funcionario_id,
                        tipo_servico: "Aplicacao",
                        preco_praticado: String(aplicacao.valor)
                    })
                ]
            }
        }))
        limparErro("servicos")
    }

    function removerAplicacao(grupoUid, aplicacaoUid) {
        atualizarGrupo(grupoUid, (grupo) => ({
            ...grupo,
            itens: grupo.itens.filter((item) => item.uid !== aplicacaoUid)
        }))
        setErrors({})
    }

    function alternarBeneficio(grupoUid, itemUid) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            const alvo = grupo.itens.find((item) => item.uid === itemUid)
            if (!alvo) return grupo

            const activar = !alvo.usar_beneficio_fidelizacao

            return {
                ...grupo,
                itens: grupo.itens.map((item) => {
                    if (item.uid === itemUid) {
                        return {
                            ...item,
                            usar_beneficio_fidelizacao: activar,
                            fidelizacao_selecionada: activar ? false : item.fidelizacao_selecionada
                        }
                    }

                    if (activar) {
                        return { ...item, usar_beneficio_fidelizacao: false }
                    }

                    return item
                })
            }
        }))

        limparErro("servicos")
        limparErro(`fidelizacao_${grupoUid}`)
    }

    function alternarFidelizacao(grupoUid, itemUid) {
        setGrupos((anteriores) => anteriores.map((grupo) => {
            if (grupo.uid !== grupoUid) return grupo

            const alvo = grupo.itens.find((item) => item.uid === itemUid)
            if (!alvo) return grupo

            const activar = !alvo.fidelizacao_selecionada

            return {
                ...grupo,
                itens: grupo.itens.map((item) => (
                    item.uid === itemUid
                        ? { ...item, fidelizacao_selecionada: activar }
                        : { ...item, fidelizacao_selecionada: false }
                ))
            }
        }))

        limparErro("servicos")
    }

    async function handleNovoCliente(clienteCriado) {
        setIsClientModalOpen(false);

        if (clienteCriado?.id && grupoNovoClienteUid) {
            handleClienteChange(grupoNovoClienteUid, String(clienteCriado.id))
            handlePesquisaCliente(grupoNovoClienteUid, "")
        }

        setGrupoNovoClienteUid(null)

        try {
            const res = await getClientes();
            const lista = Array.isArray(res.data) ? res.data : (res.data?.clientes || []);
            setClientes(lista.filter((c) => c.estado === "Ativo"));
        } catch (err) {
            setError(getApiError(err));
        }
    }

    function abrirNovoCliente(grupoUid) {
        setGrupoNovoClienteUid(grupoUid)
        setIsClientModalOpen(true)
    }

    function alterarPagamento(campo, valor) {
        setPagamento((anterior) => ({ ...anterior, [campo]: valor }));
        if (campo === "valor") setPagamentoManual(true);
        limparErro("pagamento");
    }

    function validarFidelizacaoDosGrupos(erros) {
        grupos.forEach((grupo) => {
            const id = String(grupo.cliente_id || "");
            const fidelizacao = fidelizacoes[id]?.dados;
            const beneficios = Number(fidelizacao?.beneficios_disponiveis) || 0;
            const gratuitos = grupo.itens.filter((item) => item.usar_beneficio_fidelizacao);
            const selecionados = grupo.itens.filter((item) => item.fidelizacao_selecionada);

            if (gratuitos.length > 1) {
                erros.servicos = "So e possivel marcar um servico gratis por cliente";
            }

            if (selecionados.length > 1) {
                erros.servicos = "So e possivel escolher um servico para fidelizacao por cliente";
            }

            if (!id) return;

            if (gratuitos.length > 0 && beneficios <= 0) {
                erros[`fidelizacao_${grupo.uid}`] = "O cliente ainda nao tem o 6.º servico gratuito disponivel";
                return;
            }

            const elegiveisPagos = grupo.itens.filter((item) => (
                item.tipo_servico === "Servico"
                && item.servico_id
                && !item.usar_beneficio_fidelizacao
                && Number(item.preco_praticado) > 0
                && servicoContaParaFidelizacao(
                    servicos.find((servico) => String(servico.id) === String(item.servico_id))
                )
            ));

            if (beneficios > 0 && elegiveisPagos.length > 0 && gratuitos.length === 0) {
                erros[`fidelizacao_${grupo.uid}`] = "O cartao esta completo (5/5). Selecione o servico que sera o 6.º gratuito.";
            }
        });
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        const erros = validarAtendimento({ clientes: grupos });

        validarFidelizacaoDosGrupos(erros);

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
            const clientesParaEnviar = grupos.map((grupo) => {
                const indices = new Map(grupo.itens.map((item, index) => [item.uid, index]));

                return {
                    cliente_id: Number(grupo.cliente_id),
                    servicos: grupo.itens.map((item) => {
                        const base = {
                            servico_id: Number(item.servico_id),
                            funcionario_id: Number(item.funcionario_id),
                            preco_praticado: Number(item.preco_praticado),
                            desconto: 0,
                            usar_beneficio_fidelizacao: item.usar_beneficio_fidelizacao === true,
                            fidelizacao_selecionada: item.fidelizacao_selecionada === true,
                            tipo_servico: item.tipo_servico
                        };

                        if (item.modalidade_id) base.modalidade_id = Number(item.modalidade_id);
                        if (item.modalidade_nome) base.modalidade_nome = item.modalidade_nome;

                        if (item.tipo_servico === "Aplicacao") {
                            const principalIndex = indices.get(item.servico_principal_uid);
                            if (principalIndex !== undefined) {
                                base.servico_principal_index = principalIndex;
                            }
                        }

                        return base;
                    })
                };
            });

            const payload = { clientes: clientesParaEnviar };
            const resposta = await createAtendimento(payload);
            const novoAtendimento = resposta.data;
            const usouBeneficio = clientesParaEnviar.some((grupo) => (
                grupo.servicos.some((item) => item.usar_beneficio_fidelizacao)
            ));
            let avisoPagamento = "";

            // Actualiza os cartões dentro do próprio modal antes de fechar.
            const fidelizacoesActualizadas = Array.isArray(novoAtendimento?.fidelizacoes)
                ? novoAtendimento.fidelizacoes
                : [];

            if (fidelizacoesActualizadas.length > 0) {
                setFidelizacoes((anteriores) => {
                    const proximas = { ...anteriores };

                    fidelizacoesActualizadas.forEach((fidelizacao) => {
                        const id = String(fidelizacao.cliente_id);
                        proximas[id] = { loading: false, dados: fidelizacao, erro: null };
                    });

                    return proximas;
                });
            } else if (novoAtendimento?.fidelizacao && novoAtendimento?.cliente_id) {
                const id = String(novoAtendimento.cliente_id);
                setFidelizacoes((anteriores) => ({
                    ...anteriores,
                    [id]: { loading: false, dados: novoAtendimento.fidelizacao, erro: null }
                }));
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
                    ? `6.º serviço gratuito registado. O cartão de fidelização foi actualizado.${avisoPagamento}`
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
                            <span>Registe os serviços, a fidelização e o pagamento num só fluxo</span>
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
                        <div className="nm-section nm-section-wide">
                            <div className="nm-section-title-row">
                                <div className="nm-section-title">
                                    <UserRound size={18} />
                                    <span>Clientes e serviços</span>
                                </div>
                                <button
                                    type="button"
                                    className="nm-secondary-btn"
                                    onClick={adicionarCliente}
                                    disabled={carregandoDados}
                                >
                                    <UserPlus size={16} />
                                    Adicionar outro cliente
                                </button>
                            </div>

                            {carregandoDados ? (
                                <p className="nm-hint">A carregar dados...</p>
                            ) : clientes.length === 0 ? (
                                <p className="nm-hint">Nenhum cliente registado. Cadastre o primeiro abaixo.</p>
                            ) : null}

                            {grupos.map((grupo, grupoIndex) => {
                                const cliente = clientesPorId.get(String(grupo.cliente_id));
                                const visiveis = clientesVisiveis(grupo);
                                const entradaFidelizacao = fidelizacoes[String(grupo.cliente_id || "")];
                                const fidelizacao = entradaFidelizacao?.dados || null;
                                const beneficiosDisponiveis = Number(fidelizacao?.beneficios_disponiveis) || 0;
                                const itensPrincipais = grupo.itens.filter((item) => item.tipo_servico === "Servico");
                                const itensAplicacao = grupo.itens.filter((item) => item.tipo_servico === "Aplicacao");
                                const servicoFidelizacao = grupo.itens.find((item) => item.fidelizacao_selecionada);
                                const servicoGratuito = grupo.itens.find((item) => item.usar_beneficio_fidelizacao);
                                const subtotal = subtotais.get(grupo.uid) || 0;
                                const erroCliente = errors[`cliente_${grupo.uid}`];
                                const erroServicos = errors[`servicos_${grupo.uid}`];
                                const erroFidelizacao = errors[`fidelizacao_${grupo.uid}`];

                                return (
                                    <article className="nm-client-group" key={grupo.uid}>
                                        <header className="nm-client-group-header">
                                            <span className="nm-client-badge">{grupoIndex + 1}</span>
                                            <div className="nm-client-group-title">
                                                <strong>{cliente ? nomeCliente(cliente) : `Cliente ${grupoIndex + 1}`}</strong>
                                                <span>
                                                    {cliente
                                                        ? [cliente.telefone, cliente.endereco].filter(Boolean).join(" · ")
                                                        : "Escolha o cliente e adicione os serviços"}
                                                </span>
                                            </div>
                                            {grupos.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="nm-remove-btn"
                                                    onClick={() => removerCliente(grupo.uid)}
                                                    title="Remover cliente do atendimento"
                                                    aria-label={`Remover cliente ${grupoIndex + 1}`}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </header>

                                        <div className="nm-client-picker">
                                            <div className="nm-field">
                                                <label htmlFor={`pesquisa-cliente-${grupo.uid}`}>Pesquisar cliente</label>
                                                <input
                                                    id={`pesquisa-cliente-${grupo.uid}`}
                                                    type="search"
                                                    className="nm-select nm-client-search"
                                                    placeholder="Nome ou telefone..."
                                                    value={grupo.pesquisa}
                                                    onChange={(e) => handlePesquisaCliente(grupo.uid, e.target.value)}
                                                />
                                            </div>

                                            <div className="nm-field">
                                                <label htmlFor={`cliente-${grupo.uid}`}>Cliente</label>
                                                <select
                                                    id={`cliente-${grupo.uid}`}
                                                    className={`nm-select ${erroCliente ? "input-invalido" : ""}`}
                                                    value={grupo.cliente_id}
                                                    onChange={(e) => handleClienteChange(grupo.uid, e.target.value)}
                                                    aria-invalid={erroCliente ? "true" : undefined}
                                                >
                                                    <option value="">Selecione o cliente...</option>
                                                    {visiveis.length === 0 && (
                                                        <option value="" disabled>Nenhum cliente encontrado</option>
                                                    )}
                                                    {visiveis.map((opcao) => (
                                                        <option key={opcao.id} value={opcao.id}>
                                                            {nomeCliente(opcao)} - {opcao.telefone}
                                                        </option>
                                                    ))}
                                                </select>
                                                {erroCliente && (
                                                    <span className="field-error" role="alert">{erroCliente}</span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="nm-secondary-btn nm-new-client-btn"
                                                onClick={() => abrirNovoCliente(grupo.uid)}
                                            >
                                                <PlusIcon size={16} />
                                                Novo cliente
                                            </button>
                                        </div>

                                        {cliente && (
                                            <div className="nm-client-loyalty">
                                                <FidelizacaoCard
                                                    fidelizacao={fidelizacao}
                                                    loading={entradaFidelizacao?.loading}
                                                    compact
                                                />
                                                {entradaFidelizacao?.erro && (
                                                    <span className="field-error" role="alert">{entradaFidelizacao.erro}</span>
                                                )}
                                                <p className="nm-hint">
                                                    {beneficiosDisponiveis > 0
                                                        ? "Cartão completo: escolha abaixo o serviço que será o 6.º gratuito."
                                                        : "Escolha explicitamente o serviço que conta para a fidelização deste cliente."}
                                                </p>
                                            </div>
                                        )}

                                        <div className="nm-client-services">
                                            {itensPrincipais.map((item) => {
                                                const servicoSelecionado = servicos.find((s) => String(s.id) === String(item.servico_id));
                                                const servicosDoItem = servicos.filter((servico) => (
                                                    String(servico.categoria_id) === String(item.categoria_id)
                                                ));
                                                const modalidades = modalidadesCache[String(item.servico_id)] || [];
                                                const aplicacoes = servicoSelecionado?.permite_aplicacoes
                                                    ? (aplicacoesCache[String(item.servico_id)] || [])
                                                    : [];
                                                const aplicacoesAssociadas = grupo.itens.filter((aplicacao) => (
                                                    aplicacao.tipo_servico === "Aplicacao"
                                                    && aplicacao.servico_principal_uid === item.uid
                                                ));
                                                const contaParaFidelizacao = servicoContaParaFidelizacao(servicoSelecionado);
                                                const podeUsarBeneficio = beneficiosDisponiveis > 0
                                                    && itemPodeSerGratuito(item, servicoSelecionado);
                                                const erroServico = errors[`servico_${item.uid}`];
                                                const erroFuncionario = errors[`funcionario_${item.uid}`];
                                                const erroPreco = errors[`preco_${item.uid}`];

                                                return (
                                                    <div className={`nm-item ${item.usar_beneficio_fidelizacao ? "free" : ""}`} key={item.uid}>
                                                        <div className={`nm-item-fields ${modalidades.length > 0 ? "com-modalidade" : ""}`}>
                                                            <div className="nm-field">
                                                                <label>Categoria</label>
                                                                <select
                                                                    className="nm-select"
                                                                    value={item.categoria_id}
                                                                    onChange={(e) => handleCategoriaChange(grupo.uid, item.uid, e.target.value)}
                                                                >
                                                                    <option value="">Selecione a categoria...</option>
                                                                    {categoriasServicos.map((categoria) => (
                                                                        <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="nm-field">
                                                                <label>Serviço</label>
                                                                <select
                                                                    className={`nm-select ${erroServico ? "input-invalido" : ""}`}
                                                                    value={item.servico_id}
                                                                    onChange={(e) => handleServicoChange(grupo.uid, item.uid, e.target.value)}
                                                                    disabled={!item.categoria_id || servicosDoItem.length === 0}
                                                                >
                                                                    <option value="">
                                                                        {!item.categoria_id
                                                                            ? "Escolha primeiro a categoria"
                                                                            : servicosDoItem.length === 0
                                                                                ? "Sem serviços nesta categoria"
                                                                                : "Selecione o serviço..."}
                                                                    </option>
                                                                    {servicosDoItem.map((servico) => (
                                                                        <option key={servico.id} value={servico.id}>
                                                                            {servico.nome} ({formatarMoeda(servico.valor)}){servico.elegivel_fidelizacao ? " · fidelização" : ""}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {erroServico && (
                                                                    <span className="field-error" role="alert">{erroServico}</span>
                                                                )}
                                                                {contaParaFidelizacao && !item.usar_beneficio_fidelizacao && (
                                                                    <span className="nm-loyalty-tag">
                                                                        <Heart size={12} /> Elegível para fidelização
                                                                    </span>
                                                                )}
                                                                {item.usar_beneficio_fidelizacao && (
                                                                    <span className="nm-loyalty-tag free">
                                                                        <Gift size={12} /> 6.º serviço grátis
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {modalidades.length > 0 && (
                                                                <div className="nm-field">
                                                                    <label>Modalidade</label>
                                                                    <select
                                                                        className="nm-select"
                                                                        value={item.modalidade_id}
                                                                        onChange={(e) => handleModalidadeChange(grupo.uid, item.uid, e.target.value)}
                                                                    >
                                                                        <option value="">Usar preço base</option>
                                                                        {modalidades.map((modalidade) => (
                                                                            <option key={modalidade.id} value={modalidade.id}>
                                                                                {modalidade.nome} ({modalidade.faixa_etaria}) - {formatarMoeda(modalidade.valor)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    {item.modalidade_nome && (
                                                                        <span className="nm-hint">Modalidade: {item.modalidade_nome}</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="nm-field">
                                                                <label>Funcionário</label>
                                                                <select
                                                                    className={`nm-select ${erroFuncionario ? "input-invalido" : ""}`}
                                                                    value={item.funcionario_id}
                                                                    onChange={(e) => handleItemChange(grupo.uid, item.uid, "funcionario_id", e.target.value)}
                                                                >
                                                                    <option value="">Selecione o funcionário...</option>
                                                                    {funcionarios.map((funcionario) => (
                                                                        <option key={funcionario.id} value={funcionario.id}>
                                                                            {funcionario.nome}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {erroFuncionario && (
                                                                    <span className="field-error" role="alert">{erroFuncionario}</span>
                                                                )}
                                                            </div>

                                                            <div className="nm-field nm-field-price">
                                                                <label>Valor (MT)</label>
                                                                <input
                                                                    type="number"
                                                                    className={erroPreco ? "input-invalido" : ""}
                                                                    min="0"
                                                                    step="1"
                                                                    value={item.preco_praticado}
                                                                    onChange={(e) => handleItemChange(grupo.uid, item.uid, "preco_praticado", e.target.value)}
                                                                    disabled={item.usar_beneficio_fidelizacao}
                                                                />
                                                                {item.usar_beneficio_fidelizacao && (
                                                                    <span className="nm-free-note">6.º serviço gratuito</span>
                                                                )}
                                                                {erroPreco && (
                                                                    <span className="field-error" role="alert">{erroPreco}</span>
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="nm-remove-btn"
                                                                onClick={() => removerItem(grupo.uid, item.uid)}
                                                                title="Remover serviço e aplicações"
                                                                aria-label="Remover serviço"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>

                                                        {servicoSelecionado?.permite_aplicacoes && (
                                                            <div className="nm-applications">
                                                                <div className="nm-applications-title">
                                                                    <Tag size={14} />
                                                                    <span>Aplicações associadas</span>
                                                                </div>

                                                                {aplicacoesAssociadas.length > 0 && (
                                                                    <div className="nm-app-list">
                                                                        {aplicacoesAssociadas.map((aplicacao) => (
                                                                            <div className="nm-app-row" key={aplicacao.uid}>
                                                                                <div className="nm-app-line">
                                                                                    <span className="nm-app-name">
                                                                                        <Tag size={13} />
                                                                                        {aplicacao.servico_nome || "Aplicação"}
                                                                                    </span>
                                                                                    <span className="nm-app-employee">
                                                                                        {funcionarios.find((f) => String(f.id) === String(aplicacao.funcionario_id))?.nome || "Sem funcionário"}
                                                                                    </span>
                                                                                    <input
                                                                                        type="number"
                                                                                        className={errors[`preco_${aplicacao.uid}`] ? "input-invalido" : ""}
                                                                                        min="0"
                                                                                        step="1"
                                                                                        value={aplicacao.preco_praticado}
                                                                                        onChange={(e) => handleItemChange(grupo.uid, aplicacao.uid, "preco_praticado", e.target.value)}
                                                                                        aria-label={`Valor da aplicação ${aplicacao.servico_nome || ""}`}
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn-remove-inline"
                                                                                        onClick={() => removerAplicacao(grupo.uid, aplicacao.uid)}
                                                                                        title="Remover aplicação"
                                                                                        aria-label="Remover aplicação"
                                                                                    >
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                </div>
                                                                                {errors[`preco_${aplicacao.uid}`] && (
                                                                                    <span className="field-error" role="alert">{errors[`preco_${aplicacao.uid}`]}</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {aplicacoes.filter((aplicacao) => !aplicacoesAssociadas.some((associada) => (
                                                                    String(associada.servico_id) === String(aplicacao.id)
                                                                ))).length > 0 && (
                                                                    <div className="nm-app-picker">
                                                                        {aplicacoes
                                                                            .filter((aplicacao) => !aplicacoesAssociadas.some((associada) => (
                                                                                String(associada.servico_id) === String(aplicacao.id)
                                                                            )))
                                                                            .map((aplicacao) => (
                                                                                <button
                                                                                    key={aplicacao.id}
                                                                                    type="button"
                                                                                    className="btn-add-aplicacao"
                                                                                    onClick={() => adicionarAplicacao(grupo.uid, item.uid, aplicacao)}
                                                                                    title="Adicionar aplicação"
                                                                                >
                                                                                    <PlusIcon size={12} />
                                                                                    {aplicacao.nome} ({formatarMoeda(aplicacao.valor)})
                                                                                </button>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {cliente && contaParaFidelizacao && (
                                                            <div className="nm-benefit-row">
                                                                <button
                                                                    type="button"
                                                                    className={`nm-benefit-btn ${item.usar_beneficio_fidelizacao ? "active" : ""}`}
                                                                    onClick={() => alternarBeneficio(grupo.uid, item.uid)}
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
                                                                        ? `Este é o único serviço grátis deste cliente (limite ${LIMITE_FIDELIZACAO} MT).`
                                                                        : beneficiosDisponiveis > 0
                                                                            ? "O cartão está completo (5/5). Escolha um serviço elegível para ser o 6.º gratuito."
                                                                            : "O cartão ainda não tem o 6.º serviço gratuito pendente."}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {cliente && contaParaFidelizacao && !item.usar_beneficio_fidelizacao && (
                                                            <div className="nm-loyalty-select-row">
                                                                <button
                                                                    type="button"
                                                                    className={`nm-loyalty-select ${item.fidelizacao_selecionada ? "active" : ""}`}
                                                                    onClick={() => alternarFidelizacao(grupo.uid, item.uid)}
                                                                >
                                                                    <Heart size={14} />
                                                                    {item.fidelizacao_selecionada
                                                                        ? "Conta para a fidelização deste cliente"
                                                                        : "Escolher para contar na fidelização"}
                                                                </button>
                                                                <span>Uma escolha por cliente. Sem escolha, este atendimento não gera marca.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            className="nm-secondary-btn"
                                            onClick={() => adicionarItem(grupo.uid)}
                                            disabled={servicos.length === 0}
                                        >
                                            <PlusIcon size={16} />
                                            Adicionar outro serviço
                                        </button>

                                        {erroServicos && (
                                            <span className="field-error" role="alert">{erroServicos}</span>
                                        )}

                                        {erroFidelizacao && (
                                            <span className="field-error" role="alert">{erroFidelizacao}</span>
                                        )}

                                        <div className="nm-client-summary">
                                            <div className="nm-client-summary-row">
                                                <span>
                                                    {itensPrincipais.filter((item) => item.servico_id).length} serviço(s)
                                                    {itensAplicacao.length > 0 ? ` · ${itensAplicacao.length} aplicação(ões)` : ""}
                                                </span>
                                                <strong>{formatarMoeda(subtotal)}</strong>
                                            </div>
                                            <div className="nm-client-summary-row">
                                                <span><Heart size={13} /> Fidelização</span>
                                                <strong>
                                                    {servicoFidelizacao
                                                        ? servicoFidelizacao.servico_nome
                                                        : "Não conta neste atendimento"}
                                                </strong>
                                            </div>
                                            {servicoGratuito && (
                                                <div className="nm-client-summary-row free">
                                                    <span><Gift size={13} /> 6.º serviço grátis</span>
                                                    <strong>{servicoGratuito.servico_nome}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}

                            {errors.servicos && (
                                <span className="field-error" role="alert">{errors.servicos}</span>
                            )}
                        </div>

                        <div className="nm-section nm-section-wide">
                            <div className="nm-section-title">
                                <Receipt size={18} />
                                <span>Resumo do atendimento</span>
                            </div>

                            <div className="nm-resumo">
                                <div className="resumo-linha">
                                    <span>Atendimento</span>
                                    <strong>Novo · {dataRegistoFormatada}</strong>
                                </div>
                                <div className="resumo-linha">
                                    <span>Clientes</span>
                                    <strong>{grupos.length}</strong>
                                </div>
                                <div className="resumo-linha">
                                    <span>Serviços / aplicações</span>
                                    <strong>{totalServicos} / {totalAplicacoes}</strong>
                                </div>

                                {grupos.map((grupo, index) => {
                                    const cliente = clientesPorId.get(String(grupo.cliente_id));
                                    const selecionado = grupo.itens.find((item) => item.fidelizacao_selecionada);
                                    const gratuito = grupo.itens.find((item) => item.usar_beneficio_fidelizacao);

                                    return (
                                        <div className="nm-resumo-cliente" key={grupo.uid}>
                                            <div className="resumo-linha">
                                                <span>Cliente {index + 1}</span>
                                                <strong>{cliente ? nomeCliente(cliente) : "Por selecionar"}</strong>
                                            </div>
                                            <div className="resumo-linha">
                                                <span>Subtotal</span>
                                                <strong>{formatarMoeda(subtotais.get(grupo.uid) || 0)}</strong>
                                            </div>
                                            <div className="resumo-linha resumo-detalhe">
                                                <span>Fidelização</span>
                                                <strong>{selecionado?.servico_nome || "Não conta"}</strong>
                                            </div>
                                            {gratuito && (
                                                <div className="resumo-linha resumo-detalhe">
                                                    <span>Benefício</span>
                                                    <strong>6.º grátis · {gratuito.servico_nome}</strong>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="resumo-linha resumo-total">
                                    <span>Total</span>
                                    <strong>{formatarMoeda(total)}</strong>
                                </div>
                                <div className="resumo-linha">
                                    <span>Valor pago</span>
                                    <strong>{formatarMoeda(valorPago)}</strong>
                                </div>
                                <div className={`resumo-linha ${saldo > 0 ? "resumo-pendente" : "resumo-liquidado"}`}>
                                    <span>Saldo</span>
                                    <strong>{formatarMoeda(saldo)}</strong>
                                </div>
                            </div>
                        </div>

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
                                            ? `${formatarMoeda(valorPago)} pagos · faltam ${formatarMoeda(saldo)}.`
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
                            <strong>{formatarMoeda(total)}</strong>
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
                                    <p>Reveja os clientes, serviços, fidelização e pagamento antes de registar.</p>
                                </div>
                                <button
                                    type="button"
                                    className="nm-confirm-close"
                                    onClick={() => setConfirmOpen(false)}
                                    disabled={loading}
                                    aria-label="Fechar confirmação"
                                >
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="nm-confirm-body">
                                <div className="nm-summary-grid">
                                    <div className="nm-summary-row">
                                        <span>Atendimento</span>
                                        <strong>Novo · {dataRegistoFormatada}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Clientes</span>
                                        <strong>{grupos.length}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Serviços / aplicações</span>
                                        <strong>{totalServicos} / {totalAplicacoes}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Total</span>
                                        <strong>{formatarMoeda(total)}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Valor pago</span>
                                        <strong>{formatarMoeda(valorPago)}</strong>
                                    </div>
                                    <div className="nm-summary-row">
                                        <span>Saldo</span>
                                        <strong>{formatarMoeda(saldo)}</strong>
                                    </div>
                                </div>

                                {grupos.map((grupo, index) => {
                                    const cliente = clientesPorId.get(String(grupo.cliente_id));
                                    const itensPrincipais = grupo.itens.filter((item) => item.tipo_servico === "Servico" && item.servico_id);
                                    const selecionado = grupo.itens.find((item) => item.fidelizacao_selecionada);
                                    const gratuito = grupo.itens.find((item) => item.usar_beneficio_fidelizacao);

                                    return (
                                        <div className="nm-confirm-client" key={grupo.uid}>
                                            <div className="nm-confirm-client-head">
                                                <strong>Cliente {index + 1} · {cliente ? nomeCliente(cliente) : "Por selecionar"}</strong>
                                                <span>{formatarMoeda(subtotais.get(grupo.uid) || 0)}</span>
                                            </div>

                                            <ul className="nm-summary-services">
                                                {itensPrincipais.map((item) => {
                                                    const aplicacoes = grupo.itens.filter((aplicacao) => (
                                                        aplicacao.tipo_servico === "Aplicacao"
                                                        && aplicacao.servico_principal_uid === item.uid
                                                    ));
                                                    const funcionario = funcionarios.find((f) => String(f.id) === String(item.funcionario_id));

                                                    return (
                                                        <li key={item.uid}>
                                                            <span>
                                                                <strong>{item.servico_nome || "Serviço"}</strong>
                                                                {item.modalidade_nome && <small> · {item.modalidade_nome}</small>}
                                                                {aplicacoes.length > 0 && (
                                                                    <small>Aplicações: {aplicacoes.map((aplicacao) => aplicacao.servico_nome).join(", ")}</small>
                                                                )}
                                                                {item.fidelizacao_selecionada && (
                                                                    <span className="nm-loyalty-tag"><Heart size={10} /> Fidelização</span>
                                                                )}
                                                                {item.usar_beneficio_fidelizacao && (
                                                                    <span className="nm-loyalty-tag free"><Gift size={10} /> Grátis</span>
                                                                )}
                                                            </span>
                                                            <span>{funcionario?.nome || "Sem funcionário"}</span>
                                                            <strong>
                                                                {item.usar_beneficio_fidelizacao
                                                                    ? "0 MT"
                                                                    : formatarMoeda(item.preco_praticado)}
                                                            </strong>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            <p className="nm-confirm-loyalty">
                                                <Heart size={13} />
                                                Fidelização: {selecionado ? selecionado.servico_nome : "não conta neste atendimento"}
                                                {gratuito ? ` · 6.º grátis: ${gratuito.servico_nome}` : ""}
                                            </p>
                                        </div>
                                    );
                                })}

                                <div className={`nm-payment-balance ${saldo > 0 ? "pending" : "settled"}`}>
                                    <Wallet size={16} />
                                    {!podePagar
                                        ? "Sem permissão para registar pagamento; o atendimento fica pendente."
                                        : valorPago <= 0
                                            ? `Pagamento pendente: faltam ${formatarMoeda(total)}.`
                                            : saldo > 0
                                                ? `${formatarMoeda(valorPago)} pagos · faltam ${formatarMoeda(saldo)}.`
                                                : "Pagamento total: o atendimento fica liquidado."}
                                </div>
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
                            onclose={() => {
                                setIsClientModalOpen(false)
                                setGrupoNovoClienteUid(null)
                            }}
                            onSuccess={handleNovoCliente}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

export default NewMarkModal;
