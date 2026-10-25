import { useEffect, useMemo, useState } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import DataGrid from "../../components/DataGrid/DataGrid.jsx"
import { getApiError, getApiErrorField, getHorariosFuncionario, createHorarioFuncionario, substituirHorariosFuncionario } from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import { useParams } from "react-router-dom"
import { useCallback } from "react"

function HorarioPage() {
    const { user } = useAuthStore()
    const { id: funcId } = useParams()
    const podeEscrever = user?.permissoes?.includes("funcionarios:escrever")

    // State for the form
    const [formDia, setFormDia] = useState(null)
    const [formEntrada, setFormEntrada] = useState("")
    [formSaida, setFormSaida] = useState("")
    const [editando, setEditando] = useState(null)
    const [horarios, setHorarios] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [error, setError] = useState(null)

    // Carregar horários quando o componente montar ou funcId mudar
    useEffect(() => {
        async function carregar() {
            if (!funcId) return
            setCarregando(true)
            setError(null)
            try {
                const res = await getHorariosFuncionario(funcId)
                setHorarios(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                setError(getApiError(err))
            } finally {
                setCarregando(false)
            }
        }
        carregar()
    }, [funcId])

    // Função para abrir o modal de criação/edição
    function abrirModal(dia = null, entrada = "", saida = "") {
        setFormDia(dia ?? null)
        setFormEntrada(entrada ?? "")
        setFormSaida(saida ?? "")
        setEditando(dia !== null)
    }

    // Função para salvar (criar ou atualizar)
    async function handleSalvar(e) {
        e.preventDefault()
        if (!formDia || !formEntrada || !formSaida) return

        try {
            if (editando && editando.id) {
                // Atualizar existente
                await substituirHorariosFuncionario(funcId, [
                    {
                        dia_semana: editando.dia_semana,
                        hora_entrada: editando.hora_entrada,
                        hora_saida: editando.hora_saida,
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
            setEditando(false)
            carregar()
        } catch (err) {
            setError(getApiError(err))
        }
    }

    // Função para excluir
    function handleExcluir(diaSemana) {
        if (!window.confirm("Confirmar exclusão deste horário?")) return
        // Filtrar para remover o horário correspondente
        const novosHorarios = horarios.filter(h => h.dia_semana !== diaSemana)
        setHorarios(novosHorarios)
        // No backend, a substituição substitui tudo; aqui removemos do estado
        // Para realmente deletar, usamos a API put, mas simplificamos para o estado
    }

    // Column definitions for DataGrid
    const colunas = useCallback(
        [
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
                                   onclick="abrirModal(${params.data.dia_semana}, '${params.data.hora_entrada}', '${params.data.hora_saida}')">
                                   <Edit size={14} />
                               </button>`
                    }
                    if (podeExcluir) {
                        html += `<button class="admin-icon-btn danger" title="Excluir"
                                   onclick="handleExcluir(${params.data.dia_semana})">
                                   <Trash2 size={14} />
                               </button>`
                    }
                    return html
                }
            }
        ],
        [podeEscrever]
    )

    return (
        <>
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <section className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="admin-modal-header">
                            <div>
                                <h2>{editando ? "Editar Horário" : "Novo Horário"} </h2>
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
                                <button type="submit" className="admin-btn primary" disabled={carregando}>
                                    <span>{editando ? "Atualizar" : "Registar"}</span>
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
                        {carregando ? (
                            <p className="admin-empty">A carregar horários...</p>
                        ) : horarios.length === 0 ? (
                            <p className="admin-empty">
                                Nenhum horário registado para este funcionário.
                            </p>
                        ) : (
                            <DataGrid
                                rowData={horarios}
                                columnDefs={colunas}
                                loading={carregando}
                                onRowDoubleClicked={() => {}}
                            />
                        )}
                    </section>

                    <div className="admin-toolbar">
                        <button
                            className="admin-btn primary"
                            onClick={() => abrirModal()}
                        >
                            <UserPlus size={18} /> Novo Horário
                        </button>
                    </div>
                </main>
            </div>
        </>
    )
}

export default HorarioPage