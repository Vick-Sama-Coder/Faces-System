import { useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Loader2,
    Save,
    TrendingUp,
    UserRound
} from "lucide-react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import {
    getApiError,
    getAssiduidade,
    getFuncionarios,
    registarDiaAssiduidade
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import { horaParaMinutos } from "../../utils/validacoes.js"
import "../admin/admin.css"
import "./horario.css"

const HORAS_PREVISTAS_DIA = 10 * 60
const HORARIO_BASE = { entrada: "09:00", saida: "19:00" }
const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function pad2(valor) {
    return String(valor).padStart(2, "0")
}

function dataAtual() {
    const agora = new Date()
    return `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())}`
}

function periodoAtual() {
    return dataAtual().slice(0, 7)
}

function normalizarData(valor) {
    return String(valor || "").slice(0, 10)
}

function limitesDoMes(periodo) {
    const [ano, mes] = periodo.split("-").map(Number)
    const totalDias = new Date(ano, mes, 0).getDate()
    return {
        de: `${periodo}-01`,
        ate: `${periodo}-${pad2(totalDias)}`
    }
}

function criarDiasDoMes(periodo) {
    const [ano, mes] = periodo.split("-").map(Number)
    if (!ano || !mes) return []

    const totalDias = new Date(ano, mes, 0).getDate()
    const hoje = dataAtual()

    return Array.from({ length: totalDias }, (_, indice) => {
        const dia = indice + 1
        const data = `${ano}-${pad2(mes)}-${pad2(dia)}`
        const objetoData = new Date(ano, mes - 1, dia)
        const diaSemana = objetoData.getDay()

        return {
            dia,
            data,
            diaSemana,
            fimSemana: diaSemana === 0 || diaSemana === 6,
            hoje: data === hoje
        }
    })
}

