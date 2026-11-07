import NewMarkModal from "../../components/Modals/NewMark/New-Mark-Modal.jsx"
import CartaoClienteModal from "../../components/Modals/CartaoClienteModal/CartaoClienteModal.jsx"
import FidelizacaoCard from "../../components/FidelizacaoCard/FidelizacaoCard.jsx"
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import "./novoAtendimento.css"
import "../../Styles/management.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format, isAfter, isToday, isValid, parseISO, startOfDay, subDays } from "date-fns"
import { pt } from "date-fns/locale"
import {
    AlertCircle,
    Ban,
    CalendarClock,
    CalendarPlus,
    CheckCircle2,
    ChevronDown,
    Clock3,
    CreditCard,
    Download,
    Edit3,
    Eye,
    Heart,
    Lock,
    Phone,
    Plus,
    Receipt,
    RefreshCw,
    ScissorsIcon,
    Search,
    Sparkles,
    Tag,
    Trash2,
    UserRound,
    Wallet,
    X
} from "lucide-react"
import {
    getAtendimentos,
    getAtendimento,
    getAgendamentos,
    getClientes,
    getServicos,
    getFuncionarios,
    getFidelizacao,
    getServicoModalidades,
    getServicoAplicacoes,
    updateAtendimento,
    anularAtendimento,
    anularPagamento,
    registrarPagamento,
    getApiError
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"

const ESTADOS = ["Todos", "Concluido", "Anulado", "Agendamento"]
const PERIODOS = ["Todos", "Hoje", "7 dias", "30 dias"]
const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"]

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function dataAtendimento(valor) {
    if (!valor) return null
    const data = typeof valor === "string" ? parseISO(valor) : new Date(valor)
    return isValid(data) ? data : null
}

function formatarData(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "dd MMM yyyy 'às' HH:mm", { locale: pt })
}

function formatarDataCurta(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "dd MMM yyyy", { locale: pt })
}

function formatarHora(valor) {
    const data = dataAtendimento(valor)
    if (!data) return "—"
    return format(data, "HH:mm")
}

function paraInputDataHora(valor) {
    const data = dataAtendimento(valor)
    if (!data) return ""
    return format(data, "yyyy-MM-dd'T'HH:mm")
}

function rotuloEstado(estado) {
    return estado === "Concluido" ? "Concluído" : estado
}

function classeEstado(estado) {
    switch (estado) {
        case "Concluido": return "concluido"
        case "Anulado": return "anulado"
        default: return "pendente"
    }
}

function tomEstado(estado) {
    switch (estado) {
        case "Concluido": return "primary"
        case "Anulado": return "danger"
        default: return "warning"
    }
}

function iniciais(nome, apelido) {
    const partes = `${nome || ""} ${apelido || ""}`.trim().split(/\s+/).filter(Boolean)
    if (!partes.length) return "AT"
    const primeira = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
    return `${primeira}${ultima}`.toUpperCase()
}

function saldoDoAtendimento(atendimento) {
    if (!atendimento || atendimento.estado === "Anulado") return 0
    return Math.max(Number(atendimento.valor_total || 0) - Number(atendimento.valor_pago || 0), 0)
}

function itemEdicaoVazio(chave = null) {
    return {
        chave,
        id: null,
        servico_id: "",
        funcionario_id: "",
        modalidade_id: "",
        modalidade_nome: "",
        tipo_servico: "Servico",
        servico_principal_id: null,
        servico_principal_chave: null,
        preco_praticado: "",
        desconto: "0",
        agendamento_servico_id: null
    }
}

let sequenciaItemEdicao = 0
function novaChaveEdicao() {
    sequenciaItemEdicao += 1
    return `novo-${sequenciaItemEdicao}`
}

function itemEdicaoDeServico(servico) {
    return {
        chave: `linha-${servico.id}`,
        id: servico.id,
        servico_id: String(servico.servico_id ?? ""),
        servico_nome: servico.servico_nome || "",
        funcionario_id: String(servico.funcionario_id ?? ""),
        funcionario_nome: servico.funcionario_nome || "",
        modalidade_id: servico.modalidade_id ? String(servico.modalidade_id) : "",
        modalidade_nome: servico.modalidade_nome || "",
        tipo_servico: servico.tipo_servico || "Servico",
        servico_principal_id: servico.servico_principal_id ?? null,
        servico_principal_chave: null,
        preco_praticado: String(servico.preco_original ?? ""),
        desconto: String(servico.valor_desconto ?? 0),
        agendamento_servico_id: servico.agendamento_servico_id ?? null
    }
}

function totalEdicao(itens) {
    return itens.reduce((total, item) => {
        const preco = Number(item.preco_praticado) || 0
        const desconto = Number(item.desconto) || 0
        return total + Math.max(preco - desconto, 0)
    }, 0)
}

// A aplicação pertence à linha principal quando aponta para o id dessa linha.
// Versões antigas do formulário gravavam o id do catálogo; aceitamos essa
// referência apenas quando não colide com o id de outra linha principal.
function aplicacaoPertenceAoPrincipal(aplicacao, principal, itens) {
    if (!principal || aplicacao?.tipo_servico !== "Aplicacao") return false

    if (
        principal.chave
        && String(aplicacao.servico_principal_chave || "") === String(principal.chave)
    ) {
        return true
    }

    const referencia = String(aplicacao.servico_principal_id || "")
    if (!referencia) return false

    const linhaReferenciada = itens.find((item) => (
        item.tipo_servico !== "Aplicacao"
        && String(item.id || "") === referencia
    ))

    if (linhaReferenciada) return linhaReferenciada === principal

    return referencia === String(principal.servico_id || "")
}

async function buscarAtendimentos() {
    const res = await getAtendimentos()
    return Array.isArray(res.data) ? res.data : (res.data?.atendimentos || [])
}

function ClienteAtendimentoCell({ data, rotulo = "Atendimento" }) {
    return (
        <div className="mgmt-user-cell">
            <span className="mgmt-avatar customer name-icon ">{iniciais(data.cliente_nome, data.cliente_apelido)}</span>
            <span className="mgmt-user-copy">
                <strong>{data.cliente_nome} {data.cliente_apelido || ""}</strong>
                <small>{data.cliente_telefone || `${rotulo} #${data.id}`}</small>
            </span>
        </div>
    )
}

function DataAtendimentoCell({ value }) {
    return (
        <div className="mgmt-cell-stack">
            <span className="mgmt-date">
                <Clock3 size={13} />
                {formatarDataCurta(value)}
            </span>
            <small>{formatarHora(value)}</small>
        </div>
    )
}

function EstadoAtendimentoCell({ value }) {
    return (
        <span className={`mgmt-badge ${tomEstado(value)}`}>
            <span className="mgmt-badge-dot" />
            {rotuloEstado(value) || "Concluído"}
        </span>
    )
}

function PagamentoAtendimentoCell({ data }) {
    const saldo = saldoDoAtendimento(data)
    const anulado = data.estado === "Anulado"
    return (
        <span className="mgmt-payment-copy">
            <strong>{anulado ? "Atendimento anulado" : data.metodos_pagamento || "Sem pagamento"}</strong>
            <small className={`mgmt-money ${anulado ? "muted" : saldo > 0 ? "pending" : "settled"}`}>
                {anulado ? "Sem cobrança" : saldo > 0 ? `${formatarMoeda(saldo)} em falta` : "Liquidado"}
            </small>
        </span>
    )
}

function TotalAtendimentoCell({ value }) {
    return <span className="mgmt-money">{formatarMoeda(value)}</span>
}

