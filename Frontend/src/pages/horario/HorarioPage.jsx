import { useEffect, useState, useRef } from "react"
import { UserPlus, Edit, Trash2, X } from "lucide-react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import {
  getApiError,
  getHorariosFuncionario,
  createHorarioFuncionario,
  substituirHorariosFuncionario
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import { useParams } from "react-router-dom"

// Funções globais para o DataGrid (definidas no nível de módulo)
window.handleExcluirLocal = function(diaSemana) {
    // Esta função será sobrescrita pelo componente quando mountado
}

// Funções globais para o DataGrid
window.abrirModal = function(dia, entrada, saida) {
    // Será sobrescrito pelo componente quando mountado
}

function HorarioPage() {
    const { user } = useAuthStore()
    const { id: funcId } = useParams()
    const podeEscrever = user?.permissoes?.includes("funcionarios:escrever")

    // State for the form
    const [formDia, setFormDia] = useState(null)
    const [formEntrada, setFormEntrada] = useState("")
    const [formSaida, setFormSaida] = useState("")
    const [editandoHorario, setEditandoHorario] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [horarios, setHorarios] = useState([])
    const [carregandoListagem, setCarregandoListagem] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [error, setError] = useState(null)
    const handleExcluirRef = useRef(handleExcluir)

    // Função para carregar horários - no âmbito do componente
    

    // Efeito para carregar horários quando o componente montar ou funcId mudar
    useEffect(() => {
        carregarHorarios()
    }, [funcId])

    async function carregarHorarios() {
        if (!funcId) return
        setCarregandoListagem(true)
        setError(null)
        try {
            const res = await getHorariosFuncionario(funcId)
            setHorarios(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setCarregandoListagem(false)
        }
    }

    // Atualizar funções globais após o mount do componente
    useEffect(() => {
        window.handleExcluirLocal = function(diaSemana) {
            handleExcluirRef.current(diaSemana)
        }
    }, [])

    // Definição das colunas para o DataGrid
    const colunas = [
        { field: "dia_semana", headerName: "Dia da Semana", width: 120 },
        { field: "hora_entrada", headerName: "Entrada", width: 150 },
        { field: "hora_saida", headerName: "Saída", width: 150 },
        {
            field: "acoes",
            headerName: "Ações",
            width: 180,
            cellRenderer: (params) => {
                const podeEditar = podeEscrever
                const podeExcluir = podeEscrever
                let html = ""
                if (podeEditar) {
                    html += `<button class="admin-icon-btn" title="Editar"
                               data-dia="${params.data.dia_semana}"
                               data-entrada="${params.data.hora_entrada}"
                               data-saida="${params.data.hora_saida}"
                               style="cursor: pointer;"
                               onclick="window.abrirModal(${params.data.dia_semana}, '${params.data.hora_entrada}', '${params.data.hora_saida}')">
                               <Edit size={14} />
                           </button>`
                }
                if (podeExcluir) {
                    html += `<button class="admin-icon-btn danger" title="Excluir"
                               data-dia="${params.data.dia_semana}"
                               style="cursor: pointer;"
                               onclick="window.handleExcluirLocal(${params.data.dia_semana})">
                               <Trash2 size={14} />
                           </button>`
                }
                return html
            }
        }
    ]

    // Função para abrir o modal de criação/edição
    function abrirModal(horario = null) {
        if (horario) {
            setEditandoHorario(horario)
            setFormDia(horario.dia_semana)
            setFormEntrada(horario.hora_entrada ?? "")
            setFormSaida(horario.hora_saida ?? "")
        } else {
            setEditandoHorario(null)
            setFormDia(null)
            setFormEntrada("")
            setFormSaida("")
        }
        setIsModalOpen(true)
    }

    // Função para salvar (criar ou atualizar)
    async function handleSalvar(e) {
        e.preventDefault()

        // Validação: dia 0 (domingo) é válido
        if (
            formDia === null ||
            formDia === "" ||
            !formEntrada ||
            !formSaida
        ) {
            setError("Preencha todos os campos (dia, entrada e saída).")
            return
        }

        // Validação: saída deve ser posterior à entrada
        const entradaMinutos = parseInt(formEntrada.replace(":", ""))
        const saidaMinutos = parseInt(formSaida.replace(":", ""))
        if (saidaMinutos <= entradaMinutos) {
            setError("A hora de saída deve ser posterior à hora de entrada.")
            return
        }

        if (!formDia || !formEntrada || !formSaida) return

        try {
            setSalvando(true)
            if (editandoHorario) {
                // Atualizar existente - enviar valores atuais do formulário
                await substituirHorariosFuncionario(funcId, [
                    {
                        dia_semana: formDia,
                        hora_entrada: formEntrada,
                        hora_saida: formSaida,
                    }
                ])
            } else {
                // Criar novo
                await createHorarioFuncionario(funcId, {
                    dia_semana: formDia,
                    hora_entrada: formEntrada,
                    hora_saida: formSaida,
                })
            }
            setFormDia(null)
            setFormEntrada("")
            setFormSaida("")
            setEditandoHorario(null)
            setIsModalOpen(false)
            setSalvando(false)
            carregarHorarios()
        } catch (err) {
            setError(getApiError(err))
            setSalvando(false)
        }
    }

    // Função para excluir (sem modificar variáveis globais problemáticas)
    function handleExcluir(diaSemana) {
        if (!window.confirm("Confirmar exclusão deste horário?")) return
        // Filtrar para remover do estado React
        const novosHorarios = horarios.filter(h => h.dia_semana !== diaSemana)
        setHorarios(novosHorarios)
    }

    return (
        <>
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <section className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="admin-modal-header">
                            <div>
                                <h2>{editandoHorario ? "Editar Horário" : "Novo Horário"} </h2>
                                <p>Programação semanal do funcionário.</p>
                            </div>
                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </header>
                        <form onSubmit={handleSalvar}>
                            <div className="admin-modal-body">
                                <div className="admin-form-grid">
                                    <div className="admin-field">
                                        <label htmlFor="horario-dia">Dia da Semana (0-6)</label>
                                        <input
                                            id="horario-dia"
                                            type="number"
                                            value={formDia ?? ""}
                                            onChange={(e) => setFormDia(Number(e.target.value))}
                                            min="0"
                                            max="6"
                                            className="admin-field-input"
                                            required
                                        />
                                    </div>
                                    <div className="admin-field">
                                        <label htmlFor="horario-entrada">Hora Entrada</label>
                                        <input
                                            id="horario-entrada"
                                            type="time"
                                            value={formEntrada ?? ""}
                                            onChange={(e) => setFormEntrada(e.target.value)}
                                            className="admin-field-input"
                                            required
                                        />
                                    </div>
                                    <div className="admin-field">
                                        <label htmlFor="horario-saida">Hora Saída</label>
                                        <input
                                            id="horario-saida"
                                            type="time"
                                            value={formSaida ?? ""}
                                            onChange={(e) => setFormSaida(e.target.value)}
                                            className="admin-field-input"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <footer className="admin-modal-footer">
                                <button type="button" className="admin-btn secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="admin-btn primary" disabled={salvando}>
                                    <span>{editandoHorario ? "Atualizar" : "Registar"}</span>
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            <div className="admin-main">
                <SideBar isOpen={false} setIsOpen={() => {}} />
                <Headers
                    heady="admin-header"
                    title="Horários"
                    h1Class="admin-header-title"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => {}}
                />

                <main className="admin-content">
                    <header className="admin-page-header">
                        <div className="admin-page-header-inner">
                            <div>
                                <h1 className="admin-page-title">Horário Funcionário</h1>
                                <p className="admin-page-subtitle">Programação semanal</p>
                            </div>
                        </div>
                    </header>

                    {error && <div className="admin-alert error">{error}</div>}

                    <section className="stats-grid">
                        {carregandoListagem ? (
                            <p className="admin-empty">A carregar horários...</p>
                        ) : horarios.length === 0 ? (
                            <p className="admin-empty">
                                Nenhum horário registado para este funcionário.
                            </p>
                        ) : (
                            <DataGrid
                                rowData={horarios}
                                columnDefs={colunas}
                                loading={carregandoListagem}
                                onRowDoubleClicked={() => {}}
                            />
                        )}
                    </section>

                    <div className="admin-toolbar">
                        {podeEscrever && (
                            <button
                                className="admin-btn primary"
                                onClick={() => abrirModal()}
                            >
                                <UserPlus size={18} /> Novo Horário
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}

export default HorarioPage