function nomeDoMes(periodo) {
    const [ano, mes] = periodo.split("-").map(Number)
    if (!ano || !mes) return periodo

    const texto = new Intl.DateTimeFormat("pt-PT", {
        month: "long",
        year: "numeric"
    }).format(new Date(ano, mes - 1, 1))

    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatarHora(valor) {
    return String(valor || "").slice(0, 5)
}

function formatarDuracao(minutos) {
    if (minutos === null || minutos === undefined) return "—"

    const total = Math.max(0, Math.round(Number(minutos) || 0))
    const horas = Math.floor(total / 60)
    const restantes = total % 60

    return `${horas}h ${pad2(restantes)}m`
}

function calcularHorasDia(registo) {
    const entrada = formatarHora(registo?.hora_entrada_real)
    const saida = formatarHora(registo?.hora_saida_real)
    const entradaMin = entrada ? horaParaMinutos(entrada) : null
    const saidaMin = saida ? horaParaMinutos(saida) : null
    const completo = entradaMin !== null && saidaMin !== null
    const invalido = completo && saidaMin <= entradaMin

    const trabalhadas = completo && !invalido ? saidaMin - entradaMin : 0
    const previstas = completo && !invalido ? HORAS_PREVISTAS_DIA : 0
    const naoTrabalhadas = previstas > 0
        ? Math.max(0, HORAS_PREVISTAS_DIA - trabalhadas)
        : 0

    return {
        entrada,
        saida,
        entradaMin,
        saidaMin,
        completo,
        invalido,
        trabalhadas,
        naoTrabalhadas,
        previstas
    }
}

function validarHorasDoDia(entrada, saida) {
    const entradaMin = entrada ? horaParaMinutos(entrada) : null
    const saidaMin = saida ? horaParaMinutos(saida) : null

    if (entrada && entradaMin === null) {
        return "Hora de entrada inválida."
    }

    if (saida && saidaMin === null) {
        return "Hora de saída inválida."
    }

    if (entradaMin !== null && saidaMin !== null && saidaMin <= entradaMin) {
        return "A hora de saída deve ser posterior à hora de entrada."
    }

    return null
}

function resumirRegistos(registos) {
    let trabalhadas = 0
    let naoTrabalhadas = 0
    let previstas = 0
    let dias = 0

    for (const registo of registos) {
        const calculo = calcularHorasDia(registo)

        if (calculo.previstas > 0) {
            trabalhadas += calculo.trabalhadas
            naoTrabalhadas += calculo.naoTrabalhadas
            previstas += calculo.previstas
            dias += 1
        }
    }

    return {
        trabalhadas,
        naoTrabalhadas,
        previstas,
        dias,
        efetividade: previstas > 0 ? (trabalhadas / previstas) * 100 : 0
    }
}

function iniciaisDoNome(nome) {
    return String(nome || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte.charAt(0))
        .join("")
        .toUpperCase()
}

function HorarioPage() {
    const { user } = useAuthStore()
    const podeGerir = user?.permissoes?.includes("assiduidade:gerir")

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [funcionarios, setFuncionarios] = useState([])
    const [funcionarioId, setFuncionarioId] = useState("")
    const [periodo, setPeriodo] = useState(periodoAtual())
    const [registosMes, setRegistosMes] = useState([])
    const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(true)
    const [carregandoRegistos, setCarregandoRegistos] = useState(true)
    const [erro, setErro] = useState(null)
    const [sucesso, setSucesso] = useState(null)
    const [alterados, setAlterados] = useState(() => new Set())
    const [estados, setEstados] = useState({})
    const [errosDia, setErrosDia] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [versao, setVersao] = useState(0)

    useEffect(() => {
        let activo = true

        async function carregarFuncionarios() {
            setCarregandoFuncionarios(true)

            try {
                const resposta = await getFuncionarios()
                if (!activo) return

                const lista = Array.isArray(resposta.data) ? resposta.data : []
                setFuncionarios(lista)

                if (lista.length > 0) {
                    const inicial = lista.find((item) => item.estado === "Ativo") || lista[0]
                    setFuncionarioId((actual) => actual || String(inicial.id))
                }
            } catch (error) {
                if (activo) setErro(getApiError(error))
            } finally {
                if (activo) setCarregandoFuncionarios(false)
            }
        }

        carregarFuncionarios()
        return () => { activo = false }
    }, [])

    useEffect(() => {
        let activo = true

        if (!podeGerir) {
            return undefined
        }

        async function carregarRegistos() {
            const { de, ate } = limitesDoMes(periodo)
            setCarregandoRegistos(true)
            setErro(null)

            try {
                const resposta = await getAssiduidade({ de, ate })
                if (!activo) return

                setRegistosMes(Array.isArray(resposta.data) ? resposta.data : [])
                setAlterados(new Set())
                setEstados({})
                setErrosDia({})
            } catch (error) {
                if (!activo) return
                setRegistosMes([])
                setErro(getApiError(error))
            } finally {
                if (activo) setCarregandoRegistos(false)
            }
        }

        carregarRegistos()
        return () => { activo = false }
    }, [periodo, versao, podeGerir])

    useEffect(() => {
        if (alterados.size === 0) return undefined

        function avisarSaida(event) {
            event.preventDefault()
            event.returnValue = ""
        }

        window.addEventListener("beforeunload", avisarSaida)
        return () => window.removeEventListener("beforeunload", avisarSaida)
    }, [alterados.size])

    const dias = useMemo(() => criarDiasDoMes(periodo), [periodo])

    const registosPorData = useMemo(() => {
        const mapa = new Map()

        for (const registo of registosMes) {
            if (String(registo.funcionario_id) === String(funcionarioId)) {
                mapa.set(normalizarData(registo.data), registo)
            }
        }

        return mapa
    }, [registosMes, funcionarioId])

    const linhas = useMemo(() => dias.map((dia) => {
        const registo = registosPorData.get(dia.data) || null
        return { ...dia, registo, ...calcularHorasDia(registo) }
    }), [dias, registosPorData])

    const resumo = useMemo(
        () => resumirRegistos(Array.from(registosPorData.values())),
        [registosPorData]
    )

    const resumosEquipa = useMemo(() => {
        const porFuncionario = new Map()

        for (const funcionario of funcionarios) {
            porFuncionario.set(String(funcionario.id), [])
        }

        for (const registo of registosMes) {
            const chave = String(registo.funcionario_id)
            if (!porFuncionario.has(chave)) porFuncionario.set(chave, [])
            porFuncionario.get(chave).push(registo)
        }

        return funcionarios.map((funcionario) => ({
            ...funcionario,
            resumo: resumirRegistos(porFuncionario.get(String(funcionario.id)) || [])
        }))
    }, [funcionarios, registosMes])

    const funcionarioSelecionado = funcionarios.find(
        (item) => String(item.id) === String(funcionarioId)
    )

    function confirmarDescarte() {
        if (alterados.size === 0) return true
        return window.confirm("Existem alterações por guardar. Se continuar, serão perdidas.")
    }

    function limparEstadoTemporario() {
        setAlterados(new Set())
        setEstados({})
        setErrosDia({})
    }

    function mudarPeriodo(event) {
        const novoPeriodo = event.target.value
        if (!novoPeriodo || novoPeriodo === periodo) return
        if (!confirmarDescarte()) {
            event.target.value = periodo
            return
        }

        limparEstadoTemporario()
        setSucesso(null)
        setErro(null)
        setPeriodo(novoPeriodo)
    }

    function selecionarFuncionario(novoId) {
        if (salvando) return false
        if (!novoId || String(novoId) === String(funcionarioId)) return true
        if (!confirmarDescarte()) return false

        const tinhaAlteracoes = alterados.size > 0
        limparEstadoTemporario()
        setFuncionarioId(String(novoId))
        setSucesso(null)
        setErro(null)

        if (tinhaAlteracoes) {
            setVersao((valor) => valor + 1)
        }

        return true
    }

    function mudarFuncionario(event) {
        const novoId = event.target.value
        const aplicado = selecionarFuncionario(novoId)

        if (!aplicado || !novoId) {
            event.target.value = funcionarioId
        }
    }

    function alterarHora(data, campo, valor) {
        if (!podeGerir || salvando || !funcionarioId) return

        const campoApi = campo === "entrada" ? "hora_entrada_real" : "hora_saida_real"

        setRegistosMes((anterior) => {
            const indice = anterior.findIndex((registo) => (
                String(registo.funcionario_id) === String(funcionarioId)
                && normalizarData(registo.data) === data
            ))

            if (indice >= 0) {
                const copia = [...anterior]
                copia[indice] = { ...copia[indice], [campoApi]: valor || null }
                return copia
            }

            return [
                ...anterior,
                {
                    id: null,
                    funcionario_id: Number(funcionarioId),
                    data,
                    hora_entrada_real: null,
                    hora_saida_real: null,
                    [campoApi]: valor || null
                }
            ]
        })

        setAlterados((anterior) => {
            const novo = new Set(anterior)
            novo.add(data)
            return novo
        })
        setEstados((anterior) => ({ ...anterior, [data]: "pendente" }))
        setErrosDia((anterior) => {
            const novo = { ...anterior }
            delete novo[data]
            return novo
        })
        setSucesso(null)
        setErro(null)
    }

    async function guardarAlteracoes() {
        if (!podeGerir || salvando || carregandoRegistos || !funcionarioId || alterados.size === 0) {
            return
        }

        const datas = Array.from(alterados).sort()
        const novosAlterados = new Set(alterados)
        const novosEstados = { ...estados }
        const novosErros = { ...errosDia }
        const registosGuardados = []
        let guardados = 0
        let falhas = 0

        setSalvando(true)
        setErro(null)
        setSucesso(null)

        try {
            for (const data of datas) {
                const registo = registosMes.find((item) => (
                    String(item.funcionario_id) === String(funcionarioId)
                    && normalizarData(item.data) === data
                ))
                const entrada = formatarHora(registo?.hora_entrada_real) || null
                const saida = formatarHora(registo?.hora_saida_real) || null
                const erroHoras = validarHorasDoDia(entrada, saida)

                if (erroHoras) {
                    novosEstados[data] = "erro"
                    novosErros[data] = erroHoras
                    falhas += 1
                    continue
                }

                if (!registo?.id && !entrada && !saida) {
                    novosAlterados.delete(data)
                    delete novosEstados[data]
                    delete novosErros[data]
                    continue
                }

                try {
                    const resposta = await registarDiaAssiduidade({
                        funcionario_id: Number(funcionarioId),
                        data,
                        hora_entrada_real: entrada,
                        hora_saida_real: saida
                    })

                    registosGuardados.push(resposta.data)
                    novosAlterados.delete(data)
                    novosEstados[data] = "guardado"
                    delete novosErros[data]
                    guardados += 1
                } catch (error) {
                    novosEstados[data] = "erro"
                    novosErros[data] = getApiError(error)
                    falhas += 1
                }
            }

            if (registosGuardados.length > 0) {
                setRegistosMes((anterior) => {
                    const copia = [...anterior]

                    for (const registo of registosGuardados) {
                        const indice = copia.findIndex((item) => (
                            String(item.funcionario_id) === String(registo.funcionario_id)
                            && normalizarData(item.data) === normalizarData(registo.data)
                        ))

                        if (indice >= 0) {
                            copia[indice] = registo
                        } else {
                            copia.push(registo)
                        }
                    }

                    return copia
                })
            }

            setAlterados(novosAlterados)
            setEstados(novosEstados)
            setErrosDia(novosErros)

            if (falhas === 0) {
                setSucesso(
                    guardados > 0
                        ? `${guardados} ${guardados === 1 ? "dia guardado" : "dias guardados"} com sucesso.`
                        : "Não havia alterações para guardar."
                )
            } else {
                setErro(
                    `${guardados} ${guardados === 1 ? "dia guardado" : "dias guardados"}; `
                    + `${falhas} ${falhas === 1 ? "dia com erro" : "dias com erro"}. Corrija os dias assinalados.`
                )
            }
        } finally {
            setSalvando(false)
        }
    }

    function estadoDaLinha(linha) {
        if (errosDia[linha.data]) {
            return { tipo: "erro", texto: "Erro", titulo: errosDia[linha.data] }
        }

        if (linha.invalido) {
            return {
                tipo: "erro",
                texto: "Hora inválida",
                titulo: "A hora de saída deve ser posterior à hora de entrada."
            }
        }

        if ((linha.entrada && !linha.saida) || (!linha.entrada && linha.saida)) {
            return {
                tipo: "aviso",
                texto: "Incompleto",
                titulo: "Falta a entrada ou a saída; este dia não conta para as horas previstas."
            }
        }

        if (estados[linha.data] === "pendente") {
            return { tipo: "pendente", texto: "Por guardar" }
        }

        if (estados[linha.data] === "guardado") {
            return { tipo: "guardado", texto: "Guardado" }
        }

        return null
    }

    function abrirFuncionarioPeloTeclado(event, id) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            selecionarFuncionario(id)
        }
    }

    const totalPorGuardar = alterados.size

    return (
        <div className="admin-main">
            <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <Headers
                heady="admin-header"
                title="Horários"
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
                            <h1 className="admin-page-title">Controlo mensal de horários</h1>
                            <p className="admin-page-subtitle">
                                Registe a entrada e a saída de cada funcionário. Base diária: {HORARIO_BASE.entrada}–{HORARIO_BASE.saida} (10 horas).
                            </p>
                        </div>

                        <div className="admin-page-actions">
                            {totalPorGuardar > 0 && (
                                <span className="horario-dirty-count">
                                    {totalPorGuardar} {totalPorGuardar === 1 ? "dia por guardar" : "dias por guardar"}
                                </span>
                            )}
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={guardarAlteracoes}
                                disabled={!podeGerir || salvando || carregandoRegistos || totalPorGuardar === 0}
                            >
                                {salvando ? <Loader2 size={18} className="horario-spin" /> : <Save size={18} />}
                                {salvando ? "A guardar..." : "Guardar alterações"}
                            </button>
                        </div>
                    </div>
                </header>

                {erro && <div className="admin-alert error" role="alert">{erro}</div>}
                {sucesso && <div className="admin-alert success" role="status">{sucesso}</div>}

                <section className="horario-toolbar-card">
                    <div className="horario-toolbar-fields">
                        <div className="horario-selector-field">
                            <label htmlFor="horario-mes">
                                <CalendarDays size={15} />
                                Mês
                            </label>
                            <input
                                id="horario-mes"
                                type="month"
                                value={periodo}
                                onChange={mudarPeriodo}
                                disabled={salvando}
                            />
                        </div>

                        <div className="horario-selector-field">
                            <label htmlFor="horario-funcionario">
                                <UserRound size={15} />
                                Funcionário
                            </label>
                            <select
                                id="horario-funcionario"
                                value={funcionarioId}
                                onChange={mudarFuncionario}
                                disabled={carregandoFuncionarios || salvando || funcionarios.length === 0}
                            >
                                <option value="">
                                    {carregandoFuncionarios ? "A carregar funcionários..." : "Selecione um funcionário"}
                                </option>
                                {funcionarios.map((funcionario) => (
                                    <option key={funcionario.id} value={funcionario.id}>
                                        {funcionario.nome}{funcionario.estado !== "Ativo" ? " (inativo)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="horario-base-chip">
                        <Clock3 size={19} />
                        <div>
                            <strong>Base diária</strong>
                            <span>{HORARIO_BASE.entrada}–{HORARIO_BASE.saida} · 10h por dia</span>
                        </div>
                    </div>
                </section>

                {!carregandoFuncionarios && funcionarios.length === 0 && (
                    <div className="admin-alert info">
                        Ainda não existem funcionários registados. Crie um funcionário antes de registar horários.
                    </div>
                )}

                <section className="horario-stats-grid" aria-label="Resumo mensal">
                    <article className="horario-stat-card">
                        <span className="horario-stat-icon success"><CheckCircle2 size={20} /></span>
                        <div>
                            <span className="horario-stat-label">Horas trabalhadas</span>
                            <strong>{formatarDuracao(resumo.trabalhadas)}</strong>
                            <small>{resumo.dias} {resumo.dias === 1 ? "dia completo" : "dias completos"}</small>
                        </div>
                    </article>

                    <article className="horario-stat-card">
                        <span className="horario-stat-icon warning"><AlertCircle size={20} /></span>
                        <div>
                            <span className="horario-stat-label">Horas não trabalhadas</span>
                            <strong>{formatarDuracao(resumo.naoTrabalhadas)}</strong>
                            <small>Diferença para as 10h diárias</small>
                        </div>
                    </article>

                    <article className="horario-stat-card">
                        <span className="horario-stat-icon primary"><Clock3 size={20} /></span>
                        <div>
                            <span className="horario-stat-label">Horas previstas</span>
                            <strong>{resumo.previstas > 0 ? formatarDuracao(resumo.previstas) : "—"}</strong>
                            <small>10h por dia completo</small>
                        </div>
                    </article>

                    <article className="horario-stat-card">
                        <span className="horario-stat-icon accent"><TrendingUp size={20} /></span>
                        <div>
                            <span className="horario-stat-label">Efetividade</span>
                            <strong>{resumo.previstas > 0 ? `${resumo.efetividade.toFixed(1)}%` : "—"}</strong>
                            <small>Trabalhadas / previstas</small>
                        </div>
                    </article>
                </section>

                <section className="horario-panel">
                    <header className="horario-panel-header">
                        <div>
                            <h2>{nomeDoMes(periodo)}</h2>
                            <p>
                                {funcionarioSelecionado
                                    ? `Registo diário de ${funcionarioSelecionado.nome}`
                                    : "Selecione um funcionário para registar as horas."}
                            </p>
                        </div>

                        <div className="horario-panel-meta">
                            <span className="admin-badge primary">
                                {resumo.dias} {resumo.dias === 1 ? "dia completo" : "dias completos"}
                            </span>
                            {totalPorGuardar > 0 && (
                                <span className="admin-badge warning">{totalPorGuardar} por guardar</span>
                            )}
                        </div>
                    </header>

                    {carregandoRegistos ? (
                        <div className="horario-loading" role="status">
                            <Loader2 size={22} className="horario-spin" />
                            A carregar registos do mês...
                        </div>
                    ) : !funcionarioId ? (
                        <div className="admin-empty">
                            Selecione um funcionário para consultar ou registar o horário mensal.
                        </div>
                    ) : (
                        <>
                            <div className="horario-table-wrap">
                                <table className="horario-table">
                                    <thead>
                                        <tr>
                                            <th>Dia</th>
                                            <th>Entrada</th>
                                            <th>Saída</th>
                                            <th>Horas trabalhadas</th>
                                            <th>Horas não trabalhadas</th>
                                            <th>Horas previstas</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linhas.map((linha) => {
                                            const estado = estadoDaLinha(linha)

                                            return (
                                                <tr
                                                    key={linha.data}
                                                    className={[
                                                        linha.fimSemana ? "fim-semana" : "",
                                                        linha.hoje ? "dia-hoje" : ""
                                                    ].filter(Boolean).join(" ")}
                                                >
                                                    <td>
                                                        <div className="horario-dia">
                                                            <strong>{pad2(linha.dia)}</strong>
                                                            <span>{DIAS_CURTOS[linha.diaSemana]}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="horario-time-input"
                                                            value={linha.entrada}
                                                            onChange={(event) => alterarHora(linha.data, "entrada", event.target.value)}
                                                            disabled={!podeGerir || salvando}
                                                            aria-label={`Hora de entrada do dia ${linha.dia}`}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="horario-time-input"
                                                            value={linha.saida}
                                                            onChange={(event) => alterarHora(linha.data, "saida", event.target.value)}
                                                            disabled={!podeGerir || salvando}
                                                            aria-label={`Hora de saída do dia ${linha.dia}`}
                                                        />
                                                    </td>
                                                    <td className="horario-value">
                                                        {linha.previstas > 0 ? formatarDuracao(linha.trabalhadas) : "—"}
                                                    </td>
                                                    <td className="horario-value">
                                                        {linha.previstas > 0 ? formatarDuracao(linha.naoTrabalhadas) : "—"}
                                                    </td>
                                                    <td className="horario-value">
                                                        {linha.previstas > 0 ? formatarDuracao(linha.previstas) : "—"}
                                                    </td>
                                                    <td>
                                                        {estado ? (
                                                            <span
                                                                className={`horario-status ${estado.tipo}`}
                                                                title={estado.titulo || undefined}
                                                            >
                                                                {estado.texto}
                                                            </span>
                                                        ) : (
                                                            <span className="horario-status-empty">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>Total do mês</td>
                                            <td>{formatarDuracao(resumo.trabalhadas)}</td>
                                            <td>{formatarDuracao(resumo.naoTrabalhadas)}</td>
                                            <td>{resumo.previstas > 0 ? formatarDuracao(resumo.previstas) : "—"}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <p className="horario-table-note">
                                Dias sem entrada e saída não entram nas horas previstas. A saída tem de ser posterior à entrada e não há desconto de almoço.
                            </p>
                        </>
                    )}
                </section>

                {funcionarios.length > 0 && (
                    <section className="horario-panel">
                        <header className="horario-panel-header">
                            <div>
                                <h2>Resumo da equipa</h2>
                                <p>Horas por funcionário em {nomeDoMes(periodo)}.</p>
                            </div>
                        </header>

                        <div className="horario-team-table-wrap">
                            <table className="horario-team-table">
                                <thead>
                                    <tr>
                                        <th>Funcionário</th>
                                        <th>Dias completos</th>
                                        <th>Horas trabalhadas</th>
                                        <th>Horas não trabalhadas</th>
                                        <th>Horas previstas</th>
                                        <th>Efetividade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumosEquipa.map((funcionario) => {
                                        const selecionado = String(funcionario.id) === String(funcionarioId)
                                        const resumoFuncionario = funcionario.resumo

                                        return (
                                            <tr
                                                key={funcionario.id}
                                                className={selecionado ? "selecionado" : ""}
                                                onClick={() => selecionarFuncionario(funcionario.id)}
                                                onKeyDown={(event) => abrirFuncionarioPeloTeclado(event, funcionario.id)}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`Ver horário de ${funcionario.nome}`}
                                            >
                                                <td>
                                                    <div className="horario-funcionario-cell">
                                                        <span className="horario-avatar">
                                                            {iniciaisDoNome(funcionario.nome)}
                                                        </span>
                                                        <div>
                                                            <strong>{funcionario.nome}</strong>
                                                            <span>
                                                                {funcionario.cargo || "Funcionário"}
                                                                {funcionario.estado !== "Ativo" ? " · inativo" : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{resumoFuncionario.dias}</td>
                                                <td>{formatarDuracao(resumoFuncionario.trabalhadas)}</td>
                                                <td>{formatarDuracao(resumoFuncionario.naoTrabalhadas)}</td>
                                                <td>{resumoFuncionario.previstas > 0 ? formatarDuracao(resumoFuncionario.previstas) : "—"}</td>
                                                <td>
                                                    <strong>
                                                        {resumoFuncionario.previstas > 0
                                                            ? `${resumoFuncionario.efetividade.toFixed(1)}%`
                                                            : "—"}
                                                    </strong>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}

export default HorarioPage
