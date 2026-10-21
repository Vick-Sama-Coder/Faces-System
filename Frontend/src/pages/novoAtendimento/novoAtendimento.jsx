import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
import NewMarkModal from "../../components/Modals/NewMark/New-Mark-Modal.jsx"
import "./novoAtendimento.css"
import Search from "../../components/forms/search/search.jsx"
import Button from "../../components/forms/button/button.jsx"
import { useState } from "react"
import { CalendarPlus, ScissorsIcon, Receipt } from "lucide-react"

function NovoAtendimento() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            {isModalOpen && (
                <NewMarkModal
                    onclose={() => setIsModalOpen(false)}
                />
            )}
            <div className="newbookmark-main">
                <SideBar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <Headers
                    heady="newmark-header"
                    title="Novo Atendimento"
                    h1Class="newmark-h1"
                    menuClass="menu"
                    userClass="user"
                    bellClass="bell"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <section className="newbookmark-content">
                    {/* Page Header */}
                    <header className="page-header">
                        <div className="page-header-inner">
                            <div className="page-header-info">
                                <h1 className="page-title">Novo Atendimento</h1>
                                <p className="page-subtitle">Agende e gerencie os atendimentos do seu salão</p>
                            </div>
                            <div className="page-header-actions">
                                <Button className="btn-class" btnClick={() => setIsModalOpen(true)}>
                                    <span className="btn-icon"><CalendarPlus /></span> Agendar Atendimento
                                </Button>
                            </div>
                        </div>
                    </header>

                    {/* Stats Overview */}
                    <section className="stats-grid">
                        <div className="stat-card stat-agendados">
                            <div className="stat-icon">
                                <CalendarPlus />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Agendados</span>
                                <span className="stat-value">0</span>
                            </div>
                        </div>
                        <div className="stat-card stat-concluidos">
                            <div className="stat-icon">
                                <ScissorsIcon />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Concluídos</span>
                                <span className="stat-value">0</span>
                            </div>
                        </div>
                        <div className="stat-card stat-pagos">
                            <div className="stat-icon">
                                <Receipt />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Pagos</span>
                                <span className="stat-value">0,00 MZN</span>
                            </div>
                        </div>
                    </section>

                    {/* Filters */}
                    <section className="filters-section">
                        <div className="filter-group">
                            <button className="filter-btn active" type="button">Todos</button>
                            <button className="filter-btn" type="button">Concluídos</button>
                            <button className="filter-btn" type="button">Pagos</button>
                            <button className="filter-btn" type="button">Pendentes</button>
                        </div>
                    </section>

                    {/* Appointments List */}
                    <section className="appointments-section">
                        <div className="search-wrapper">
                            <Search placeholderInfo="Pesquisar atendimentos..." />
                        </div>
                        <div className="appointments-list">
                            <p className="empty-state">Nenhum atendimento agendado.</p>
                        </div>
                    </section>
                </section>
            </div>
        </>
    )
}

export default NovoAtendimento