function AcoesAtendimentoCell({ data, podeEditar, podeAnular, onVer, onEditar, onAnular }) {
    return (
        <div className="mgmt-row-actions">
            <button
                type="button"
                className="mgmt-row-btn view"
                onClick={() => onVer(data)}
                title="Ver detalhe completo"
                aria-label={`Ver atendimento ${data.id}`}
            >
                <Eye size={16} />
            </button>
            {podeEditar && data.estado !== "Anulado" && (
                <button
                    type="button"
                    className="mgmt-row-btn edit"
                    onClick={() => onEditar(data)}
                    title="Editar atendimento"
                    aria-label={`Editar atendimento ${data.id}`}
                >
                    <Edit3 size={16} />
                </button>
            )}
            {podeAnular && data.estado !== "Anulado" && (
                <button
                    type="button"
                    className="mgmt-row-btn danger"
                    onClick={() => onAnular(data)}
                    title="Apagar atendimento"
                    aria-label={`Apagar atendimento ${data.id}`}
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    )
}

function EstadoAgendamentoCell() {
    return (
        <span className="mgmt-badge warning">
            <span className="mgmt-badge-dot" />
            Agendamento
        </span>
    )
}

function ServicosAgendamentoCell({ data }) {
    const restante = Number(data.quantidade_restante || 0)
    const total = Number(data.quantidade_total || 0)

    return (
        <span className="mgmt-cell-stack">
            <strong className="mgmt-money">{restante} de {total}</strong>
            <small>{restante === 1 ? "serviço por consumir" : "serviços por consumir"}</small>
        </span>
    )
}

function PagamentoAgendamentoCell({ data }) {
    const saldo = Math.max(Number(data.saldo || 0), 0)

    return (
        <span className="mgmt-payment-copy">
            <strong>{formatarMoeda(data.valor_pago_liquido)} pago</strong>
            <small className={`mgmt-money ${saldo > 0 ? "pending" : "settled"}`}>
                {saldo > 0 ? `${formatarMoeda(saldo)} em falta` : "Liquidado"}
            </small>
        </span>
    )
}

function AcoesAgendamentoCell({ data, onAbrir }) {
    return (
        <div className="mgmt-row-actions">
            <button
                type="button"
                className="mgmt-row-btn view"
                onClick={() => onAbrir(data)}
                title="Abrir na página de agendamentos"
                aria-label={`Abrir agendamento ${data.id}`}
            >
                <Eye size={16} />
            </button>
        </div>
    )
}

function NovoAtendimento() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const podePagar = user?.permissoes?.includes("pagamentos:registar")
    const podeEditar = user?.permissoes?.includes("atendimentos:escrever")
    const podeAnular = user?.permissoes?.includes("atendimentos:anular")
    const podeAnularPagamento = user?.permissoes?.includes("pagamentos:anular")
    const ehAdministrador = user?.perfil === "Administrador"

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [atendimentos, setAtendimentos] = useState([])
    const [agendamentos, setAgendamentos] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingAgendamentos, setLoadingAgendamentos] = useState(true)
    const [error, setError] = useState(null)
    const [erroAgendamentos, setErroAgendamentos] = useState(null)
    const [filtro, setFiltro] = useState("Todos")
    const [periodo, setPeriodo] = useState("Todos")
    const [searchTerm, setSearchTerm] = useState("")
    const [detalhe, setDetalhe] = useState(null)
    const [loadingDetalhe, setLoadingDetalhe] = useState(false)
    const [detalheError, setDetalheError] = useState(null)
    const [savingPagamento, setSavingPagamento] = useState(false)
    const [anulacao, setAnulacao] = useState(null)
    const [aAnular, setAAnular] = useState(false)
    const [atendimentoEmEdicao, setAtendimentoEmEdicao] = useState(null)
    const [detalheEdicao, setDetalheEdicao] = useState(null)
    const [carregandoEdicao, setCarregandoEdicao] = useState(false)
    const [clientesEdicao, setClientesEdicao] = useState([])
    const [servicosEdicao, setServicosEdicao] = useState([])
    const [funcionariosEdicao, setFuncionariosEdicao] = useState([])
    const [itensEdicao, setItensEdicao] = useState([])
    const [modalidadesEdicao, setModalidadesEdicao] = useState({})
    const [aplicacoesEdicao, setAplicacoesEdicao] = useState({})
    const [fidelizacaoEdicao, setFidelizacaoEdicao] = useState(null)
    const [clienteEdicaoId, setClienteEdicaoId] = useState("")
    const [salvandoEdicao, setSalvandoEdicao] = useState(false)
    const [erroEdicao, setErroEdicao] = useState(null)
    const [sucessoEdicao, setSucessoEdicao] = useState(null)
    const [dataHoraEdicao, setDataHoraEdicao] = useState("")
    const [pagamentoEdicao, setPagamentoEdicao] = useState({
        metodo: "Dinheiro",
        valor: ""
    })
    const [salvandoPagamentoEdicao, setSalvandoPagamentoEdicao] = useState(false)
    const [pagamentoAAnular, setPagamentoAAnular] = useState(null)
    const [anulandoPagamentoEdicao, setAnulandoPagamentoEdicao] = useState(false)
    const [cartaoEdicaoAberto, setCartaoEdicaoAberto] = useState(false)
    const [pagamentoForm, setPagamentoForm] = useState({
        metodo: "Dinheiro",
        valor: ""
    })
    const gridApiRef = useRef(null)
    const agendaGridApiRef = useRef(null)
    const detalheRequestRef = useRef(0)
    const edicaoRequestRef = useRef(0)
    const agendamentosRequestRef = useRef(0)

    const carregarAtendimentos = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setAtendimentos(await buscarAtendimentos())
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }, [])

    // Agendamentos pré-pagos ainda com serviços por consumir. São mostrados
    // na aba "Agendamento" sem se misturarem com os atendimentos concluídos.
    const carregarAgendamentos = useCallback(async () => {
        const pedido = agendamentosRequestRef.current + 1
        agendamentosRequestRef.current = pedido

        setLoadingAgendamentos(true)
        setErroAgendamentos(null)

        try {
            const res = await getAgendamentos({ estado: "Aberto" })
            if (pedido !== agendamentosRequestRef.current) return

            const lista = Array.isArray(res.data) ? res.data : []
            setAgendamentos(lista.filter((item) => Number(item.quantidade_restante) > 0))
        } catch (err) {
            if (pedido === agendamentosRequestRef.current) {
                setErroAgendamentos(getApiError(err))
            }
        } finally {
            if (pedido === agendamentosRequestRef.current) {
                setLoadingAgendamentos(false)
            }
        }
    }, [])

    useEffect(() => {
        let activo = true

        Promise.resolve()
            .then(() => { if (activo) carregarAgendamentos() })
            .catch(() => {})

        return () => {
            activo = false
            agendamentosRequestRef.current += 1
        }
    }, [carregarAgendamentos])

    useEffect(() => {
        let activo = true

        buscarAtendimentos()
            .then((lista) => {
                if (!activo) return
                setAtendimentos(lista)
                setError(null)
            })
            .catch((err) => {
                if (activo) setError(getApiError(err))
            })
            .finally(() => {
                if (activo) setLoading(false)
            })

        return () => { activo = false }
    }, [])

    const carregarEdicao = useCallback(async (atendimento) => {
        if (!atendimento?.id) return

        // Cada abertura do formulario invalida os pedidos anteriores, para
        // uma resposta atrasada nao substituir o atendimento atual.
        const pedido = edicaoRequestRef.current + 1
        edicaoRequestRef.current = pedido

        setCarregandoEdicao(true)
        setErroEdicao(null)
        setSucessoEdicao(null)

        try {
            const [detalheRes, clientesRes, servicosRes, funcionariosRes] = await Promise.all([
                getAtendimento(atendimento.id),
                getClientes(),
                getServicos(),
                getFuncionarios()
            ])

            if (pedido !== edicaoRequestRef.current) return

            const detalheAtualizado = detalheRes.data || atendimento
            const listaClientes = Array.isArray(clientesRes.data)
                ? clientesRes.data
                : (clientesRes.data?.clientes || [])
            const listaServicos = Array.isArray(servicosRes.data)
                ? servicosRes.data
                : (servicosRes.data?.servicos || [])
            const listaFuncionarios = Array.isArray(funcionariosRes.data)
                ? funcionariosRes.data
                : (funcionariosRes.data?.funcionarios || [])

            setDetalheEdicao(detalheAtualizado)
            setClientesEdicao(listaClientes)
            setServicosEdicao(listaServicos)
            setFuncionariosEdicao(listaFuncionarios)
            setItensEdicao((detalheAtualizado.servicos || []).map(itemEdicaoDeServico))
            setClienteEdicaoId(String(detalheAtualizado.cliente_id ?? ""))
            setDataHoraEdicao(paraInputDataHora(detalheAtualizado.data_hora))
            setFidelizacaoEdicao(detalheAtualizado.fidelizacao || null)

            const saldoAtual = saldoDoAtendimento(detalheAtualizado)
            setPagamentoEdicao({
                metodo: "Dinheiro",
                valor: saldoAtual > 0 ? String(saldoAtual) : ""
            })
        } catch (err) {
            if (pedido === edicaoRequestRef.current) {
                setErroEdicao(getApiError(err))
            }
        } finally {
            if (pedido === edicaoRequestRef.current) {
                setCarregandoEdicao(false)
            }
        }
    }, [])

    useEffect(() => {
        if (!atendimentoEmEdicao) return undefined

        let activo = true

        Promise.resolve()
            .then(() => carregarEdicao(atendimentoEmEdicao))
            .finally(() => {
                if (activo) setCarregandoEdicao(false)
            })

        return () => {
            activo = false
            edicaoRequestRef.current += 1
        }
    }, [atendimentoEmEdicao, carregarEdicao])

    // Modalidades dos servicos presentes no formulario. Só são necessárias
    // quando o serviço tem variantes de preço.
    useEffect(() => {
        if (!atendimentoEmEdicao || itensEdicao.length === 0) return undefined

        let activo = true
        const ids = [...new Set(itensEdicao
            .filter((item) => item.tipo_servico !== "Aplicacao")
            .map((item) => item.servico_id)
            .filter(Boolean))]

        ids.forEach(async (id) => {
            if (modalidadesEdicao[id]) return

            try {
                const res = await getServicoModalidades(id)
                const lista = Array.isArray(res.data) ? res.data : []
                if (activo) {
                    setModalidadesEdicao((anterior) => ({ ...anterior, [id]: lista }))
                }
            } catch {
                if (activo) {
                    setModalidadesEdicao((anterior) => ({ ...anterior, [id]: [] }))
                }
            }
        })

        return () => { activo = false }
    }, [atendimentoEmEdicao, itensEdicao, modalidadesEdicao])

    // Aplicações permitidas pelos serviços principais já presentes no
    // formulário, para que a edição consiga recriar o conjunto realizado.
    useEffect(() => {
        if (!atendimentoEmEdicao || itensEdicao.length === 0) return undefined

        let activo = true
        const ids = [...new Set(itensEdicao
            .filter((item) => item.tipo_servico !== "Aplicacao" && item.servico_id)
            .filter((item) => servicosEdicao.find(
                (servico) => String(servico.id) === String(item.servico_id) && servico.permite_aplicacoes
            ))
            .map((item) => String(item.servico_id)))]

        ids.forEach(async (id) => {
            if (aplicacoesEdicao[id]) return

            try {
                const res = await getServicoAplicacoes(id)
                const lista = Array.isArray(res.data) ? res.data : []
                if (activo) {
                    setAplicacoesEdicao((anterior) => ({ ...anterior, [id]: lista }))
                }
            } catch {
                if (activo) {
                    setAplicacoesEdicao((anterior) => ({ ...anterior, [id]: [] }))
                }
            }
        })

        return () => { activo = false }
    }, [atendimentoEmEdicao, itensEdicao, servicosEdicao, aplicacoesEdicao])

    useEffect(() => {
        if (!atendimentoEmEdicao) return undefined

        function fecharComEscape(event) {
            if (
                event.key === "Escape"
                && !salvandoEdicao
                && !salvandoPagamentoEdicao
                && !anulandoPagamentoEdicao
                && !cartaoEdicaoAberto
            ) {
                setAtendimentoEmEdicao(null)
                setDetalheEdicao(null)
                setErroEdicao(null)
                setSucessoEdicao(null)
                setDataHoraEdicao("")
                setItensEdicao([])
                setModalidadesEdicao({})
                setAplicacoesEdicao({})
                setPagamentoAAnular(null)
                setCartaoEdicaoAberto(false)
            }
        }

        window.addEventListener("keydown", fecharComEscape)
        return () => window.removeEventListener("keydown", fecharComEscape)
    }, [atendimentoEmEdicao, salvandoEdicao, salvandoPagamentoEdicao, anulandoPagamentoEdicao, cartaoEdicaoAberto])

    const atendimentosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        const hoje = startOfDay(new Date())
        const limite = periodo === "7 dias"
            ? subDays(hoje, 6)
            : periodo === "30 dias"
                ? subDays(hoje, 29)
                : null

        return atendimentos.filter((item) => {
            const correspondeEstado = filtro === "Todos" || item.estado === filtro
            if (!correspondeEstado) return false

            const data = dataAtendimento(item.data_hora)
            let correspondePeriodo = periodo === "Todos"
            if (!correspondePeriodo && data) {
                correspondePeriodo = periodo === "Hoje"
                    ? isToday(data)
                    : limite
                        ? isAfter(data, limite)
                        : true
            }
            if (!correspondePeriodo) return false
            if (!termo) return true

            return String(item.cliente_nome || "").toLowerCase().includes(termo)
                || String(item.cliente_apelido || "").toLowerCase().includes(termo)
                || String(item.cliente_telefone || "").includes(termo)
                || String(item.id).includes(termo)
        })
    }, [atendimentos, filtro, periodo, searchTerm])

    const agendamentosFiltrados = useMemo(() => {
        const termo = searchTerm.trim().toLowerCase()
        const hoje = startOfDay(new Date())
        const limite = periodo === "7 dias"
            ? subDays(hoje, 6)
            : periodo === "30 dias"
                ? subDays(hoje, 29)
                : null

        return agendamentos.filter((item) => {
            const data = dataAtendimento(item.criado_em)
            let correspondePeriodo = periodo === "Todos"
            if (!correspondePeriodo && data) {
                correspondePeriodo = periodo === "Hoje"
                    ? isToday(data)
                    : limite
                        ? isAfter(data, limite)
                        : true
            }
            if (!correspondePeriodo) return false
            if (!termo) return true

            return String(item.cliente_nome || "").toLowerCase().includes(termo)
                || String(item.cliente_apelido || "").toLowerCase().includes(termo)
                || String(item.cliente_telefone || "").includes(termo)
                || String(item.id).includes(termo)
        })
    }, [agendamentos, periodo, searchTerm])

    const contagemEstados = useMemo(() => {
        const contagem = { Todos: atendimentos.length }
        ESTADOS.slice(1).forEach((estado) => {
            if (estado === "Agendamento") return
            contagem[estado] = atendimentos.filter((item) => item.estado === estado).length
        })
        contagem.Agendamento = agendamentos.length
        return contagem
    }, [atendimentos, agendamentos])

    const mostrarAgendamentos = filtro === "Agendamento"
    const listaFiltrada = mostrarAgendamentos ? agendamentosFiltrados : atendimentosFiltrados
    const totalLista = mostrarAgendamentos ? agendamentos.length : atendimentos.length
    const rotuloLista = mostrarAgendamentos ? "agendamentos" : "atendimentos"
    const carregandoLista = mostrarAgendamentos ? loadingAgendamentos : loading
    const erroLista = mostrarAgendamentos ? erroAgendamentos : error

    const concluidos = contagemEstados.Concluido || 0
    const anulados = contagemEstados.Anulado || 0
    const totalRecebido = atendimentos.reduce((acc, item) => acc + (Number(item.valor_pago) || 0), 0)
    const totalPendente = atendimentos.reduce((acc, item) => acc + saldoDoAtendimento(item), 0)
    const atendimentosHoje = atendimentos.filter((item) => {
        const data = dataAtendimento(item.data_hora)
        return data ? isToday(data) : false
    }).length
    const temFiltros = Boolean(searchTerm.trim() || filtro !== "Todos" || periodo !== "Todos")
    const temFiltrosLista = Boolean(searchTerm.trim() || periodo !== "Todos")

    const clientesEdicaoDisponiveis = useMemo(() => {
        const idAtual = String(atendimentoEmEdicao?.cliente_id ?? "")
        const lista = clientesEdicao.filter((cliente) => (
            cliente.estado === "Ativo" || String(cliente.id) === idAtual
        ))

        if (idAtual && !lista.some((cliente) => String(cliente.id) === idAtual)) {
            return [{
                id: atendimentoEmEdicao.cliente_id,
                nome: atendimentoEmEdicao.cliente_nome,
                apelido: atendimentoEmEdicao.cliente_apelido,
                telefone: atendimentoEmEdicao.cliente_telefone
            }, ...lista]
        }

        return lista
    }, [atendimentoEmEdicao, clientesEdicao])

    const handleEditar = useCallback((atendimento) => {
        edicaoRequestRef.current += 1
        setAtendimentoEmEdicao(atendimento)
        setDetalheEdicao(null)
        setClientesEdicao([])
        setServicosEdicao([])
        setFuncionariosEdicao([])
        setItensEdicao([])
        setModalidadesEdicao({})
        setAplicacoesEdicao({})
        setFidelizacaoEdicao(null)
        setClienteEdicaoId(String(atendimento.cliente_id ?? ""))
        setDataHoraEdicao(paraInputDataHora(atendimento.data_hora))
        setCarregandoEdicao(true)
        setErroEdicao(null)
        setSucessoEdicao(null)
        setPagamentoAAnular(null)
        setCartaoEdicaoAberto(false)
    }, [])

    const handleAnular = useCallback((atendimento) => {
        setAnulacao(atendimento)
    }, [])

    const handleVerDetalhe = useCallback(async (atendimento) => {
        const pedido = detalheRequestRef.current + 1
        detalheRequestRef.current = pedido
        setDetalhe({ ...atendimento, servicos: [], pagamentos: [] })
        setDetalheError(null)
        setLoadingDetalhe(true)
        setPagamentoForm({ metodo: "Dinheiro", valor: "" })

        try {
            const res = await getAtendimento(atendimento.id)
            if (pedido !== detalheRequestRef.current) return
            setDetalhe(res.data)
            const saldo = saldoDoAtendimento(res.data)
            setPagamentoForm({
                metodo: "Dinheiro",
                valor: saldo > 0 ? String(saldo) : ""
            })
        } catch (err) {
            if (pedido === detalheRequestRef.current) setDetalheError(getApiError(err))
        } finally {
            if (pedido === detalheRequestRef.current) setLoadingDetalhe(false)
        }
    }, [])

    const fecharDetalhe = useCallback(() => {
        if (savingPagamento) return
        detalheRequestRef.current += 1
        setDetalhe(null)
        setDetalheError(null)
        setLoadingDetalhe(false)
    }, [savingPagamento])

    async function confirmarAnulacao(motivo) {
        if (!anulacao) return
        setAAnular(true)
        try {
            await anularAtendimento(anulacao.id, motivo)
            await carregarAtendimentos()
            if (detalhe?.id === anulacao.id) fecharDetalhe()
            setAnulacao(null)
        } catch (err) {
            const mensagem = getApiError(err)
            setError(mensagem)
            if (detalhe) setDetalheError(mensagem)
            setAnulacao(null)
        } finally {
            setAAnular(false)
        }
    }

    function fecharEdicao() {
        if (salvandoEdicao || salvandoPagamentoEdicao || anulandoPagamentoEdicao) return
        edicaoRequestRef.current += 1
        setAtendimentoEmEdicao(null)
        setDetalheEdicao(null)
        setErroEdicao(null)
        setSucessoEdicao(null)
        setDataHoraEdicao("")
        setItensEdicao([])
        setModalidadesEdicao({})
        setAplicacoesEdicao({})
        setPagamentoAAnular(null)
        setCartaoEdicaoAberto(false)
    }

    async function recarregarDetalheEdicao({ sincronizarItens = false } = {}) {
        if (!atendimentoEmEdicao) return null

        const res = await getAtendimento(atendimentoEmEdicao.id)
        const atualizado = res.data

        setDetalheEdicao(atualizado)
        setFidelizacaoEdicao(atualizado.fidelizacao || null)
        if (sincronizarItens) {
            setItensEdicao((atualizado.servicos || []).map(itemEdicaoDeServico))
        }

        const saldoAtual = saldoDoAtendimento(atualizado)
        setPagamentoEdicao((anterior) => ({
            ...anterior,
            valor: saldoAtual > 0 ? String(saldoAtual) : ""
        }))

        return atualizado
    }

    function adicionarItemEdicao() {
        setItensEdicao((anteriores) => [...anteriores, itemEdicaoVazio(novaChaveEdicao())])
        setErroEdicao(null)
        setSucessoEdicao(null)
    }

    function removerItemEdicao(indice) {
        setItensEdicao((anteriores) => {
            if (anteriores.length <= 1) return anteriores

            const removido = anteriores[indice]
            const restantes = anteriores.filter((_, i) => i !== indice)

            // Ao remover um serviço principal, as aplicações associadas
            // deixam de fazer sentido no formulário.
            if (removido.tipo_servico === "Servico") {
                return restantes.filter((item) => (
                    !aplicacaoPertenceAoPrincipal(item, removido, anteriores)
                ))
            }

            return restantes
        })
        setErroEdicao(null)
        setSucessoEdicao(null)
    }

    function alterarItemEdicao(indice, campo, valor) {
        setItensEdicao((anteriores) => anteriores.map((item, i) => (
            i === indice ? { ...item, [campo]: valor } : item
        )))
        if (erroEdicao) setErroEdicao(null)
        if (sucessoEdicao) setSucessoEdicao(null)
    }

    // Ao mudar o cliente, mostra o cartão do novo cliente. O backend recusa
    // a mudança quando já existem movimentos de fidelização neste atendimento.
    async function alterarClienteEdicao(valor) {
        setClienteEdicaoId(valor)
        if (erroEdicao) setErroEdicao(null)
        if (sucessoEdicao) setSucessoEdicao(null)

        if (!valor) {
            setFidelizacaoEdicao(null)
            return
        }

        try {
            const res = await getFidelizacao(valor)
            setFidelizacaoEdicao(res.data || null)
        } catch {
            setFidelizacaoEdicao(null)
        }
    }

    function alterarServicoEdicao(indice, servicoId) {
        const servico = servicosEdicao.find((item) => String(item.id) === String(servicoId))

        setItensEdicao((anteriores) => {
            const principal = anteriores[indice]
            const ehAplicacao = principal?.tipo_servico === "Aplicacao"
            const referenciaPrincipal = principal?.id ? Number(principal.id) : null
            const chavePrincipal = principal?.id ? null : principal?.chave

            const atualizados = anteriores.map((item, i) => (
                i === indice
                    ? {
                        ...item,
                        servico_id: servicoId,
                        servico_nome: servico?.nome || "",
                        tipo_servico: ehAplicacao ? "Aplicacao" : "Servico",
                        modalidade_id: "",
                        modalidade_nome: "",
                        preco_praticado: servico ? String(servico.valor) : "",
                        desconto: "0",
                        servico_principal_id: ehAplicacao ? item.servico_principal_id : null
                    }
                    : item
            ))

            // As aplicações mantêm-se ligadas à mesma linha principal, mesmo
            // quando o serviço dessa linha muda.
            if (!ehAplicacao) {
                return atualizados.map((item) => (
                    aplicacaoPertenceAoPrincipal(item, principal, anteriores)
                        ? {
                            ...item,
                            servico_principal_id: referenciaPrincipal,
                            servico_principal_chave: chavePrincipal
                        }
                        : item
                ))
            }

            return atualizados
        })
        if (erroEdicao) setErroEdicao(null)
        if (sucessoEdicao) setSucessoEdicao(null)
    }

    function adicionarAplicacaoEdicao(indice, aplicacao) {
        setItensEdicao((anteriores) => {
            const principal = anteriores[indice]
            if (!principal?.servico_id) return anteriores

            const jaExiste = anteriores.some((item) => (
                item.tipo_servico === "Aplicacao"
                && String(item.servico_id) === String(aplicacao.id)
                && aplicacaoPertenceAoPrincipal(item, principal, anteriores)
            ))
            if (jaExiste) return anteriores

            return [
                ...anteriores,
                {
                    ...itemEdicaoVazio(novaChaveEdicao()),
                    servico_id: String(aplicacao.id),
                    servico_nome: aplicacao.nome || "",
                    funcionario_id: principal.funcionario_id,
                    tipo_servico: "Aplicacao",
                    // Linha existente usa o id da linha; linha nova usa a
                    // chave temporária resolvida pelo backend após inserir.
                    servico_principal_id: principal.id || null,
                    servico_principal_chave: principal.id ? null : principal.chave,
                    preco_praticado: String(aplicacao.valor ?? "")
                }
            ]
        })
        if (erroEdicao) setErroEdicao(null)
        if (sucessoEdicao) setSucessoEdicao(null)
    }

    function alterarModalidadeEdicao(indice, modalidadeId) {
        const item = itensEdicao[indice]
        const lista = modalidadesEdicao[item?.servico_id] || []
        const modalidade = lista.find((opcao) => String(opcao.id) === String(modalidadeId))

        setItensEdicao((anteriores) => anteriores.map((atual, i) => (
            i === indice
                ? {
                    ...atual,
                    modalidade_id: modalidadeId,
                    modalidade_nome: modalidade?.nome || "",
                    preco_praticado: modalidade ? String(modalidade.valor) : atual.preco_praticado
                }
                : atual
        )))
        if (erroEdicao) setErroEdicao(null)
    }

    async function guardarEdicao(event) {
        event.preventDefault()
        if (!atendimentoEmEdicao || !detalheEdicao || salvandoEdicao) return

        if (!clienteEdicaoId) {
            setErroEdicao("Selecione o cliente do atendimento.")
            return
        }
        if (ehAdministrador && !dataHoraEdicao) {
            setErroEdicao("Indique a data e hora do atendimento.")
            return
        }

        const dataSelecionada = ehAdministrador ? new Date(dataHoraEdicao) : null
        if (ehAdministrador && Number.isNaN(dataSelecionada.getTime())) {
            setErroEdicao("Data e hora do atendimento inválidas.")
            return
        }

        if (itensEdicao.length === 0) {
            setErroEdicao("O atendimento tem de ter pelo menos um serviço.")
            return
        }

        for (let i = 0; i < itensEdicao.length; i++) {
            const item = itensEdicao[i]

            if (item.agendamento_servico_id) continue

            if (!item.servico_id || !item.funcionario_id) {
                setErroEdicao(`Preencha o serviço e o funcionário da linha ${i + 1}.`)
                return
            }

            const preco = Number(item.preco_praticado)
            const desconto = Number(item.desconto || 0)

            if (!Number.isInteger(preco) || preco <= 0) {
                setErroEdicao(`O preço da linha ${i + 1} deve ser um valor inteiro maior que zero.`)
                return
            }
            if (!Number.isInteger(desconto) || desconto < 0 || desconto > preco) {
                setErroEdicao(`O desconto da linha ${i + 1} deve ficar entre 0 e ${preco} MT.`)
                return
            }
        }

        const totalNovo = totalEdicao(itensEdicao)
        const valorPago = Number(detalheEdicao.valor_pago || 0)

        if (totalNovo < valorPago) {
            setErroEdicao(
                `O total (${formatarMoeda(totalNovo)}) não pode ficar abaixo do valor já pago (${formatarMoeda(valorPago)}). Anule pagamentos antes de guardar.`
            )
            return
        }

        setSalvandoEdicao(true)
        setErroEdicao(null)
        setSucessoEdicao(null)

        try {
            const payload = {
                cliente_id: Number(clienteEdicaoId),
                servicos: itensEdicao.map((item) => {
                    const base = {
                        servico_id: Number(item.servico_id),
                        funcionario_id: Number(item.funcionario_id),
                        preco_praticado: Number(item.preco_praticado),
                        desconto: Math.round(Number(item.desconto || 0)),
                        tipo_servico: item.tipo_servico || "Servico"
                    }

                    if (item.id) base.id = Number(item.id)
                    if (!item.id && item.chave) base.chave = item.chave
                    if (item.modalidade_id) {
                        base.modalidade_id = Number(item.modalidade_id)
                        base.modalidade_nome = item.modalidade_nome || undefined
                    }
                    if (item.servico_principal_id) {
                        base.servico_principal_id = Number(item.servico_principal_id)
                    }
                    if (item.servico_principal_chave) {
                        base.servico_principal_chave = item.servico_principal_chave
                    }

                    return base
                })
            }

            if (ehAdministrador && dataSelecionada) {
                payload.data_hora = dataSelecionada.toISOString()
            }

            await updateAtendimento(atendimentoEmEdicao.id, payload)
            setAtendimentoEmEdicao(null)
            setDetalheEdicao(null)
            setDataHoraEdicao("")
            await carregarAtendimentos()
        } catch (err) {
            setErroEdicao(getApiError(err))
        } finally {
            setSalvandoEdicao(false)
        }
    }

    function alterarPagamentoEdicao(campo, valor) {
        setPagamentoEdicao((anterior) => ({ ...anterior, [campo]: valor }))
        if (erroEdicao) setErroEdicao(null)
        if (sucessoEdicao) setSucessoEdicao(null)
    }

    async function registarPagamentoEdicao(event) {
        event.preventDefault()
        if (!detalheEdicao || salvandoPagamentoEdicao) return

        const saldo = saldoDoAtendimento(detalheEdicao)
        const valor = Number(pagamentoEdicao.valor)

        if (!valor || valor <= 0) {
            setErroEdicao("Indique um valor de pagamento maior que zero.")
            return
        }
        if (valor > saldo) {
            setErroEdicao(`O valor não pode exceder o saldo em falta (${formatarMoeda(saldo)}).`)
            return
        }
        if (!pagamentoEdicao.metodo) {
            setErroEdicao("Selecione a forma de pagamento.")
            return
        }

        setSalvandoPagamentoEdicao(true)
        setErroEdicao(null)
        setSucessoEdicao(null)

        try {
            await registrarPagamento(detalheEdicao.id, {
                parcelas: [{
                    metodo_pagamento: pagamentoEdicao.metodo,
                    valor
                }]
            })
            await recarregarDetalheEdicao()
            await carregarAtendimentos()
            setSucessoEdicao("Pagamento registado com sucesso.")
        } catch (err) {
            setErroEdicao(getApiError(err))
        } finally {
            setSalvandoPagamentoEdicao(false)
        }
    }

    async function confirmarAnulacaoPagamento(motivo) {
        if (!pagamentoAAnular || anulandoPagamentoEdicao) return

        setAnulandoPagamentoEdicao(true)
        setErroEdicao(null)
        setSucessoEdicao(null)

        try {
            await anularPagamento(pagamentoAAnular.id, motivo)
            setPagamentoAAnular(null)
            await recarregarDetalheEdicao()
            await carregarAtendimentos()
            setSucessoEdicao("Pagamento anulado com sucesso.")
        } catch (err) {
            setErroEdicao(getApiError(err))
            setPagamentoAAnular(null)
        } finally {
            setAnulandoPagamentoEdicao(false)
        }
    }

    async function recarregarDetalhe(id) {
        const res = await getAtendimento(id)
        setDetalhe(res.data)
        const saldo = saldoDoAtendimento(res.data)
        setPagamentoForm((anterior) => ({
            ...anterior,
            valor: saldo > 0 ? String(saldo) : ""
        }))
        return res.data
    }

    function alterarPagamento(campo, valor) {
        setPagamentoForm((anterior) => ({ ...anterior, [campo]: valor }))
        if (detalheError) setDetalheError(null)
    }

    async function handleRegistarPagamento(event) {
        event.preventDefault()
        if (!detalhe || savingPagamento) return

        const saldo = saldoDoAtendimento(detalhe)
        const valor = Number(pagamentoForm.valor)

        if (!valor || valor <= 0) {
            setDetalheError("Indique um valor maior que zero")
            return
        }
        if (valor > saldo) {
            setDetalheError(`O valor não pode exceder o saldo em falta (${formatarMoeda(saldo)})`)
            return
        }
        if (!pagamentoForm.metodo) {
            setDetalheError("Selecione a forma de pagamento")
            return
        }

        setSavingPagamento(true)
        setDetalheError(null)
        try {
            await registrarPagamento(detalhe.id, {
                parcelas: [{
                    metodo_pagamento: pagamentoForm.metodo,
                    valor
                }]
            })
            await recarregarDetalhe(detalhe.id)
            await carregarAtendimentos()
        } catch (err) {
            setDetalheError(getApiError(err))
        } finally {
            setSavingPagamento(false)
        }
    }

    function limparFiltros() {
        setSearchTerm("")
        setFiltro("Todos")
        setPeriodo("Todos")
    }

    function limparFiltrosLista() {
        setSearchTerm("")
        setPeriodo("Todos")
    }

    function exportarAtendimentos() {
        if (!gridApiRef.current || !atendimentosFiltrados.length) return
        gridApiRef.current.exportDataAsCsv({
            fileName: `atendimentos-${format(new Date(), "yyyy-MM-dd")}.csv`,
            columnKeys: (gridApiRef.current.getColumns() || [])
                .filter((coluna) => coluna.getColId() !== "acoes")
                .map((coluna) => coluna.getColId())
        })
    }

    function exportarAgendamentos() {
        if (!agendaGridApiRef.current || !agendamentosFiltrados.length) return
        agendaGridApiRef.current.exportDataAsCsv({
            fileName: `agendamentos-${format(new Date(), "yyyy-MM-dd")}.csv`,
            columnKeys: (agendaGridApiRef.current.getColumns() || [])
                .filter((coluna) => coluna.getColId() !== "acoes")
                .map((coluna) => coluna.getColId())
        })
    }

    const columnDefs = useMemo(() => [
        {
            headerName: "Cliente",
            field: "cliente_nome",
            flex: 1.7,
            minWidth: 220,
            cellRenderer: ClienteAtendimentoCell
        },
        {
            headerName: "Data",
            field: "data_hora",
            flex: 1,
            minWidth: 140,
            cellRenderer: DataAtendimentoCell,
            valueFormatter: (params) => formatarData(params.value),
            comparator: (a, b) => new Date(a || 0) - new Date(b || 0)
        },
        {
            headerName: "Estado",
            field: "estado",
            flex: 0,
            width: 130,
            minWidth: 130,
            cellRenderer: EstadoAtendimentoCell
        },
        {
            headerName: "Pagamento",
            field: "metodos_pagamento",
            flex: 1,
            minWidth: 180,
            cellRenderer: PagamentoAtendimentoCell
        },
        {
            headerName: "Total",
            field: "valor_total",
            flex: 0.8,
            minWidth: 125,
            cellRenderer: TotalAtendimentoCell
        },
        {
            headerName: "Ações",
            colId: "acoes",
            flex: 0,
            width: 142,
            minWidth: 142,
            maxWidth: 142,
            pinned: "right",
            sortable: false,
            filter: false,
            resizable: false,
            cellRenderer: AcoesAtendimentoCell,
            cellRendererParams: {
                podeEditar,
                podeAnular,
                onVer: handleVerDetalhe,
                onEditar: handleEditar,
                onAnular: handleAnular
            }
        }
    ], [podeEditar, podeAnular, handleVerDetalhe, handleEditar, handleAnular])

    const columnDefsAgendamentos = useMemo(() => [
        {
            headerName: "Cliente",
            field: "cliente_nome",
            flex: 1.7,
            minWidth: 220,
            cellRenderer: ClienteAtendimentoCell,
            cellRendererParams: { rotulo: "Agendamento" }
        },
        {
            headerName: "Criado em",
            field: "criado_em",
            flex: 1,
            minWidth: 140,
            cellRenderer: DataAtendimentoCell,
            valueFormatter: (params) => formatarData(params.value),
            comparator: (a, b) => new Date(a || 0) - new Date(b || 0)
        },
        {
            headerName: "Serviços",
            field: "quantidade_restante",
            flex: 0.9,
            minWidth: 160,
            cellRenderer: ServicosAgendamentoCell
        },
        {
            headerName: "Estado",
            field: "estado",
            flex: 0,
            width: 140,
            minWidth: 140,
            cellRenderer: EstadoAgendamentoCell
        },
        {
            headerName: "Pagamento",
            field: "saldo",
            flex: 1,
            minWidth: 180,
            cellRenderer: PagamentoAgendamentoCell
        },
        {
            headerName: "Total",
            field: "valor_total",
            flex: 0.8,
            minWidth: 125,
            cellRenderer: TotalAtendimentoCell
        },
        {
            headerName: "Ações",
            colId: "acoes",
            flex: 0,
            width: 92,
            minWidth: 92,
            maxWidth: 92,
            pinned: "right",
            sortable: false,
            filter: false,
            resizable: false,
            cellRenderer: AcoesAgendamentoCell,
            cellRendererParams: {
                onAbrir: () => navigate("/agendamentos")
            }
        }
    ], [navigate])

    const mensagemVazia = temFiltros
        ? "Nenhum atendimento corresponde aos filtros aplicados."
        : "Registe o primeiro atendimento para começar a acompanhar o movimento do salão."
    const mensagemVaziaAgendamentos = temFiltrosLista
        ? "Nenhum agendamento corresponde aos filtros aplicados."
        : "Não há agendamentos com serviços por consumir."

    return (
        <>
            {isModalOpen && (
                <NewMarkModal
                    onclose={() => setIsModalOpen(false)}
                    onSuccess={carregarAtendimentos}
                />
            )}

            {anulacao && (
                <ConfirmDialog
                    open
                    title="Apagar atendimento?"
                    description={`O atendimento #${anulacao.id} de ${anulacao.cliente_nome} deixará de contar para o movimento. O histórico e os pagamentos associados são mantidos. Indique o motivo da anulação.`}
                    tone="danger"
                    icon={Trash2}
                    confirmLabel="Apagar atendimento"
                    withReason
                    reasonLabel="Motivo da anulação"
                    reasonPlaceholder="Ex.: cliente desistiu, serviço registado por engano..."
                    loading={aAnular}
                    onConfirm={confirmarAnulacao}
                    onClose={() => !aAnular && setAnulacao(null)}
                />
            )}

            {atendimentoEmEdicao && (
                <div className="appointment-modal-backdrop" onClick={fecharEdicao}>
                    <section
                        className="appointment-detail appointment-edit"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="editar-atendimento-titulo"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="appointment-detail-header">
                            <div>
                                <h2 id="editar-atendimento-titulo">Editar atendimento #{atendimentoEmEdicao.id}</h2>
                                <p>
                                    {detalheEdicao?.cliente_nome || atendimentoEmEdicao.cliente_nome}{" "}
                                    {detalheEdicao?.cliente_apelido || atendimentoEmEdicao.cliente_apelido || ""} ·{" "}
                                    {formatarData(detalheEdicao?.data_hora || atendimentoEmEdicao.data_hora)}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="appointment-close"
                                onClick={fecharEdicao}
                                disabled={salvandoEdicao || salvandoPagamentoEdicao || anulandoPagamentoEdicao}
                                aria-label="Fechar edição"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <form className="appointment-edit-form" onSubmit={guardarEdicao} aria-busy={salvandoEdicao}>
                            <div className="appointment-detail-body">
                                {erroEdicao && <div className="appointment-alert" role="alert">{erroEdicao}</div>}
                                {sucessoEdicao && (
                                    <div className="appointment-success" role="status">
                                        <CheckCircle2 size={16} /> {sucessoEdicao}
                                    </div>
                                )}

                                {carregandoEdicao ? (
                                    <p className="appointment-empty">A carregar informações do atendimento...</p>
                                ) : !detalheEdicao ? (
                                    <p className="appointment-empty">Não foi possível carregar o atendimento.</p>
                                ) : (
                                    <>
                                        <section className="appointment-detail-section">
                                            <h3><UserRound size={16} /> Cliente e data</h3>
                                            <div className="appointment-edit-grid">
                                                <div className="appointment-edit-field">
                                                    <label htmlFor="cliente-edicao">Cliente do atendimento</label>
                                                    <select
                                                        id="cliente-edicao"
                                                        value={clienteEdicaoId}
                                                        onChange={(event) => alterarClienteEdicao(event.target.value)}
                                                        disabled={salvandoEdicao}
                                                    >
                                                        <option value="">Selecione o cliente...</option>
                                                        {clientesEdicaoDisponiveis.map((cliente) => (
                                                            <option key={cliente.id} value={cliente.id}>
                                                                {cliente.nome} {cliente.apelido || ""}{cliente.telefone ? ` — ${cliente.telefone}` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {ehAdministrador && (
                                                    <div className="appointment-edit-field">
                                                        <label htmlFor="data-hora-edicao">Data e hora</label>
                                                        <input
                                                            id="data-hora-edicao"
                                                            type="datetime-local"
                                                            value={dataHoraEdicao}
                                                            onChange={(event) => {
                                                                setDataHoraEdicao(event.target.value)
                                                                if (erroEdicao) setErroEdicao(null)
                                                            }}
                                                            disabled={salvandoEdicao}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="appointment-payment-hint">
                                                {ehAdministrador
                                                    ? "A data é exclusiva do Administrador. Se o atendimento já tiver fidelização, não é possível trocar de cliente."
                                                    : "Pode corrigir cliente, serviços, valores, pagamentos e fidelização. A data continua reservada ao Administrador."}
                                            </p>
                                        </section>

                                        <section className="appointment-detail-section">
                                            <div className="edit-section-head">
                                                <h3><ScissorsIcon size={16} /> Serviços</h3>
                                                <button
                                                    type="button"
                                                    className="edit-add-item"
                                                    onClick={adicionarItemEdicao}
                                                    disabled={salvandoEdicao}
                                                >
                                                    <Plus size={14} /> Adicionar serviço
                                                </button>
                                            </div>

                                            <div className="edit-items">
                                                {itensEdicao.map((item, indice) => {
                                                    const servicoSelecionado = servicosEdicao.find(
                                                        (servico) => String(servico.id) === String(item.servico_id)
                                                    )
                                                    const ehAplicacao = item.tipo_servico === "Aplicacao"
                                                    const prepago = Boolean(item.agendamento_servico_id)
                                                    const modalidades = ehAplicacao
                                                        ? []
                                                        : (modalidadesEdicao[item.servico_id] || [])
                                                    const aplicacoes = !ehAplicacao && servicoSelecionado?.permite_aplicacoes
                                                        ? (aplicacoesEdicao[item.servico_id] || [])
                                                        : []
                                                    const aplicacoesAssociadas = itensEdicao.filter((outro) => (
                                                        aplicacaoPertenceAoPrincipal(outro, item, itensEdicao)
                                                    ))
                                                    const opcoesServico = servicosEdicao.filter((servico) => (
                                                        ehAplicacao
                                                            ? servico.tipo_servico === "Aplicacao"
                                                            : servico.tipo_servico !== "Aplicacao"
                                                    ))
                                                    const servicoNaLista = opcoesServico.some(
                                                        (servico) => String(servico.id) === String(item.servico_id)
                                                    )
                                                    const funcionariosDisponiveis = funcionariosEdicao.filter((funcionario) => (
                                                        funcionario.estado === "Ativo"
                                                        || String(funcionario.id) === String(item.funcionario_id)
                                                    ))
                                                    const preco = Number(item.preco_praticado) || 0
                                                    const desconto = Number(item.desconto) || 0

                                                    return (
                                                        <article
                                                            className={`edit-item ${prepago ? "locked" : ""}`}
                                                            key={item.chave || item.id || `linha-${indice}`}
                                                        >
                                                            <header className="edit-item-head">
                                                                <strong>
                                                                    {ehAplicacao ? "Aplicação" : "Serviço"} {indice + 1}
                                                                    {prepago ? " · agendamento pré-pago" : ""}
                                                                </strong>
                                                                <button
                                                                    type="button"
                                                                    className="edit-item-remove"
                                                                    onClick={() => removerItemEdicao(indice)}
                                                                    disabled={prepago || itensEdicao.length <= 1 || salvandoEdicao}
                                                                    title={prepago
                                                                        ? "Serviço consumido de agendamento pré-pago não pode ser removido"
                                                                        : "Remover linha"}
                                                                    aria-label={`Remover ${ehAplicacao ? "aplicação" : "serviço"} ${indice + 1}`}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </header>

                                                            {prepago ? (
                                                                <div className="edit-item-locked">
                                                                    <Lock size={16} />
                                                                    <div>
                                                                        <strong>{item.servico_nome || servicoSelecionado?.nome || `Serviço #${item.servico_id}`}</strong>
                                                                        <span>
                                                                            {item.funcionario_nome || funcionariosEdicao.find(
                                                                                (funcionario) => String(funcionario.id) === String(item.funcionario_id)
                                                                            )?.nome || "—"} · {formatarMoeda(preco)}
                                                                        </span>
                                                                        <small>Consumido de agendamento pré-pago: não pode ser alterado nem removido.</small>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="edit-item-grid">
                                                                        <div className="appointment-edit-field">
                                                                            <label>Serviço</label>
                                                                            <select
                                                                                value={item.servico_id}
                                                                                onChange={(event) => alterarServicoEdicao(indice, event.target.value)}
                                                                                disabled={salvandoEdicao}
                                                                            >
                                                                                <option value="">Selecione...</option>
                                                                                {opcoesServico.map((servico) => (
                                                                                    <option key={servico.id} value={servico.id}>
                                                                                        {servico.nome} · {formatarMoeda(servico.valor)}
                                                                                    </option>
                                                                                ))}
                                                                                {!servicoNaLista && item.servico_id && (
                                                                                    <option value={item.servico_id}>
                                                                                        {item.servico_nome || `Serviço #${item.servico_id}`}
                                                                                    </option>
                                                                                )}
                                                                            </select>
                                                                        </div>

                                                                        <div className="appointment-edit-field">
                                                                            <label>Funcionário</label>
                                                                            <select
                                                                                value={item.funcionario_id}
                                                                                onChange={(event) => alterarItemEdicao(indice, "funcionario_id", event.target.value)}
                                                                                disabled={salvandoEdicao}
                                                                            >
                                                                                <option value="">Selecione...</option>
                                                                                {funcionariosDisponiveis.map((funcionario) => (
                                                                                    <option key={funcionario.id} value={funcionario.id}>
                                                                                        {funcionario.nome}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        {modalidades.length > 0 && (
                                                                            <div className="appointment-edit-field">
                                                                                <label>Modalidade</label>
                                                                                <select
                                                                                    value={item.modalidade_id}
                                                                                    onChange={(event) => alterarModalidadeEdicao(indice, event.target.value)}
                                                                                    disabled={salvandoEdicao}
                                                                                >
                                                                                    <option value="">Preço base</option>
                                                                                    {modalidades.map((modalidade) => (
                                                                                        <option key={modalidade.id} value={modalidade.id}>
                                                                                            {modalidade.nome} ({modalidade.faixa_etaria || "todas"}) · {formatarMoeda(modalidade.valor)}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        )}

                                                                        <div className="appointment-edit-field">
                                                                            <label>Preço (MT)</label>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                step="1"
                                                                                value={item.preco_praticado}
                                                                                onChange={(event) => alterarItemEdicao(indice, "preco_praticado", event.target.value)}
                                                                                disabled={salvandoEdicao}
                                                                            />
                                                                        </div>

                                                                        <div className="appointment-edit-field">
                                                                            <label>Desconto (MT)</label>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={preco}
                                                                                step="1"
                                                                                value={item.desconto}
                                                                                onChange={(event) => alterarItemEdicao(indice, "desconto", event.target.value)}
                                                                                disabled={salvandoEdicao}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <footer className="edit-item-foot">
                                                                        <span>
                                                                            Linha: <strong>{formatarMoeda(Math.max(preco - desconto, 0))}</strong>
                                                                        </span>

                                                                        {ehAplicacao ? (
                                                                            <span className="edit-item-parent">
                                                                                <Tag size={13} /> Aplicação associada ao serviço principal
                                                                            </span>
                                                                        ) : aplicacoes.length > 0 && (
                                                                            <div className="edit-apps">
                                                                                {aplicacoesAssociadas.length > 0 && (
                                                                                    <div className="edit-apps-tags">
                                                                                        {aplicacoesAssociadas.map((associada) => {
                                                                                            const indiceAssociada = itensEdicao.findIndex(
                                                                                                (outro) => outro === associada
                                                                                            )

                                                                                            return (
                                                                                                <span className="edit-app-tag" key={associada.id || `app-${indiceAssociada}`}>
                                                                                                    {associada.servico_nome || servicosEdicao.find(
                                                                                                        (servico) => String(servico.id) === String(associada.servico_id)
                                                                                                    )?.nome || "Aplicação"}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => removerItemEdicao(indiceAssociada)}
                                                                                                        disabled={salvandoEdicao}
                                                                                                        title="Remover aplicação"
                                                                                                    >
                                                                                                        <X size={12} />
                                                                                                    </button>
                                                                                                </span>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                                <div className="edit-apps-add">
                                                                                    {aplicacoes
                                                                                        .filter((aplicacao) => !aplicacoesAssociadas.some(
                                                                                            (associada) => String(associada.servico_id) === String(aplicacao.id)
                                                                                        ))
                                                                                        .map((aplicacao) => (
                                                                                            <button
                                                                                                key={aplicacao.id}
                                                                                                type="button"
                                                                                                className="edit-add-app"
                                                                                                onClick={() => adicionarAplicacaoEdicao(indice, aplicacao)}
                                                                                                disabled={salvandoEdicao}
                                                                                            >
                                                                                                <Plus size={12} /> {aplicacao.nome} ({formatarMoeda(aplicacao.valor)})
                                                                                            </button>
                                                                                        ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </footer>
                                                                </>
                                                            )}
                                                        </article>
                                                    )
                                                })}
                                            </div>

                                            <div className="edit-totals">
                                                <span>
                                                    Total atual <strong>{formatarMoeda(detalheEdicao.valor_total)}</strong>
                                                </span>
                                                <span>
                                                    Novo total <strong>{formatarMoeda(totalEdicao(itensEdicao))}</strong>
                                                </span>
                                            </div>
                                        </section>

                                        <section className="appointment-detail-section">
                                            <h3><CreditCard size={16} /> Pagamentos</h3>

                                            <div className="edit-payment-summary">
                                                <span>Total <strong>{formatarMoeda(detalheEdicao.valor_total)}</strong></span>
                                                <span>Pago <strong>{formatarMoeda(detalheEdicao.valor_pago)}</strong></span>
                                                <span className={saldoDoAtendimento(detalheEdicao) > 0 ? "saldo-pendente" : "saldo-zero"}>
                                                    Saldo <strong>{formatarMoeda(saldoDoAtendimento(detalheEdicao))}</strong>
                                                </span>
                                            </div>

                                            {detalheEdicao.pagamentos?.length ? (
                                                <div className="appointment-payments">
                                                    {detalheEdicao.pagamentos.map((pagamento) => (
                                                        <div key={pagamento.id} className="appointment-payment">
                                                            <div className="appointment-payment-head">
                                                                <strong>Pagamento #{pagamento.id}</strong>
                                                                <span className={`status-badge ${pagamento.estado === "Anulado" ? "anulado" : pagamento.estado === "Liquidado" ? "pago" : "pendente"}`}>
                                                                    {pagamento.estado}
                                                                </span>
                                                                <span>{formatarData(pagamento.data_hora)}</span>
                                                            </div>
                                                            <ul>
                                                                {(pagamento.parcelas || []).map((parcela) => (
                                                                    <li key={parcela.id}>
                                                                        <span>{parcela.metodo_pagamento}</span>
                                                                        <strong>{formatarMoeda(parcela.valor)}</strong>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            {pagamento.motivo_anulacao && (
                                                                <p className="appointment-reason">Motivo: {pagamento.motivo_anulacao}</p>
                                                            )}
                                                            {podeAnularPagamento && pagamento.estado !== "Anulado" && detalheEdicao.estado !== "Anulado" && (
                                                                <div className="edit-payment-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="edit-payment-void"
                                                                        onClick={() => setPagamentoAAnular(pagamento)}
                                                                        disabled={salvandoPagamentoEdicao || anulandoPagamentoEdicao}
                                                                    >
                                                                        <Ban size={14} /> Anular pagamento
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="appointment-empty">Ainda não existem pagamentos registados.</p>
                                            )}

                                            {podePagar && detalheEdicao.estado !== "Anulado" && saldoDoAtendimento(detalheEdicao) > 0 && (
                                                <div
                                                    className="edit-payment-form"
                                                    onKeyDown={(event) => {
                                                        if (event.key !== "Enter" || event.target.tagName === "BUTTON") return
                                                        event.preventDefault()
                                                        registarPagamentoEdicao(event)
                                                    }}
                                                >
                                                    <div className="appointment-payment-grid">
                                                        <div>
                                                            <label>Forma de pagamento</label>
                                                            <select
                                                                value={pagamentoEdicao.metodo}
                                                                onChange={(event) => alterarPagamentoEdicao("metodo", event.target.value)}
                                                                disabled={salvandoPagamentoEdicao}
                                                            >
                                                                {FORMAS_PAGAMENTO.map((forma) => (
                                                                    <option key={forma} value={forma}>{forma}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label>Valor (MT)</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={saldoDoAtendimento(detalheEdicao)}
                                                                step="1"
                                                                value={pagamentoEdicao.valor}
                                                                onChange={(event) => alterarPagamentoEdicao("valor", event.target.value)}
                                                                disabled={salvandoPagamentoEdicao}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="submit-btn"
                                                            onClick={registarPagamentoEdicao}
                                                            disabled={salvandoPagamentoEdicao || !pagamentoEdicao.valor}
                                                        >
                                                            {salvandoPagamentoEdicao ? "A registar..." : "Registar pagamento"}
                                                        </button>
                                                    </div>
                                                    <p className="appointment-payment-hint">
                                                        Para corrigir um pagamento, anule o registo anterior e crie um novo.
                                                        Saldo em falta: <strong>{formatarMoeda(saldoDoAtendimento(detalheEdicao))}</strong>.
                                                    </p>
                                                </div>
                                            )}
                                        </section>

                                        <section className="appointment-detail-section">
                                            <h3><Heart size={16} /> Fidelização do cliente</h3>
                                            <FidelizacaoCard fidelizacao={fidelizacaoEdicao} compact />
                                            <p className="appointment-payment-hint">
                                                Alterar serviços ou valores não recalcula automaticamente as marcas já registadas.
                                                Use o cartão do cliente para corrigir marcas ou benefícios.
                                            </p>
                                            <div className="edit-loyalty-actions">
                                                <button
                                                    type="button"
                                                    className="edit-loyalty-btn"
                                                    onClick={() => setCartaoEdicaoAberto(true)}
                                                    disabled={salvandoEdicao || !clienteEdicaoId}
                                                >
                                                    <Heart size={15} /> Gerir cartão de fidelização
                                                </button>
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>

                            <footer className="appointment-detail-footer">
                                <span className="edit-footer-summary">
                                    Novo total <strong>{formatarMoeda(totalEdicao(itensEdicao))}</strong>
                                </span>
                                <button
                                    type="button"
                                    className="appointment-close-btn"
                                    onClick={fecharEdicao}
                                    disabled={salvandoEdicao || salvandoPagamentoEdicao || anulandoPagamentoEdicao}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="appointment-edit-submit"
                                    disabled={
                                        salvandoEdicao
                                        || carregandoEdicao
                                        || !detalheEdicao
                                        || !clienteEdicaoId
                                        || itensEdicao.length === 0
                                        || (ehAdministrador && !dataHoraEdicao)
                                    }
                                >
                                    {salvandoEdicao ? "A guardar..." : "Guardar alterações"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {pagamentoAAnular && (
                <ConfirmDialog
                    open
                    title="Anular pagamento?"
                    description={`O pagamento #${pagamentoAAnular.id} de ${formatarMoeda(pagamentoAAnular.valor_total)} será anulado sem apagar o histórico. O saldo do atendimento é recalculado e as comissões associadas são atualizadas.`}
                    tone="danger"
                    icon={Ban}
                    confirmLabel="Anular pagamento"
                    withReason
                    reasonLabel="Motivo da anulação"
                    reasonPlaceholder="Ex.: valor registado por engano, forma de pagamento incorrecta..."
                    loading={anulandoPagamentoEdicao}
                    onConfirm={confirmarAnulacaoPagamento}
                    onClose={() => !anulandoPagamentoEdicao && setPagamentoAAnular(null)}
                />
            )}

            {cartaoEdicaoAberto && detalheEdicao && (
                <CartaoClienteModal
                    key={`cartao-edicao-${clienteEdicaoId}`}
                    cliente={clientesEdicaoDisponiveis.find(
                        (cliente) => String(cliente.id) === String(clienteEdicaoId)
                    ) || {
                        id: detalheEdicao.cliente_id,
                        nome: detalheEdicao.cliente_nome,
                        apelido: detalheEdicao.cliente_apelido,
                        telefone: detalheEdicao.cliente_telefone
                    }}
                    onclose={() => setCartaoEdicaoAberto(false)}
                    onSuccess={(progresso) => {
                        if (progresso) setFidelizacaoEdicao(progresso)
                    }}
                />
            )}

            {detalhe && (
                <div className="appointment-modal-backdrop" onClick={fecharDetalhe}>
                    <section className="appointment-detail" onClick={(event) => event.stopPropagation()}>
                        <header className="appointment-detail-header">
                            <div>
                                <h2>Atendimento #{detalhe.id}</h2>
                                <p>{detalhe.cliente_nome} {detalhe.cliente_apelido || ""} · {formatarData(detalhe.data_hora)}</p>
                            </div>
                            <button
                                type="button"
                                className="appointment-close"
                                onClick={fecharDetalhe}
                                disabled={savingPagamento}
                                aria-label="Fechar detalhe"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="appointment-detail-body">
                            {detalheError && <div className="appointment-alert">{detalheError}</div>}

                            <div className="appointment-detail-summary">
                                <span className={`status-badge ${classeEstado(detalhe.estado)}`}>
                                    {rotuloEstado(detalhe.estado)}
                                </span>
                                <div className="appointment-detail-summary-values">
                                    <span>Total <strong>{formatarMoeda(detalhe.valor_total)}</strong></span>
                                    <span>Pago <strong>{formatarMoeda(detalhe.valor_pago)}</strong></span>
                                    <span className={saldoDoAtendimento(detalhe) > 0 ? "saldo-pendente" : "saldo-zero"}>
                                        Saldo <strong>{formatarMoeda(saldoDoAtendimento(detalhe))}</strong>
                                    </span>
                                </div>
                            </div>

                            {loadingDetalhe ? (
                                <p className="appointment-empty">A carregar informações completas...</p>
                            ) : (
                                <>
                                    <section className="appointment-detail-section">
                                        <h3><UserRound size={16} /> Cliente</h3>
                                        <div className="appointment-info-grid">
                                            <div>
                                                <span>Nome</span>
                                                <strong>{detalhe.cliente_nome} {detalhe.cliente_apelido || ""}</strong>
                                            </div>
                                            <div>
                                                <span>Telefone</span>
                                                <strong><Phone size={13} /> {detalhe.cliente_telefone || "—"}</strong>
                                            </div>
                                            <div>
                                                <span>Registado por</span>
                                                <strong>{detalhe.registado_por_nome || "Sistema"}</strong>
                                            </div>
                                            <div>
                                                <span>Data</span>
                                                <strong><Clock3 size={13} /> {formatarData(detalhe.data_hora)}</strong>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><ScissorsIcon size={16} /> Serviços realizados</h3>
                                        {detalhe.servicos?.length ? (
                                            <ul className="appointment-services">
                                                {detalhe.servicos.map((item) => (
                                                    <li key={item.id}>
                                                        <span className="appointment-service-info">
                                                            <span className="appointment-service-name">
                                                                <ScissorsIcon size={16} />
                                                                {item.servico_nome}
                                                                {item.elegivel_fidelizacao && (
                                                                    <span className="appointment-loyalty-tag">
                                                                        <Heart size={11} /> Fidelização
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <small>{item.categoria_nome || "Sem categoria"}</small>
                                                        </span>
                                                        <span>{item.funcionario_nome}</span>
                                                        <strong>{formatarMoeda(item.valor_final)}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="appointment-empty">Nenhum serviço associado.</p>
                                        )}

                                        <div className="appointment-totals">
                                            <span>Bruto <strong>{formatarMoeda(detalhe.valor_bruto)}</strong></span>
                                            <span>Desconto <strong>{formatarMoeda(detalhe.valor_desconto)}</strong></span>
                                            <span>Total <strong>{formatarMoeda(detalhe.valor_total)}</strong></span>
                                        </div>
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><CreditCard size={16} /> Pagamentos</h3>
                                        {detalhe.pagamentos?.length ? (
                                            <div className="appointment-payments">
                                                {detalhe.pagamentos.map((pagamento) => (
                                                    <div key={pagamento.id} className="appointment-payment">
                                                        <div className="appointment-payment-head">
                                                            <strong>Pagamento #{pagamento.id}</strong>
                                                            <span className={`status-badge ${pagamento.estado === "Anulado" ? "anulado" : pagamento.estado === "Liquidado" ? "pago" : "pendente"}`}>
                                                                {pagamento.estado}
                                                            </span>
                                                            <span>{formatarData(pagamento.data_hora)}</span>
                                                        </div>
                                                        <ul>
                                                            {(pagamento.parcelas || []).map((parcela) => (
                                                                <li key={parcela.id}>
                                                                    <span>{parcela.metodo_pagamento}</span>
                                                                    <strong>{formatarMoeda(parcela.valor)}</strong>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {pagamento.motivo_anulacao && (
                                                            <p className="appointment-reason">Motivo: {pagamento.motivo_anulacao}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="appointment-empty">Ainda não existem pagamentos registados.</p>
                                        )}
                                    </section>

                                    <section className="appointment-detail-section">
                                        <h3><Heart size={16} /> Fidelização do cliente</h3>
                                        <FidelizacaoCard fidelizacao={detalhe.fidelizacao} compact />
                                    </section>

                                    {podePagar && saldoDoAtendimento(detalhe) > 0 && detalhe.estado !== "Anulado" && (
                                        <section className="appointment-detail-section appointment-payment-section">
                                            <h3><Wallet size={16} /> Registar pagamento</h3>
                                            <form className="appointment-payment-form" onSubmit={handleRegistarPagamento}>
                                                <div className="appointment-payment-grid">
                                                    <div>
                                                        <label>Forma de pagamento</label>
                                                        <select
                                                            value={pagamentoForm.metodo}
                                                            onChange={(event) => alterarPagamento("metodo", event.target.value)}
                                                        >
                                                            {FORMAS_PAGAMENTO.map((forma) => (
                                                                <option key={forma} value={forma}>{forma}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label>Valor (MT)</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={saldoDoAtendimento(detalhe)}
                                                            step="1"
                                                            value={pagamentoForm.valor}
                                                            onChange={(event) => alterarPagamento("valor", event.target.value)}
                                                        />
                                                    </div>
                                                    <button type="submit" className="submit-btn" disabled={savingPagamento}>
                                                        {savingPagamento ? "A registar..." : "Registar pagamento"}
                                                    </button>
                                                </div>
                                                <p className="appointment-payment-hint">
                                                    Saldo em falta: <strong>{formatarMoeda(saldoDoAtendimento(detalhe))}</strong>.
                                                    O pagamento atualiza o saldo, mas o atendimento mantém-se concluído.
                                                </p>
                                            </form>
                                        </section>
                                    )}

                                    {detalhe.motivo_anulacao && (
                                        <p className="appointment-reason">
                                            Motivo da anulação: {detalhe.motivo_anulacao}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <footer className="appointment-detail-footer">
                            {podeAnular && detalhe.estado !== "Anulado" && (
                                <button
                                    type="button"
                                    className="appointment-cancel-btn"
                                    onClick={() => handleAnular(detalhe)}
                                    disabled={savingPagamento}
                                >
                                    <Ban size={16} /> Anular atendimento
                                </button>
                            )}
                            <button
                                type="button"
                                className="appointment-close-btn"
                                onClick={fecharDetalhe}
                                disabled={savingPagamento}
                            >
                                Fechar
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            <div className="app-page mgmt-page">
                    <header className="mgmt-hero">
                        <div className="mgmt-hero-copy">
                            <span className="mgmt-eyebrow">
                                <Sparkles size={13} />
                                Movimento do salão
                            </span>
                            <h2 className="mgmt-title">Atendimentos sem perder o ritmo</h2>
                            <p className="mgmt-subtitle">
                                Registe novos serviços, acompanhe pagamentos e consulte o histórico
                                completo de cada cliente.
                            </p>
                        </div>
                        <div className="mgmt-hero-actions">
                            <button
                                type="button"
                                className="mgmt-btn primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <CalendarPlus size={17} />
                                Novo atendimento
                            </button>
                        </div>
                    </header>

                    <section className="mgmt-metrics" aria-label="Resumo de atendimentos">
                        <article className="mgmt-metric success">
                            <span className="mgmt-metric-icon"><CheckCircle2 size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Concluídos</span>
                                <strong className="mgmt-metric-value">{concluidos}</strong>
                                <span className="mgmt-metric-hint">Serviços realizados</span>
                            </span>
                        </article>
                        <article className="mgmt-metric warning">
                            <span className="mgmt-metric-icon"><Ban size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Anulados</span>
                                <strong className="mgmt-metric-value">{anulados}</strong>
                                <span className="mgmt-metric-hint">Fora do movimento</span>
                            </span>
                        </article>
                        <article className="mgmt-metric primary">
                            <span className="mgmt-metric-icon"><Wallet size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Total recebido</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(totalRecebido)}</strong>
                                <span className="mgmt-metric-hint">Pagamentos registados</span>
                            </span>
                        </article>
                        <article className="mgmt-metric danger">
                            <span className="mgmt-metric-icon"><Receipt size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Por receber</span>
                                <strong className="mgmt-metric-value">{formatarMoeda(totalPendente)}</strong>
                                <span className="mgmt-metric-hint">Saldo em aberto</span>
                            </span>
                        </article>
                        <article className="mgmt-metric info">
                            <span className="mgmt-metric-icon"><Clock3 size={21} /></span>
                            <span className="mgmt-metric-copy">
                                <span className="mgmt-metric-label">Atendimentos hoje</span>
                                <strong className="mgmt-metric-value">{atendimentosHoje}</strong>
                                <span className="mgmt-metric-hint">Movimento do dia</span>
                            </span>
                        </article>
                    </section>

                    {erroLista && (
                        <div className="mgmt-alert" role="alert">
                            <AlertCircle size={17} />
                            <span>{erroLista}</span>
                            <button
                                type="button"
                                onClick={() => (mostrarAgendamentos ? setErroAgendamentos(null) : setError(null))}
                            >
                                Fechar
                            </button>
                        </div>
                    )}

                    <div className="mgmt-filter-tabs" aria-label="Filtrar por estado">
                        {ESTADOS.map((estado) => (
                            <button
                                key={estado}
                                type="button"
                                aria-pressed={filtro === estado}
                                className={`mgmt-filter-tab ${filtro === estado ? "active" : ""}`}
                                onClick={() => setFiltro(estado)}
                            >
                                {rotuloEstado(estado)}
                                <span className="mgmt-filter-count">{contagemEstados[estado] || 0}</span>
                            </button>
                        ))}
                    </div>

                    <section className="mgmt-toolbar" aria-label="Filtros de atendimentos">
                        <div className="mgmt-search">
                            <Search size={17} />
                            <input
                                type="search"
                                placeholder="Pesquisar por cliente, telefone ou número..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                aria-label="Pesquisar atendimentos"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="mgmt-search-clear"
                                    onClick={() => setSearchTerm("")}
                                    aria-label="Limpar pesquisa"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="mgmt-select-wrap">
                            <select
                                className="mgmt-select"
                                value={periodo}
                                onChange={(event) => setPeriodo(event.target.value)}
                                aria-label="Filtrar por período"
                            >
                                {PERIODOS.map((opcao) => (
                                    <option key={opcao} value={opcao}>
                                        {opcao === "Todos" ? "Todo o período" : opcao}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} />
                        </div>

                        <span className="mgmt-toolbar-meta">
                            <strong>{listaFiltrada.length}</strong>
                            {" "}de {totalLista} {rotuloLista}
                        </span>

                        <div className="mgmt-toolbar-actions">
                            <button
                                type="button"
                                className="mgmt-tool export"
                                onClick={mostrarAgendamentos ? exportarAgendamentos : exportarAtendimentos}
                                disabled={!listaFiltrada.length}
                                title="Exportar lista em CSV"
                            >
                                <Download size={16} />
                                Exportar
                            </button>
                            <button
                                type="button"
                                className="mgmt-tool icon-only"
                                onClick={mostrarAgendamentos ? carregarAgendamentos : carregarAtendimentos}
                                disabled={carregandoLista}
                                title="Actualizar lista"
                                aria-label={`Actualizar lista de ${rotuloLista}`}
                            >
                                <RefreshCw size={16} className={carregandoLista ? "mgmt-spin" : ""} />
                            </button>
                        </div>
                    </section>

                    {mostrarAgendamentos ? (
                        <DataGrid
                            rowData={agendamentosFiltrados}
                            columnDefs={columnDefsAgendamentos}
                            loading={loadingAgendamentos}
                            onGridReady={(params) => { agendaGridApiRef.current = params.api }}
                            onRowDoubleClicked={() => navigate("/agendamentos")}
                            emptyIcon={erroAgendamentos ? AlertCircle : temFiltrosLista ? Search : CalendarClock}
                            emptyTitle={erroAgendamentos ? "Não foi possível carregar" : temFiltrosLista ? "Sem resultados" : "Sem agendamentos em aberto"}
                            emptyMessage={erroAgendamentos ? "Verifique a ligação ao servidor e tente novamente." : mensagemVaziaAgendamentos}
                            emptyAction={erroAgendamentos ? (
                                <button type="button" className="mgmt-btn ghost" onClick={carregarAgendamentos}>
                                    <RefreshCw size={16} />
                                    Tentar novamente
                                </button>
                            ) : temFiltrosLista ? (
                                <button type="button" className="mgmt-btn ghost" onClick={limparFiltrosLista}>
                                    Limpar filtros
                                </button>
                            ) : (
                                <button type="button" className="mgmt-btn primary" onClick={() => navigate("/agendamentos")}>
                                    <CalendarClock size={16} />
                                    Ver agendamentos
                                </button>
                            )}
                            mobileCard={(agendamento) => (
                                <>
                                    <div className="faces-grid-card-head">
                                        <ClienteAtendimentoCell data={agendamento} rotulo="Agendamento" />
                                        <EstadoAgendamentoCell />
                                    </div>

                                    <div className="faces-grid-card-meta">
                                        <DataAtendimentoCell value={agendamento.criado_em} />
                                        <TotalAtendimentoCell value={agendamento.valor_total} />
                                    </div>

                                    <div className="faces-grid-card-foot">
                                        <ServicosAgendamentoCell data={agendamento} />
                                        <AcoesAgendamentoCell
                                            data={agendamento}
                                            onAbrir={() => navigate("/agendamentos")}
                                        />
                                    </div>
                                </>
                            )}
                        />
                    ) : (
                        <DataGrid
                            rowData={atendimentosFiltrados}
                            columnDefs={columnDefs}
                            loading={loading}
                            onGridReady={(params) => { gridApiRef.current = params.api }}
                            onRowDoubleClicked={(event) => handleVerDetalhe(event.data)}
                            emptyIcon={error ? AlertCircle : temFiltros ? Search : CalendarPlus}
                            emptyTitle={error ? "Não foi possível carregar" : temFiltros ? "Sem resultados" : "Ainda não há atendimentos"}
                            emptyMessage={error ? "Verifique a ligação ao servidor e tente novamente." : mensagemVazia}
                            emptyAction={error ? (
                                <button type="button" className="mgmt-btn ghost" onClick={carregarAtendimentos}>
                                    <RefreshCw size={16} />
                                    Tentar novamente
                                </button>
                            ) : temFiltros ? (
                                <button type="button" className="mgmt-btn ghost" onClick={limparFiltros}>
                                    Limpar filtros
                                </button>
                            ) : (
                                <button type="button" className="mgmt-btn primary" onClick={() => setIsModalOpen(true)}>
                                    <CalendarPlus size={16} />
                                    Novo atendimento
                                </button>
                            )}
                            mobileCard={(atendimento) => (
                                <>
                                    <div className="faces-grid-card-head">
                                        <ClienteAtendimentoCell data={atendimento} />
                                        <EstadoAtendimentoCell value={atendimento.estado} />
                                    </div>

                                    <div className="faces-grid-card-meta">
                                        <DataAtendimentoCell value={atendimento.data_hora} />
                                        <TotalAtendimentoCell value={atendimento.valor_total} />
                                    </div>

                                    <div className="faces-grid-card-foot">
                                        <PagamentoAtendimentoCell data={atendimento} />
                                        <AcoesAtendimentoCell
                                            data={atendimento}
                                            podeEditar={podeEditar}
                                            podeAnular={podeAnular}
                                            onVer={handleVerDetalhe}
                                            onEditar={handleEditar}
                                            onAnular={handleAnular}
                                        />
                                    </div>
                                </>
                            )}
                        />
                    )}
            </div>
        </>
    )
}

export default NovoAtendimento
