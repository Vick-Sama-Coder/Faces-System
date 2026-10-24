import { useEffect, useState, useCallback } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import {
    getHorariosFuncionario,
    createHorarioFuncionario,
    deleteHorarioFuncionario,
    substituirHorariosFuncionario,
    getAssiduidade,
    createAssiduidade,
    getProcessamentos,
    processarSalarios,
} from "../../services/api.js"
import { getApiError } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import Input from "../../components/forms/input/input.jsx"
import Button from "../../components/forms/button/button.jsx"
import { useParams } from "react-router-dom"
import { AlertCircle, Trash2, Users, DollarSign } from "lucide-react"

function RhPage() {
    const { user } = useAuthStore()
    const { id: funcId } = useParams()
    const podeEscrever = user?.permissoes?.includes("funcionarios:escrever")

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [tabAtivo, setTabAtivo] = useState("horarios")

    // --- separador Horários ---
    const [horarios, setHorarios] = useState([])
    const [loadingHorarios, setLoadingHorarios] = useState(true)
    const [errorHorarios, setErrorHorarios] = useState(null)
    const [substituindo, setSubstituindo] = useState(false)
    const [formHorario, setFormHorario] = useState({
        dia_semana: null,
        hora_entrada: "",
        hora_saida: "",
    })

    const carregarHorarios = useCallback(async () => {
        setLoadingHorarios(true)
        setErrorHorarios(null)
        try {
            if (funcId) {
                const res = await getHorariosFuncionario(funcId)
                setHorarios(Array.isArray(res.data) ? res.data : [])
            } else {
                setHorarios([])
            }
        } catch (err) {
            setErrorHorarios(getApiError(err))
        } finally {
            setLoadingHorarios(false)
        }
    }, [funcId])

    useEffect(() => {
        ;(async () => {
            await carregarHorarios()
        })()
    }, [funcId, carregarHorarios])

    async function handleCreateHorario(e) {
        e.preventDefault()
        if (!formHorario.dia_semana || !formHorario.hora_entrada || !formHorario.hora_saida) return
        try {
            await createHorarioFuncionario(funcId, {
                dia_semana: Number(formHorario.dia_semana),
                hora_entrada: formHorario.hora_entrada,
                hora_saida: formHorario.hora_saida,
            })
            setFormHorario({ dia_semana: null, hora_entrada: "", hora_saida: "" })
            await carregarHorarios()
        } catch (err) {
            setErrorHorarios(getApiError(err))
        }
    }

    async function handleDeleteHorario(id) {
        if (!window.confirm("Confirmar exclusão?")) return
        try {
            await deleteHorarioFuncionario(funcId, id)
            await carregarHorarios()
        } catch (err) {
            setErrorHorarios(getApiError(err))
        }
    }

    async function handleSubstituirHorarios() {
        if (!window.confirm("Substituir toda a programação semanal deste funcionário pelos horários listados?")) return
        try {
            setSubstituindo(true)
            setErrorHorarios(null)
            await substituirHorariosFuncionario(funcId, horarios)
            await carregarHorarios()
        } catch (err) {
            setErrorHorarios(getApiError(err))
        } finally {
            setSubstituindo(false)
        }
    }

    // --- separador Assiduidade/Efetividade ---
    const [assiduidade, setAssiduidade] = useState([])
    const [loadingAssid, setLoadingAssid] = useState(true)
    const [errorAssid, setErrorAssid] = useState(null)
    const [mesAno] = useState("2026-10")

    const [formAssid, setFormAssid] = useState({
        funcionario_id: null,
        data: "",
        hora_entrada_real: "",
        hora_saida_real: "",
        tipo_ocorrencia: "sem_registo",
        justificacao: "",
    })

    const carregarAssiduidade = useCallback(async () => {
        setLoadingAssid(true)
        setErrorAssid(null)
        try {
            if (funcId) {
                const res = await getAssiduidade({ funcionario: funcId, de: `${mesAno}-01`, ate: `${mesAno}-31` })
                setAssiduidade(Array.isArray(res.data) ? res.data : [])
            } else {
                setAssiduidade([])
            }
        } catch (err) {
            setErrorAssid(getApiError(err))
        } finally {
            setLoadingAssid(false)
        }
    }, [funcId, mesAno])

    useEffect(() => {
        ;(async () => {
            await carregarAssiduidade()
        })()
    }, [funcId, mesAno, carregarAssiduidade])

    async function handleRegistarAssiduidade(e) {
        e.preventDefault()
        if (!formAssid.funcionario_id || !formAssid.data || !formAssid.hora_entrada_real || !formAssid.hora_saida_real) return
        try {
            await createAssiduidade({
                funcionario_id: formAssid.funcionario_id,
                data: formAssid.data,
                hora_entrada_real: formAssid.hora_entrada_real,
                hora_saida_real: formAssid.hora_saida_real,
                tipo_ocorrencia: formAssid.tipo_ocorrencia || "sem_registo",
                justificacao: formAssid.justificacao || null,
                estado: "Registado",
            })
            setFormAssid({
                funcionario_id: null,
                data: "",
                hora_entrada_real: "",
                hora_saida_real: "",
                tipo_ocorrencia: "sem_registo",
                justificacao: "",
            })
            await carregarAssiduidade()
        } catch (err) {
            setErrorAssid(getApiError(err))
        }
    }

    function calcularEfetividade(row) {
        const horasTrabalhadas = row.total_horas_trabalhadas || 0
        const horasPrevistas = row.total_horas_previstas || 0
        if (horasPrevistas === 0) return 0
        const pct = (horasTrabalhadas / horasPrevistas) * 100
        return Math.round(pct * 100) / 100
    }

    // --- separador Salários ---
    const [processamentos, setProcessamentos] = useState([])
    const [loadingSal, setLoadingSal] = useState(true)
    const [errorSal, setErrorSal] = useState(null)
    const [periodoSal, setPeriodoSal] = useState("2026-10")

    const carregarProcessamentos = useCallback(async () => {
        setLoadingSal(true)
        setErrorSal(null)
        try {
            const res = await getProcessamentos({ periodo: periodoSal })
            setProcessamentos(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setErrorSal(getApiError(err))
        } finally {
            setLoadingSal(false)
        }
    }, [periodoSal])

    useEffect(() => {
        ;(async () => {
            await carregarProcessamentos()
        })()
    }, [periodoSal, carregarProcessamentos])

    async function executarProcessamento(periodo) {
        try {
            await processarSalarios(periodo)
            await carregarProcessamentos()
        } catch (err) {
            setErrorSal(getApiError(err))
        }
    }

    return (
        <>
            <div className="admin-main">
                <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Headers
                    heady="admin-header"
                    title="RH / Folha"
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
                                <h1 className="admin-page-title">{funcId ? "Funcionário" : "Equipa"} — RH</h1>
                                <p className="admin-page-subtitle">
                                    Gerencie horários, assiduidade e salários
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="rh-tabs">
                        <button className={tabAtivo === "horarios" ? "rh-tab-active" : "rh-tab"} onClick={() => setTabAtivo("horarios")}>
                            <span>Horários</span>
                            {funcId && <span>{horarios.length} registos</span>}
                        </button>
                        <button className={tabAtivo === "assiduidade" ? "rh-tab-active" : "rh-tab"} onClick={() => setTabAtivo("assiduidade")}>
                            <span>Assiduidade / Efetividade</span>
                            {funcId && <span>{assiduidade.length} registos</span>}
                        </button>
                        <button className={tabAtivo === "salarios" ? "rh-tab-active" : "rh-tab"} onClick={() => setTabAtivo("salarios")}>
                            <span>Salários</span>
                            {funcId && <span>{processamentos.length} processamentos</span>}
                        </button>
                    </div>

                    {tabAtivo === "horarios" && (
                        <section className="admin-table-wrap">
                            {loadingHorarios ? (
                                <p className="admin-empty">A carregar horários...</p>
                            ) : errorHorarios ? (
                                <p className="admin-empty error">Erro: {errorHorarios}</p>
                            ) : (
                                <>
                                    <div className="admin-form-inline">
                                        <Input
                                            tipo="number"
                                            placeholder="Dia da semana (0-6)"
                                            value={formHorario.dia_semana || ""}
                                            onChange={(e) => setFormHorario({ ...formHorario, dia_semana: Number(e.target.value) })}
                                        />
                                        <Input
                                            tipo="time"
                                            placeholder="Hora entrada"
                                            value={formHorario.hora_entrada || ""}
                                            onChange={(e) => setFormHorario({ ...formHorario, hora_entrada: e.target.value })}
                                        />
                                        <Input
                                            tipo="time"
                                            placeholder="Hora saída"
                                            value={formHorario.hora_saida || ""}
                                            onChange={(e) => setFormHorario({ ...formHorario, hora_saida: e.target.value })}
                                        />
                                        <Button tipo="primary" onClick={handleCreateHorario}>
                                            <span>Registar</span>
                                        </Button>
                                        {podeEscrever && (
                                            <Button
                                                onClick={handleSubstituirHorarios}
                                                disabled={substituindo}
                                            >
                                                <span>{substituindo ? "A substituir..." : "Substituir programação"}</span>
                                            </Button>
                                        )}
                                    </div>

                                    <DataGrid
                                        rowData={horarios}
                                        columnDefs={[
                                            {
                                                headerName: "Dia",
                                                field: "dia_semana",
                                                flex: 1,
                                                cellRenderer: (params) => {
                                                    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
                                                    return dias[params.data?.dia_semana ?? 0] || "—"
                                                },
                                            },
                                            { headerName: "Entrada", field: "hora_entrada", flex: 1 },
                                            { headerName: "Saída", field: "hora_saida", flex: 1 },
                                            { headerName: "Ações", flex: 80, cellRenderer: (params) =>
                                                podeEscrever ? (
                                                    <button
                                                        className="admin-icon-btn danger"
                                                        title="Excluir"
                                                        onClick={() => handleDeleteHorario(params.data.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                ) : null
                                            }
                                        ]}
                                        loading={loadingHorarios}
                                        emptyTitle="Sem horários"
                                        emptyMessage="Registe os horários do funcionário."
                                        emptyIcon={AlertCircle}
                                    />
                                </>
                            )}
                        </section>
                    )}
                    {tabAtivo === "assiduidade" && (
                        <section className="admin-table-wrap">
                            {loadingAssid ? (
                                <p className="admin-empty">A carregar assiduidade...</p>
                            ) : errorAssid ? (
                                <p className="admin-empty error">Erro: {errorAssid}</p>
                            ) : (
                                <>
                                    <div className="admin-form-inline">                                        <Input
                                            tipo="text"
                                            placeholder="Funcionário ID"
                                            value={formAssid.funcionario_id || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, funcionario_id: Number(e.target.value) || null })}
                                        />
                                        <Input
                                            tipo="date"
                                            placeholder="Data"
                                            value={formAssid.data || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, data: e.target.value })}
                                        />
                                        <Input
                                            tipo="time"
                                            placeholder="Entrada"
                                            value={formAssid.hora_entrada_real || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, hora_entrada_real: e.target.value })}
                                        />
                                        <Input
                                            tipo="time"
                                            placeholder="Saída"
                                            value={formAssid.hora_saida_real || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, hora_saida_real: e.target.value })}
                                        />
                                        <Input
                                            tipo="text"
                                            placeholder="Tipo ocorrência"
                                            value={formAssid.tipo_ocorrencia || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, tipo_ocorrencia: e.target.value })}
                                        />
                                        <Input
                                            tipo="text"
                                            placeholder="Justificação"
                                            value={formAssid.justificacao || ""}
                                            onChange={(e) => setFormAssid({ ...formAssid, justificacao: e.target.value })}
                                        />
                                        <Button tipo="primary" onClick={handleRegistarAssiduidade}>
                                            <span>Registar</span>
                                        </Button>
                                    </div>

                                    <DataGrid
                                        rowData={assiduidade}
                                        columnDefs={[
                                            { headerName: "Funcionário", field: "funcionario_nome", flex: 1.5 },
                                            { headerName: "Data", field: "data", flex: 1 },
                                            { headerName: "Entrada", field: "hora_entrada_real", flex: 1 },
                                            { headerName: "Saída", field: "hora_saida_real", flex: 1 },
                                            { headerName: "Trabalhadas", field: "total_horas_trabalhadas", flex: 1 },
                                            { headerName: "Não Trabalhadas", field: "total_horas_nao_trabalhadas", flex: 1 },
                                            { headerName: "% Efetividade", field: "efetividade_calc", flex: 1, cellRenderer: (params) => {
                                                const efetividade = calcularEfetividade(params.data)
                                                return efetividade > 0 ? `${efetividade}%` : "—"
                                            }},
                                        ]}
                                        getRowId={(params) => params.data.id}
                                        loading={loadingAssid}
                                        emptyTitle="Sem registos de assiduidade"
                                        emptyMessage="Registe os registos de presença e frequência."
                                        emptyIcon={Users}
                                    />

                                    <div className="admin-table">
                                        <h3>Resumo Mensal</h3>
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>Total Horas Trabalhadas</td>
                                                    <td>{assiduidade.reduce((s, r) => s + (r.total_horas_trabalhadas || 0), 0) || 0} h</td>
                                                </tr>
                                                <tr>
                                                    <td>Total Horas Não Trabalhadas</td>
                                                    <td>{assiduidade.reduce((s, r) => s + (r.total_horas_nao_trabalhadas || 0), 0) || 0} h</td>
                                                </tr>
                                                <tr>
                                                    <td>Horas Previstas</td>
                                                    <td>{assiduidade.reduce((s, r) => s + (r.total_horas_previstas || 0), 0) || 0} h</td>
                                                </tr>
                                                <tr>
                                                    <td>% Efetividade</td>
                                                    <td>
                                                        {assiduidade.length === 0
                                                            ? "0.00%"
                                                            : (((assiduidade.reduce((s, r) => s + (r.total_horas_trabalhadas || 0), 0) || 0) /
                                                                (assiduidade.reduce((s, r) => s + (r.total_horas_previstas || 0), 0) || 1)) * 100).toFixed(2) + "%"}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </section>
                    )}

                    {tabAtivo === "salarios" && (
                        <section className="admin-table-wrap">
                            {loadingSal ? (
                                <p className="admin-empty">A carregar processamentos...</p>
                            ) : errorSal ? (
                                <p className="admin-empty error">Erro: {errorSal}</p>
                            ) : (
                                <>
                                    <div className="admin-form-inline">
                                        <Input
                                            tipo="text"
                                            placeholder="Período (YYYY-MM)"
                                            value={periodoSal || ""}
                                            onChange={(e) => setPeriodoSal(e.target.value)}
                                        />
                                        <Button tipo="primary" onClick={() => executarProcessamento(periodoSal)}>
                                            <span>Processar</span>
                                        </Button>
                                    </div>

                                    <DataGrid
                                        rowData={processamentos}
                                        columnDefs={[
                                            { headerName: "Período", field: "periodo", flex: 1 },
                                            { headerName: "Funcionário", field: "funcionario_nome", flex: 1.5 },
                                            { headerName: "Base", field: "salario_base", flex: 1 },
                                            { headerName: "Extra", field: "horas_extra_pagamento", flex: 1 },
                                            { headerName: "Descontos", field: "descontos", flex: 1 },
                                            { headerName: "Líquido", field: "salario_liquido", flex: 1 },
                                            { headerName: "Estado", field: "estado", flex: 1 },
                                        ]}
                                        loading={loadingSal}
                                        emptyTitle="Sem processamentos"
                                        emptyMessage="Execute o processamento de salários para o período."
                                        emptyIcon={DollarSign}
                                    />
                                </>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </>
    )
}

export default RhPage
