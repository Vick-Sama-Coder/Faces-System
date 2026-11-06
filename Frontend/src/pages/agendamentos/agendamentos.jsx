import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    Ban,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    Eye,
    PackageCheck,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Wallet,
    X
} from "lucide-react"
import {
    cancelarAgendamento,
    consumirAgendamento,
    createAgendamento,
    getAgendamento,
    getAgendamentos,
    getApiError,
    getClientes,
    getFuncionarios,
    getServicos,
    registrarPagamentoAgendamento
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import "../../Styles/management.css"
import "./agendamentos.css"

const ESTADOS = ["Todos", "Aberto", "Concluido", "Anulado"]
const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"]

function formatarMoeda(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ")} MT`
}

function formatarDataHora(valor) {
    if (!valor) return "—"
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return "—"
    return data.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

function nomeCliente(cliente) {
    // A listagem/detalhe do agendamento devolve cliente_nome/cliente_apelido;
    // as listagens de clientes devolvem nome/apelido. Suportamos os dois formatos.
    const nome = cliente?.nome ?? cliente?.cliente_nome ?? ""
    const apelido = cliente?.apelido ?? cliente?.cliente_apelido ?? ""
    return `${nome} ${apelido}`.trim() || "Cliente"
}

function iniciais(cliente) {
    const partes = nomeCliente(cliente).split(/\s+/).filter(Boolean)
    if (!partes.length) return "AG"
    const primeira = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
    return `${primeira}${ultima}`.toUpperCase()
}

function rotuloEstado(estado) {
    if (estado === "Concluido") return "Concluído"
    return estado || "Aberto"
}

function tomEstado(estado) {
    if (estado === "Concluido") return "success"
    if (estado === "Anulado") return "danger"
    return "warning"
}

function estaTotalmentePago(agendamento) {
    const devido = Number(agendamento?.valor_devido || 0)
    const pago = Number(agendamento?.valor_pago_liquido || 0)
    return devido > 0 && pago >= devido
}

// Quando o backend em execução ainda não tem as rotas de agendamentos, o
// Express responde 404 com "Rota nao encontrada". Traduzimos isso para uma
// mensagem que explica o que fazer, em vez de mostrar o erro técnico.
function getErroAgendamento(erro) {
    const mensagem = String(erro?.response?.data?.message || "")
    if (erro?.response?.status === 404 && mensagem.toLowerCase().includes("rota nao encontrada")) {
        return "O servidor ainda não tem o módulo de agendamentos. Atualize o backend e tente novamente."
    }
    return getApiError(erro)
}

function Modal({ children, onClose, wide = false }) {
    useEffect(() => {
        const fecharComEscape = (evento) => {
            if (evento.key === "Escape") onClose()
        }
        window.addEventListener("keydown", fecharComEscape)
        return () => window.removeEventListener("keydown", fecharComEscape)
    }, [onClose])

    return (
        <div className="agenda-modal-backdrop" role="presentation" onClick={onClose}>
            <section
                className={`agenda-modal ${wide ? "wide" : ""}`.trim()}
                role="dialog"
                aria-modal="true"
                onClick={(evento) => evento.stopPropagation()}
            >
                {children}
            </section>
        </div>
    )
}

function CabecalhoModal({ titulo, subtitulo, onClose }) {
    return (
        <header className="agenda-modal-header">
            <div>
                <h2>{titulo}</h2>
                {subtitulo && <p>{subtitulo}</p>}
            </div>
            <button type="button" className="agenda-close" onClick={onClose} aria-label="Fechar">
                <X size={18} />
            </button>
        </header>
    )
}

function MensagemErro({ children }) {
    if (!children) return null
    return (
        <div className="mgmt-alert" role="alert">
            <AlertCircle size={17} />
            <span>{children}</span>
        </div>
    )
}

function NovoAgendamentoModal({
    clientes,
    servicos,
    carregandoReferencias,
    erroReferencias,
    onRecarregarReferencias,
    onClose,
    onCreated
}) {
    const [clienteId, setClienteId] = useState("")
    const [pesquisaCliente, setPesquisaCliente] = useState("")
    const [itens, setItens] = useState([{ servico_id: "", quantidade: 1, preco_unitario: "" }])
    const [observacoes, setObservacoes] = useState("")
    const [erro, setErro] = useState(null)
    const [salvando, setSalvando] = useState(false)

    const clientesVisiveis = useMemo(() => {
        const termo = pesquisaCliente.trim().toLowerCase()
        if (!termo) return clientes
        return clientes.filter((cliente) => (
            nomeCliente(cliente).toLowerCase().includes(termo)
            || String(cliente.telefone || "").includes(termo)
        ))
    }, [clientes, pesquisaCliente])

    const total = itens.reduce((soma, item) => (
        soma + (Number(item.preco_unitario) || 0) * (Number(item.quantidade) || 0)
    ), 0)

    const alterarItem = (indice, campo, valor) => {
        setItens((anteriores) => anteriores.map((item, posicao) => {
            if (posicao !== indice) return item

            if (campo === "servico_id") {
                const servico = servicos.find((registro) => String(registro.id) === String(valor))
                return {
                    ...item,
                    servico_id: valor,
                    preco_unitario: servico ? String(servico.valor) : ""
                }
            }

            return { ...item, [campo]: valor }
        }))
    }

    const adicionarItem = () => {
        setItens((anteriores) => [...anteriores, { servico_id: "", quantidade: 1, preco_unitario: "" }])
    }

    const removerItem = (indice) => {
        setItens((anteriores) => anteriores.filter((_, posicao) => posicao !== indice))
    }

    const submeter = async (evento) => {
        evento.preventDefault()
        setErro(null)

        if (carregandoReferencias) {
            setErro("Aguarde pelo carregamento dos clientes e serviços.")
            return
        }

        if (clientes.length === 0) {
            setErro("Não há clientes ativos disponíveis. Ative ou registe um cliente primeiro.")
            return
        }

        if (servicos.length === 0) {
            setErro("Não há serviços ativos disponíveis. Ative ou registe um serviço primeiro.")
            return
        }

        if (!clienteId) {
            setErro("Escolha o cliente do agendamento.")
            return
        }

        const validos = itens.filter((item) => item.servico_id)

        if (validos.length === 0) {
            setErro("Adicione pelo menos um serviço ao agendamento.")
            return
        }

        const invalido = validos.find((item) => (
            !Number.isInteger(Number(item.preco_unitario))
            || Number(item.preco_unitario) <= 0
            || !Number.isInteger(Number(item.quantidade))
            || Number(item.quantidade) < 1
        ))

        if (invalido) {
            setErro("Cada serviço exige um preço inteiro maior que zero e uma quantidade inteira.")
            return
        }

        setSalvando(true)

        try {
            const resposta = await createAgendamento({
                cliente_id: Number(clienteId),
                observacoes: observacoes.trim() || undefined,
                servicos: validos.map((item) => ({
                    servico_id: Number(item.servico_id),
                    quantidade: Number(item.quantidade),
                    preco_unitario: Number(item.preco_unitario)
                }))
            })

            onCreated(resposta.data)
        } catch (error) {
            setErro(getApiError(error))
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal onClose={onClose} wide>
            <form onSubmit={submeter}>
                <CabecalhoModal
                    titulo="Novo agendamento pré-pago"
                    subtitulo="O cliente compra os serviços agora e usa o saldo quando quiser."
                    onClose={onClose}
                />
                <div className="agenda-modal-body">
                    <MensagemErro>{erro}</MensagemErro>

                    {carregandoReferencias && (
                        <p className="agenda-reference-status" role="status">
                            <RefreshCw size={15} className="mgmt-spin" />
                            A carregar clientes e serviços...
                        </p>
                    )}

                    {erroReferencias && (
                        <div className="mgmt-alert" role="alert">
                            <AlertCircle size={17} />
                            <span>{erroReferencias}</span>
                            {onRecarregarReferencias && (
                                <button
                                    type="button"
                                    onClick={onRecarregarReferencias}
                                    disabled={carregandoReferencias}
                                >
                                    {carregandoReferencias ? "A tentar..." : "Tentar novamente"}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="agenda-form-grid">
                        <label className="agenda-field">
                            <span>Pesquisar cliente</span>
                            <div className="mgmt-search">
                                <Search size={16} />
                                <input
                                    type="search"
                                    value={pesquisaCliente}
                                    onChange={(evento) => setPesquisaCliente(evento.target.value)}
                                    placeholder="Nome ou telefone"
                                />
                            </div>
                        </label>

                        <label className="agenda-field">
                            <span>Cliente *</span>
                            <div className="mgmt-select-wrap">
                                <select
                                    className="mgmt-select"
                                    value={clienteId}
                                    onChange={(evento) => setClienteId(evento.target.value)}
                                    required
                                    disabled={carregandoReferencias}
                                >
                                    <option value="">
                                        {carregandoReferencias
                                            ? "A carregar clientes..."
                                            : clientes.length === 0
                                                ? "Sem clientes ativos"
                                                : "Selecionar cliente"}
                                    </option>
                                    {clientesVisiveis.map((cliente) => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {nomeCliente(cliente)} — {cliente.telefone || "sem telefone"}
                                        </option>
                                    ))}
                                    {!carregandoReferencias && clientes.length > 0 && clientesVisiveis.length === 0 && (
                                        <option value="" disabled>Nenhum cliente corresponde à pesquisa</option>
                                    )}
                                </select>
                                <ChevronDown size={16} />
                            </div>
                        </label>
                    </div>

                    <div className="agenda-section-head">
                        <div>
                            <strong>Serviços do pacote</strong>
                            <small>Não há desconto de pacote; o total é a soma dos preços acordados.</small>
                        </div>
                        <button type="button" className="mgmt-btn ghost" onClick={adicionarItem}>
                            <Plus size={16} />
                            Adicionar serviço
                        </button>
                    </div>

                    <div className="agenda-itens">
                        {itens.map((item, indice) => (
                            <div className="agenda-item-row" key={`item-${indice}`}>
                                <label className="agenda-field agenda-item-service">
                                    <span>Serviço *</span>
                                    <div className="mgmt-select-wrap">
                                        <select
                                            className="mgmt-select"
                                            value={item.servico_id}
                                            onChange={(evento) => alterarItem(indice, "servico_id", evento.target.value)}
                                            required
                                            disabled={carregandoReferencias}
                                        >
                                            <option value="">
                                                {carregandoReferencias
                                                    ? "A carregar serviços..."
                                                    : servicos.length === 0
                                                        ? "Sem serviços ativos"
                                                        : "Selecionar serviço"}
                                            </option>
                                            {servicos.map((servico) => (
                                                <option key={servico.id} value={servico.id}>
                                                    {servico.nome} — {formatarMoeda(servico.valor)}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} />
                                    </div>
                                </label>

                                <label className="agenda-field">
                                    <span>Qtd. *</span>
                                    <input
                                        className="agenda-input"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={item.quantidade}
                                        onChange={(evento) => alterarItem(indice, "quantidade", evento.target.value)}
                                        required
                                    />
                                </label>

                                <label className="agenda-field">
                                    <span>Preço unit. (MT) *</span>
                                    <input
                                        className="agenda-input"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={item.preco_unitario}
                                        onChange={(evento) => alterarItem(indice, "preco_unitario", evento.target.value)}
                                        required
                                    />
                                </label>

                                <div className="agenda-item-total">
                                    <span>Subtotal</span>
                                    <strong>{formatarMoeda((Number(item.preco_unitario) || 0) * (Number(item.quantidade) || 0))}</strong>
                                </div>

                                <button
                                    type="button"
                                    className="mgmt-row-btn danger"
                                    onClick={() => removerItem(indice)}
                                    disabled={itens.length === 1}
                                    title="Remover serviço"
                                    aria-label="Remover serviço"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <label className="agenda-field">
                        <span>Observações</span>
                        <textarea
                            className="agenda-textarea"
                            rows="2"
                            maxLength="255"
                            value={observacoes}
                            onChange={(evento) => setObservacoes(evento.target.value)}
                            placeholder="Notas internas sobre este agendamento"
                        />
                    </label>

                    <div className="agenda-total-bar">
                        <span>Total do agendamento</span>
                        <strong>{formatarMoeda(total)}</strong>
                    </div>
                </div>

                <footer className="agenda-modal-footer">
                    <button type="button" className="mgmt-btn ghost" onClick={onClose} disabled={salvando}>
                        Cancelar
                    </button>
                    <button type="submit" className="mgmt-btn primary" disabled={salvando || carregandoReferencias}>
                        <CalendarClock size={16} />
                        {salvando ? "A criar..." : "Criar agendamento"}
                    </button>
                </footer>
            </form>
        </Modal>
    )
}

function PagamentoModal({ agendamento, onClose, onDone }) {
    const saldo = Math.max(Number(agendamento?.saldo || 0), 0)
    const [valor, setValor] = useState(String(saldo || ""))
    const [metodo, setMetodo] = useState("Dinheiro")
    const [referencia, setReferencia] = useState("")
    const [erro, setErro] = useState(null)
    const [salvando, setSalvando] = useState(false)

    const submeter = async (evento) => {
        evento.preventDefault()
        setErro(null)

        const numero = Number(valor)
        if (!Number.isFinite(numero) || numero <= 0) {
            setErro("Indique um valor de pagamento maior que zero.")
            return
        }
        if (numero > saldo) {
            setErro(`O valor em falta é ${formatarMoeda(saldo)}.`)
            return
        }

        setSalvando(true)

        try {
            const resposta = await registrarPagamentoAgendamento(agendamento.id, {
                parcelas: [{
                    metodo_pagamento: metodo,
                    valor: numero,
                    referencia: referencia.trim() || undefined
                }]
            })
            onDone(resposta.data)
        } catch (error) {
            setErro(getApiError(error))
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal onClose={onClose}>
            <form onSubmit={submeter}>
                <CabecalhoModal
                    titulo="Registar pagamento"
                    subtitulo={`Agendamento #${agendamento.id} — ${nomeCliente(agendamento)}`}
                    onClose={onClose}
                />
                <div className="agenda-modal-body">
                    <MensagemErro>{erro}</MensagemErro>

                    <div className="agenda-pay-summary">
                        <div>
                            <span>Em falta</span>
                            <strong>{formatarMoeda(saldo)}</strong>
                        </div>
                        <div>
                            <span>Já pago</span>
                            <strong>{formatarMoeda(agendamento.valor_pago)}</strong>
                        </div>
                        <div>
                            <span>Reembolsado</span>
                            <strong>{formatarMoeda(agendamento.valor_reembolsado)}</strong>
                        </div>
                    </div>

                    <label className="agenda-field">
                        <span>Valor a pagar (MT) *</span>
                        <input
                            className="agenda-input"
                            type="number"
                            min="1"
                            step="1"
                            max={saldo}
                            value={valor}
                            onChange={(evento) => setValor(evento.target.value)}
                            required
                        />
                    </label>

                    <label className="agenda-field">
                        <span>Método de pagamento *</span>
                        <div className="mgmt-select-wrap">
                            <select
                                className="mgmt-select"
                                value={metodo}
                                onChange={(evento) => setMetodo(evento.target.value)}
                            >
                                {FORMAS_PAGAMENTO.map((forma) => (
                                    <option key={forma} value={forma}>{forma}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} />
                        </div>
                    </label>

                    <label className="agenda-field">
                        <span>Referência</span>
                        <input
                            className="agenda-input"
                            type="text"
                            maxLength="100"
                            value={referencia}
                            onChange={(evento) => setReferencia(evento.target.value)}
                            placeholder="Opcional (ex.: código M-Pesa)"
                        />
                    </label>

                    <p className="agenda-hint">
                        É necessária uma sessão de caixa aberta para registar o pagamento.
                    </p>
                </div>

                <footer className="agenda-modal-footer">
                    <button type="button" className="mgmt-btn ghost" onClick={onClose} disabled={salvando}>
                        Fechar
                    </button>
                    <button type="submit" className="mgmt-btn primary" disabled={salvando || saldo <= 0}>
                        <CreditCard size={16} />
                        {salvando ? "A registar..." : "Registar pagamento"}
                    </button>
                </footer>
            </form>
        </Modal>
    )
}

function ConsumoModal({ agendamento, funcionarios, onClose, onDone }) {
    const linhas = useMemo(() => (
        (agendamento.servicos || []).filter((linha) => Number(linha.quantidade_restante) > 0)
    ), [agendamento.servicos])

    const [selecao, setSelecao] = useState(() => Object.fromEntries(
        linhas.map((linha) => [linha.id, { marcado: false, quantidade: 1, funcionario_id: "" }])
    ))
    const [erro, setErro] = useState(null)
    const [salvando, setSalvando] = useState(false)

    const pago = estaTotalmentePago(agendamento)

    const alterar = (id, campo, valor) => {
        setSelecao((anterior) => ({
            ...anterior,
            [id]: { ...anterior[id], [campo]: valor }
        }))
    }

    const submeter = async (evento) => {
        evento.preventDefault()
        setErro(null)

        const escolhidas = linhas.filter((linha) => selecao[linha.id]?.marcado)

        if (escolhidas.length === 0) {
            setErro("Selecione pelo menos um serviço para consumir.")
            return
        }

        const semFuncionario = escolhidas.find((linha) => !selecao[linha.id]?.funcionario_id)
        if (semFuncionario) {
            setErro(`Escolha o funcionário para "${semFuncionario.servico_nome}".`)
            return
        }

        const invalida = escolhidas.find((linha) => {
            const quantidade = Number(selecao[linha.id]?.quantidade)
            return !Number.isInteger(quantidade)
                || quantidade < 1
                || quantidade > Number(linha.quantidade_restante)
        })
        if (invalida) {
            setErro(`A quantidade de "${invalida.servico_nome}" é inválida.`)
            return
        }

        setSalvando(true)

        try {
            const resposta = await consumirAgendamento(agendamento.id, {
                itens: escolhidas.map((linha) => ({
                    agendamento_servico_id: linha.id,
                    quantidade: Number(selecao[linha.id].quantidade),
                    funcionario_id: Number(selecao[linha.id].funcionario_id)
                }))
            })
            onDone(resposta.data)
        } catch (error) {
            setErro(getApiError(error))
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal onClose={onClose} wide>
            <form onSubmit={submeter}>
                <CabecalhoModal
                    titulo="Consumir serviços"
                    subtitulo={`Agendamento #${agendamento.id} — ${nomeCliente(agendamento)}`}
                    onClose={onClose}
                />
                <div className="agenda-modal-body">
                    <MensagemErro>{erro}</MensagemErro>

                    {!pago && (
                        <div className="agenda-warning">
                            <AlertCircle size={17} />
                            <span>O agendamento ainda não está totalmente pago. Registe o pagamento antes de consumir.</span>
                        </div>
                    )}

                    {linhas.length === 0 ? (
                        <p className="agenda-empty-text">Não há serviços por consumir neste agendamento.</p>
                    ) : (
                        <div className="agenda-consume-list">
                            {linhas.map((linha) => {
                                const estado = selecao[linha.id] || { marcado: false, quantidade: 1, funcionario_id: "" }
                                return (
                                    <div className={`agenda-consume-row ${estado.marcado ? "selected" : ""}`.trim()} key={linha.id}>
                                        <label className="agenda-check">
                                            <input
                                                type="checkbox"
                                                checked={estado.marcado}
                                                onChange={(evento) => alterar(linha.id, "marcado", evento.target.checked)}
                                            />
                                            <span>
                                                <strong>{linha.servico_nome}</strong>
                                                <small>
                                                    {linha.modalidade_nome || "Sem modalidade"} · {formatarMoeda(linha.preco_unitario)} por unidade
                                                </small>
                                            </span>
                                        </label>

                                        <label className="agenda-field compact">
                                            <span>Qtd. (máx. {linha.quantidade_restante})</span>
                                            <input
                                                className="agenda-input"
                                                type="number"
                                                min="1"
                                                max={linha.quantidade_restante}
                                                value={estado.quantidade}
                                                disabled={!estado.marcado}
                                                onChange={(evento) => alterar(linha.id, "quantidade", evento.target.value)}
                                            />
                                        </label>

                                        <label className="agenda-field compact">
                                            <span>Funcionário *</span>
                                            <div className="mgmt-select-wrap">
                                                <select
                                                    className="mgmt-select"
                                                    value={estado.funcionario_id}
                                                    disabled={!estado.marcado}
                                                    onChange={(evento) => alterar(linha.id, "funcionario_id", evento.target.value)}
                                                >
                                                    <option value="">Escolher</option>
                                                    {funcionarios.map((funcionario) => (
                                                        <option key={funcionario.id} value={funcionario.id}>
                                                            {funcionario.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} />
                                            </div>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <p className="agenda-hint">
                        A execução cria um atendimento de valor zero, gera a comissão do funcionário e regista a fidelização.
                    </p>
                </div>

                <footer className="agenda-modal-footer">
                    <button type="button" className="mgmt-btn ghost" onClick={onClose} disabled={salvando}>
                        Fechar
                    </button>
                    <button
                        type="submit"
                        className="mgmt-btn primary"
                        disabled={salvando || !pago || linhas.length === 0}
                    >
                        <PackageCheck size={16} />
                        {salvando ? "A consumir..." : "Consumir selecionados"}
                    </button>
                </footer>
            </form>
        </Modal>
    )
}

function CancelamentoModal({ agendamento, onClose, onDone }) {
    const linhas = useMemo(() => (
        (agendamento.servicos || []).filter((linha) => Number(linha.quantidade_restante) > 0)
    ), [agendamento.servicos])

    const [selecao, setSelecao] = useState(() => Object.fromEntries(
        linhas.map((linha) => [linha.id, { marcado: true, quantidade: linha.quantidade_restante }])
    ))
    const [motivo, setMotivo] = useState("")
    const [metodo, setMetodo] = useState("Dinheiro")
    const [erro, setErro] = useState(null)
    const [salvando, setSalvando] = useState(false)

    const escolhidas = linhas.filter((linha) => selecao[linha.id]?.marcado)
    const valorCancelado = escolhidas.reduce((total, linha) => (
        total + (Number(selecao[linha.id]?.quantidade) || 0) * Number(linha.preco_unitario || 0)
    ), 0)
    const disponivel = Math.max(
        Number(agendamento.valor_pago || 0) - Number(agendamento.valor_reembolsado || 0),
        0
    )
    const reembolso = Math.min(valorCancelado, disponivel)

    const alterar = (id, campo, valor) => {
        setSelecao((anterior) => ({
            ...anterior,
            [id]: { ...anterior[id], [campo]: valor }
        }))
    }

    const submeter = async (evento) => {
        evento.preventDefault()
        setErro(null)

        if (!motivo.trim()) {
            setErro("Indique o motivo do cancelamento.")
            return
        }
        if (escolhidas.length === 0) {
            setErro("Selecione pelo menos um serviço para cancelar.")
            return
        }

        const invalida = escolhidas.find((linha) => {
            const quantidade = Number(selecao[linha.id]?.quantidade)
            return !Number.isInteger(quantidade)
                || quantidade < 1
                || quantidade > Number(linha.quantidade_restante)
        })
        if (invalida) {
            setErro(`A quantidade de "${invalida.servico_nome}" é inválida.`)
            return
        }

        setSalvando(true)

        try {
            const resposta = await cancelarAgendamento(agendamento.id, {
                motivo: motivo.trim(),
                metodo_pagamento: metodo,
                itens: escolhidas.map((linha) => ({
                    agendamento_servico_id: linha.id,
                    quantidade: Number(selecao[linha.id].quantidade)
                }))
            })
            onDone(resposta.data)
        } catch (error) {
            setErro(getApiError(error))
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal onClose={onClose} wide>
            <form onSubmit={submeter}>
                <CabecalhoModal
                    titulo="Cancelar e reembolsar"
                    subtitulo={`Agendamento #${agendamento.id} — ${nomeCliente(agendamento)}`}
                    onClose={onClose}
                />
                <div className="agenda-modal-body">
                    <MensagemErro>{erro}</MensagemErro>

                    <div className="agenda-warning danger">
                        <Ban size={17} />
                        <span>Os serviços já consumidos não podem ser cancelados. Só o saldo restante é reembolsado.</span>
                    </div>

                    {linhas.length === 0 ? (
                        <p className="agenda-empty-text">Não há serviços por cancelar neste agendamento.</p>
                    ) : (
                        <div className="agenda-cancel-list">
                            {linhas.map((linha) => {
                                const estado = selecao[linha.id] || { marcado: false, quantidade: linha.quantidade_restante }
                                return (
                                    <div className={`agenda-cancel-row ${estado.marcado ? "selected" : ""}`.trim()} key={linha.id}>
                                        <label className="agenda-check">
                                            <input
                                                type="checkbox"
                                                checked={estado.marcado}
                                                onChange={(evento) => alterar(linha.id, "marcado", evento.target.checked)}
                                            />
                                            <span>
                                                <strong>{linha.servico_nome}</strong>
                                                <small>
                                                    {linha.quantidade_restante} restante(s) · {formatarMoeda(linha.preco_unitario)} por unidade
                                                </small>
                                            </span>
                                        </label>

                                        <label className="agenda-field compact">
                                            <span>Qtd. a cancelar</span>
                                            <input
                                                className="agenda-input"
                                                type="number"
                                                min="1"
                                                max={linha.quantidade_restante}
                                                value={estado.quantidade}
                                                disabled={!estado.marcado}
                                                onChange={(evento) => alterar(linha.id, "quantidade", evento.target.value)}
                                            />
                                        </label>

                                        <strong className="agenda-cancel-value">
                                            {formatarMoeda((Number(estado.quantidade) || 0) * Number(linha.preco_unitario || 0))}
                                        </strong>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <label className="agenda-field">
                        <span>Motivo *</span>
                        <textarea
                            className="agenda-textarea"
                            rows="2"
                            maxLength="255"
                            value={motivo}
                            onChange={(evento) => setMotivo(evento.target.value)}
                            placeholder="Ex.: cliente desistiu dos serviços restantes"
                            required
                        />
                    </label>

                    {reembolso > 0 && (
                        <label className="agenda-field">
                            <span>Método do reembolso *</span>
                            <div className="mgmt-select-wrap">
                                <select
                                    className="mgmt-select"
                                    value={metodo}
                                    onChange={(evento) => setMetodo(evento.target.value)}
                                >
                                    {FORMAS_PAGAMENTO.map((forma) => (
                                        <option key={forma} value={forma}>{forma}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} />
                            </div>
                        </label>
                    )}

                    <div className="agenda-refund-summary">
                        <div>
                            <span>Valor dos serviços cancelados</span>
                            <strong>{formatarMoeda(valorCancelado)}</strong>
                        </div>
                        <div>
                            <span>Reembolso efetivo</span>
                            <strong>{formatarMoeda(reembolso)}</strong>
                        </div>
                        {reembolso > 0 && (
                            <small>É necessária uma sessão de caixa aberta para registar a saída.</small>
                        )}
                    </div>
                </div>

                <footer className="agenda-modal-footer">
                    <button type="button" className="mgmt-btn ghost" onClick={onClose} disabled={salvando}>
                        Voltar
                    </button>
                    <button type="submit" className="mgmt-btn primary danger" disabled={salvando || linhas.length === 0}>
                        <Ban size={16} />
                        {salvando ? "A cancelar..." : "Cancelar serviços"}
                    </button>
                </footer>
            </form>
        </Modal>
    )
}

function DetalheModal({
    agendamento,
    loading,
    erro,
    sucesso,
    podePagar,
    podeConsumir,
    podeCancelar,
    onClose,
    onPagar,
    onConsumir,
    onCancelar,
    onRecarregar
}) {
    const restante = Number(agendamento?.quantidade_restante || 0)
    const pago = estaTotalmentePago(agendamento)
    const podeConsumirAgora = podeConsumir && restante > 0 && agendamento?.estado !== "Anulado" && pago
    const podeCancelarAgora = podeCancelar && restante > 0 && agendamento?.estado !== "Anulado"

    return (
        <Modal onClose={onClose} wide>
            <CabecalhoModal
                titulo={agendamento ? `Agendamento #${agendamento.id}` : "Agendamento"}
                subtitulo={agendamento ? `${nomeCliente(agendamento)} · ${agendamento.cliente_telefone || "sem telefone"}` : "A carregar..."}
                onClose={onClose}
            />
            <div className="agenda-modal-body">
                {loading && !agendamento ? (
                    <div className="agenda-loading">A carregar agendamento...</div>
                ) : !agendamento ? (
                    <MensagemErro>{erro || "Agendamento não encontrado."}</MensagemErro>
                ) : (
                    <>
                        <MensagemErro>{erro}</MensagemErro>
                        {sucesso && (
                            <div className="agenda-success">
                                <CheckCircle2 size={17} />
                                <span>{sucesso}</span>
                            </div>
                        )}

                        <div className="agenda-detail-top">
                            <span className={`agenda-badge ${tomEstado(agendamento.estado)}`}>
                                {rotuloEstado(agendamento.estado)}
                            </span>
                            <span className="agenda-created">
                                <CalendarClock size={14} />
                                {formatarDataHora(agendamento.criado_em)}
                            </span>
                            <button type="button" className="mgmt-tool icon-only" onClick={onRecarregar} title="Atualizar">
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        <div className="agenda-detail-metrics">
                            <div>
                                <span>Total</span>
                                <strong>{formatarMoeda(agendamento.valor_total)}</strong>
                            </div>
                            <div>
                                <span>Pago</span>
                                <strong>{formatarMoeda(agendamento.valor_pago)}</strong>
                            </div>
                            <div>
                                <span>Reembolsado</span>
                                <strong>{formatarMoeda(agendamento.valor_reembolsado)}</strong>
                            </div>
                            <div>
                                <span>Saldo em falta</span>
                                <strong>{formatarMoeda(agendamento.saldo)}</strong>
                            </div>
                        </div>

                        <section className="agenda-detail-section">
                            <div className="agenda-section-head">
                                <div>
                                    <strong>Serviços</strong>
                                    <small>{agendamento.quantidade_restante} unidade(s) por consumir</small>
                                </div>
                            </div>
                            <div className="agenda-table-wrap">
                                <table className="agenda-table">
                                    <thead>
                                        <tr>
                                            <th>Serviço</th>
                                            <th>Preço</th>
                                            <th>Comprado</th>
                                            <th>Consumido</th>
                                            <th>Cancelado</th>
                                            <th>Restante</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(agendamento.servicos || []).map((linha) => (
                                            <tr key={linha.id}>
                                                <td>
                                                    <strong>{linha.servico_nome}</strong>
                                                    <small>{linha.modalidade_nome || linha.categoria_nome || "Serviço"}</small>
                                                </td>
                                                <td>{formatarMoeda(linha.preco_unitario)}</td>
                                                <td>{linha.quantidade}</td>
                                                <td>{linha.quantidade_consumida}</td>
                                                <td>{linha.quantidade_cancelada}</td>
                                                <td>
                                                    <span className={`agenda-qty ${Number(linha.quantidade_restante) > 0 ? "pending" : "done"}`}>
                                                        {linha.quantidade_restante}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="agenda-detail-section">
                            <div className="agenda-section-head">
                                <div>
                                    <strong>Pagamentos</strong>
                                    <small>{agendamento.pagamentos?.length || 0} registo(s)</small>
                                </div>
                            </div>
                            {(agendamento.pagamentos || []).length === 0 ? (
                                <p className="agenda-empty-text">Ainda não existe pagamento registado.</p>
                            ) : (
                                <ul className="agenda-history">
                                    {agendamento.pagamentos.map((pagamento) => (
                                        <li key={pagamento.id}>
                                            <div>
                                                <strong>Pagamento #{pagamento.id}</strong>
                                                <small>
                                                    {formatarDataHora(pagamento.data_hora)}
                                                    {pagamento.parcelas?.length
                                                        ? ` · ${pagamento.parcelas.map((parcela) => parcela.metodo_pagamento).join(", ")}`
                                                        : ""}
                                                </small>
                                            </div>
                                            <div className="agenda-history-value">
                                                <strong>{formatarMoeda(pagamento.valor_total)}</strong>
                                                <small>{pagamento.estado === "Anulado" ? "Anulado" : pagamento.estado}</small>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {(agendamento.reembolsos || []).length > 0 && (
                            <section className="agenda-detail-section">
                                <div className="agenda-section-head">
                                    <div>
                                        <strong>Reembolsos</strong>
                                        <small>Devoluções registadas no caixa</small>
                                    </div>
                                </div>
                                <ul className="agenda-history">
                                    {agendamento.reembolsos.map((reembolso) => (
                                        <li key={reembolso.id}>
                                            <div>
                                                <strong>Reembolso #{reembolso.id}</strong>
                                                <small>
                                                    {formatarDataHora(reembolso.data_hora)} · {reembolso.metodo_pagamento} · {reembolso.motivo}
                                                </small>
                                            </div>
                                            <div className="agenda-history-value">
                                                <strong>{formatarMoeda(reembolso.valor)}</strong>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {(agendamento.consumos || []).length > 0 && (
                            <section className="agenda-detail-section">
                                <div className="agenda-section-head">
                                    <div>
                                        <strong>Execuções</strong>
                                        <small>Serviços já realizados</small>
                                    </div>
                                </div>
                                <ul className="agenda-history">
                                    {agendamento.consumos.map((consumo) => (
                                        <li key={consumo.atendimento_servico_id}>
                                            <div>
                                                <strong>{consumo.servico_nome}</strong>
                                                <small>
                                                    {formatarDataHora(consumo.atendimento_data_hora)} · {consumo.funcionario_nome} · Atendimento #{consumo.atendimento_id}
                                                </small>
                                            </div>
                                            <div className="agenda-history-value">
                                                <strong>{formatarMoeda(consumo.preco_unitario)}</strong>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {agendamento.motivo_anulacao && (
                            <p className="agenda-reason">Motivo do cancelamento: {agendamento.motivo_anulacao}</p>
                        )}
                    </>
                )}
            </div>

            {agendamento && (
                <footer className="agenda-modal-footer">
                    <button type="button" className="mgmt-btn ghost" onClick={onClose}>
                        Fechar
                    </button>
                    <div className="agenda-footer-actions">
                        {podeCancelarAgora && (
                            <button type="button" className="mgmt-btn ghost danger" onClick={onCancelar}>
                                <Ban size={16} />
                                Cancelar/reembolsar
                            </button>
                        )}
                        {podePagar && Number(agendamento.saldo) > 0 && agendamento.estado !== "Anulado" && (
                            <button type="button" className="mgmt-btn secondary" onClick={onPagar}>
                                <CreditCard size={16} />
                                Pagar {formatarMoeda(agendamento.saldo)}
                            </button>
                        )}
                        {podeConsumir && restante > 0 && agendamento.estado !== "Anulado" && (
                            <button
                                type="button"
                                className="mgmt-btn primary"
                                onClick={onConsumir}
                                disabled={!podeConsumirAgora}
                                title={podeConsumirAgora ? "Consumir serviços" : "O agendamento tem de estar totalmente pago"}
                            >
                                <PackageCheck size={16} />
                                Consumir
                            </button>
                        )}
                    </div>
                </footer>
            )}
        </Modal>
    )
}

export default function Agendamentos() {
    const { user } = useAuthStore()
    const podeCriar = user?.perfil === "Administrador"
    const podePagar = user?.permissoes?.includes("pagamentos:registar")
    const podeConsumir = user?.permissoes?.includes("atendimentos:escrever")
    const podeCancelar = user?.permissoes?.includes("atendimentos:anular")
        || user?.permissoes?.includes("pagamentos:anular")

    const [agendamentos, setAgendamentos] = useState([])
    const [clientes, setClientes] = useState([])
    const [servicos, setServicos] = useState([])
    const [funcionarios, setFuncionarios] = useState([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pesquisa, setPesquisa] = useState("")
    const [filtroEstado, setFiltroEstado] = useState("Todos")

    // Dados de apoio do modal. Sao carregados separadamente dos agendamentos
    // para que uma falha numa lista nao impeça as restantes de aparecer.
    const [referenciasLoading, setReferenciasLoading] = useState(true)
    const [referenciasErro, setReferenciasErro] = useState(null)

    const [modal, setModal] = useState(null)
    const [detalhe, setDetalhe] = useState(null)
    const [detalheLoading, setDetalheLoading] = useState(false)
    const [acaoErro, setAcaoErro] = useState(null)
    const [sucesso, setSucesso] = useState(null)

    const carregar = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const resposta = await getAgendamentos()
            setAgendamentos(Array.isArray(resposta.data) ? resposta.data : [])
        } catch (erro) {
            setError(getErroAgendamento(erro))
        } finally {
            setLoading(false)
        }
    }, [])

    const carregarReferencias = useCallback(async () => {
        setReferenciasLoading(true)
        setReferenciasErro(null)

        const resultados = await Promise.allSettled([
            getClientes(),
            getServicos(),
            getFuncionarios()
        ])

        const [resClientes, resServicos, resFuncionarios] = resultados

        const lista = (resultado) => (
            resultado.status === "fulfilled" && Array.isArray(resultado.value.data)
                ? resultado.value.data
                : []
        )

        setClientes(lista(resClientes).filter((cliente) => cliente.estado === "Ativo"))
        setServicos(lista(resServicos).filter((servico) => servico.estado === "Ativo"))
        setFuncionarios(lista(resFuncionarios).filter((funcionario) => funcionario.estado === "Ativo"))

        const falhas = []
        if (resClientes.status === "rejected") falhas.push("clientes")
        if (resServicos.status === "rejected") falhas.push("serviços")
        if (resFuncionarios.status === "rejected") falhas.push("funcionários")

        if (falhas.length > 0) {
            const primeiroErro = resultados.find((resultado) => resultado.status === "rejected")?.reason
            setReferenciasErro(
                `Não foi possível carregar ${falhas.join(", ")}. ${getApiError(primeiroErro)}`
            )
        }

        setReferenciasLoading(false)
    }, [])

    useEffect(() => {
        let ativo = true

        // O carregamento começa numa microtarefa para não atualizar estado
        // sincronamente durante a montagem do componente.
        Promise.resolve().then(() => {
            if (ativo) carregar()
        })

        return () => { ativo = false }
    }, [carregar])

    useEffect(() => {
        let ativo = true

        Promise.resolve().then(() => {
            if (ativo) carregarReferencias()
        })

        return () => { ativo = false }
    }, [carregarReferencias])

    const abrirNovo = () => {
        if (!referenciasLoading && (!clientes.length || !servicos.length)) {
            carregarReferencias()
        }
        setModal("novo")
    }

    const abrirDetalhe = async (id) => {
        setModal("detalhe")
        setDetalhe(null)
        setDetalheLoading(true)
        setAcaoErro(null)
        setSucesso(null)

        try {
            const resposta = await getAgendamento(id)
            setDetalhe(resposta.data)
        } catch (erro) {
            setAcaoErro(getErroAgendamento(erro))
        } finally {
            setDetalheLoading(false)
        }
    }

    const recarregarDetalhe = async (id = detalhe?.id) => {
        if (!id) return

        setDetalheLoading(true)
        setAcaoErro(null)
        try {
            const resposta = await getAgendamento(id)
            setDetalhe(resposta.data)
            await carregar()
        } catch (erro) {
            setAcaoErro(getErroAgendamento(erro))
        } finally {
            setDetalheLoading(false)
        }
    }

    const fecharModal = () => {
        setModal(null)
        setDetalhe(null)
        setAcaoErro(null)
        setSucesso(null)
    }

    const aposPagamento = async () => {
        const id = detalhe?.id
        setModal("detalhe")
        setSucesso("Pagamento registado com sucesso.")
        if (id) await recarregarDetalhe(id)
    }

    const aposConsumo = async (data) => {
        const id = data?.id || detalhe?.id
        setDetalhe(data)
        setModal("detalhe")
        setSucesso(
            data?.execucao?.atendimento_id
                ? `Serviços consumidos. Atendimento #${data.execucao.atendimento_id} criado.`
                : "Serviços consumidos com sucesso."
        )
        await carregar()
        if (id) await recarregarDetalhe(id)
    }

    const aposCancelamento = async (data) => {
        const id = data?.id || detalhe?.id
        const valor = data?.cancelamento?.valor_reembolsado
        setDetalhe(data)
        setModal("detalhe")
        setSucesso(
            valor > 0
                ? `Cancelamento registado. Reembolso de ${formatarMoeda(valor)} efetuado.`
                : "Cancelamento registado sem reembolso."
        )
        await carregar()
        if (id) await recarregarDetalhe(id)
    }

    const filtrados = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase()

        return agendamentos.filter((agendamento) => {
            if (filtroEstado !== "Todos" && agendamento.estado !== filtroEstado) return false
            if (!termo) return true

            return nomeCliente(agendamento).toLowerCase().includes(termo)
                || String(agendamento.cliente_telefone || "").includes(termo)
                || String(agendamento.id) === termo
        })
    }, [agendamentos, filtroEstado, pesquisa])

    const metricas = useMemo(() => {
        const abertos = agendamentos.filter((item) => item.estado === "Aberto")
        const saldoServicos = abertos.reduce((total, item) => total + Number(item.quantidade_restante || 0), 0)
        const recebido = agendamentos.reduce((total, item) => total + Number(item.valor_pago_liquido || 0), 0)
        const reembolsado = agendamentos.reduce((total, item) => total + Number(item.valor_reembolsado || 0), 0)

        return { abertos: abertos.length, saldoServicos, recebido, reembolsado }
    }, [agendamentos])

    return (
        <div className="app-page mgmt-page">
            <section className="mgmt-hero">
                <div className="mgmt-hero-copy">
                    <span className="mgmt-eyebrow">
                        <CalendarClock size={14} />
                        Pacotes pré-pagos
                    </span>
                    <h1 className="mgmt-title">Agendamentos</h1>
                    <p className="mgmt-subtitle">
                        Serviços comprados com antecedência, sem data marcada. O funcionário é escolhido
                        no momento da execução e o saldo pode ser usado quando o cliente quiser.
                    </p>
                </div>
                <div className="mgmt-hero-actions">
                    <button type="button" className="mgmt-btn ghost" onClick={carregar} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "mgmt-spin" : ""} />
                        Atualizar
                    </button>
                    {podeCriar && (
                        <button type="button" className="mgmt-btn primary" onClick={abrirNovo}>
                            <Plus size={16} />
                            Novo agendamento
                        </button>
                    )}
                </div>
            </section>

            <section className="mgmt-metrics" aria-label="Resumo de agendamentos">
                <article className="mgmt-metric primary">
                    <span className="mgmt-metric-icon"><CalendarClock size={20} /></span>
                    <div className="mgmt-metric-copy">
                        <span className="mgmt-metric-label">Agendamentos abertos</span>
                        <strong className="mgmt-metric-value">{metricas.abertos}</strong>
                        <small className="mgmt-metric-hint">Com saldo por consumir</small>
                    </div>
                </article>
                <article className="mgmt-metric info">
                    <span className="mgmt-metric-icon"><PackageCheck size={20} /></span>
                    <div className="mgmt-metric-copy">
                        <span className="mgmt-metric-label">Serviços em saldo</span>
                        <strong className="mgmt-metric-value">{metricas.saldoServicos}</strong>
                        <small className="mgmt-metric-hint">Unidades disponíveis</small>
                    </div>
                </article>
                <article className="mgmt-metric success">
                    <span className="mgmt-metric-icon"><Wallet size={20} /></span>
                    <div className="mgmt-metric-copy">
                        <span className="mgmt-metric-label">Recebido líquido</span>
                        <strong className="mgmt-metric-value">{formatarMoeda(metricas.recebido)}</strong>
                        <small className="mgmt-metric-hint">Pagamentos menos reembolsos</small>
                    </div>
                </article>
                <article className="mgmt-metric warning">
                    <span className="mgmt-metric-icon"><CreditCard size={20} /></span>
                    <div className="mgmt-metric-copy">
                        <span className="mgmt-metric-label">Reembolsado</span>
                        <strong className="mgmt-metric-value">{formatarMoeda(metricas.reembolsado)}</strong>
                        <small className="mgmt-metric-hint">Devoluções registadas</small>
                    </div>
                </article>
            </section>

            <section className="mgmt-toolbar" aria-label="Filtros de agendamentos">
                <div className="mgmt-search">
                    <Search size={16} />
                    <input
                        type="search"
                        value={pesquisa}
                        onChange={(evento) => setPesquisa(evento.target.value)}
                        placeholder="Pesquisar por cliente, telefone ou nº"
                        aria-label="Pesquisar agendamentos"
                    />
                    {pesquisa && (
                        <button type="button" className="mgmt-search-clear" onClick={() => setPesquisa("")} aria-label="Limpar pesquisa">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="mgmt-select-wrap">
                    <select
                        className="mgmt-select"
                        value={filtroEstado}
                        onChange={(evento) => setFiltroEstado(evento.target.value)}
                        aria-label="Filtrar por estado"
                    >
                        {ESTADOS.map((estado) => (
                            <option key={estado} value={estado}>
                                {estado === "Todos" ? "Todos os estados" : rotuloEstado(estado)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} />
                </div>

                <span className="mgmt-toolbar-meta">
                    <strong>{filtrados.length}</strong> de {agendamentos.length}
                </span>
            </section>

            <MensagemErro>{error}</MensagemErro>

            {loading ? (
                <section className="agenda-grid" aria-label="A carregar agendamentos">
                    {Array.from({ length: 6 }).map((_, indice) => (
                        <div className="agenda-card agenda-skeleton" key={`skeleton-${indice}`}>
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </section>
            ) : filtrados.length === 0 ? (
                <section className="agenda-empty">
                    <span className="agenda-empty-icon"><CalendarClock size={30} /></span>
                    <strong>Sem agendamentos</strong>
                    <p>
                        {agendamentos.length === 0
                            ? "Ainda não existem pacotes pré-pagos registados."
                            : "Nenhum agendamento corresponde aos filtros selecionados."}
                    </p>
                    {podeCriar && agendamentos.length === 0 && (
                        <button type="button" className="mgmt-btn primary" onClick={abrirNovo}>
                            <Plus size={16} />
                            Criar primeiro agendamento
                        </button>
                    )}
                </section>
            ) : (
                <section className="agenda-grid" aria-label="Lista de agendamentos">
                    {filtrados.map((agendamento) => (
                        <article className="agenda-card" key={agendamento.id}>
                            <div className="agenda-card-head">
                                <span className="agenda-avatar">{iniciais(agendamento)}</span>
                                <div className="agenda-card-client">
                                    <strong>{nomeCliente(agendamento)}</strong>
                                    <small>{agendamento.cliente_telefone || `Agendamento #${agendamento.id}`}</small>
                                </div>
                                <span className={`agenda-badge ${tomEstado(agendamento.estado)}`}>
                                    {rotuloEstado(agendamento.estado)}
                                </span>
                            </div>

                            <div className="agenda-card-metrics">
                                <div>
                                    <span>Total</span>
                                    <strong>{formatarMoeda(agendamento.valor_total)}</strong>
                                </div>
                                <div>
                                    <span>Pago líquido</span>
                                    <strong>{formatarMoeda(agendamento.valor_pago_liquido)}</strong>
                                </div>
                                <div>
                                    <span>Restante</span>
                                    <strong>{agendamento.quantidade_restante} un.</strong>
                                </div>
                            </div>

                            <div className="agenda-card-footer">
                                <span className="agenda-created">
                                    <CalendarClock size={14} />
                                    {formatarDataHora(agendamento.criado_em)}
                                </span>
                                <span className={`agenda-pay-state ${Number(agendamento.saldo) > 0 ? "pending" : "settled"}`}>
                                    {Number(agendamento.saldo) > 0
                                        ? `${formatarMoeda(agendamento.saldo)} em falta`
                                        : "Liquidado"}
                                </span>
                                <button type="button" className="mgmt-tool" onClick={() => abrirDetalhe(agendamento.id)}>
                                    <Eye size={16} />
                                    Abrir
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            {modal === "novo" && (
                <NovoAgendamentoModal
                    clientes={clientes}
                    servicos={servicos}
                    carregandoReferencias={referenciasLoading}
                    erroReferencias={referenciasErro}
                    onRecarregarReferencias={carregarReferencias}
                    onClose={fecharModal}
                    onCreated={async (data) => {
                        setModal("detalhe")
                        setDetalhe(data)
                        setSucesso("Agendamento criado. Registe o pagamento para ativar o saldo.")
                        await carregar()
                    }}
                />
            )}

            {modal === "detalhe" && (
                <DetalheModal
                    agendamento={detalhe}
                    loading={detalheLoading}
                    erro={acaoErro}
                    sucesso={sucesso}
                    podePagar={podePagar}
                    podeConsumir={podeConsumir}
                    podeCancelar={podeCancelar}
                    onClose={fecharModal}
                    onPagar={() => {
                        setAcaoErro(null)
                        setModal("pagamento")
                    }}
                    onConsumir={() => {
                        setAcaoErro(null)
                        setModal("consumo")
                    }}
                    onCancelar={() => {
                        setAcaoErro(null)
                        setModal("cancelamento")
                    }}
                    onRecarregar={() => recarregarDetalhe()}
                />
            )}

            {modal === "pagamento" && detalhe && (
                <PagamentoModal
                    agendamento={detalhe}
                    onClose={() => setModal("detalhe")}
                    onDone={aposPagamento}
                />
            )}

            {modal === "consumo" && detalhe && (
                <ConsumoModal
                    agendamento={detalhe}
                    funcionarios={funcionarios}
                    onClose={() => setModal("detalhe")}
                    onDone={aposConsumo}
                />
            )}

            {modal === "cancelamento" && detalhe && (
                <CancelamentoModal
                    agendamento={detalhe}
                    onClose={() => setModal("detalhe")}
                    onDone={aposCancelamento}
                />
            )}
        </div>
    )
}
