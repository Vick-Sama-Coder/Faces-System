import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "../Sidebar/Sidebar.jsx"
import Headers from "../headers/header.jsx"
import BottomNav from "../BottomNav/BottomNav.jsx"
import "./appLayout.css"

const PAGE_TITLES = {
    "/dashboard": "Dashboard",
    "/perfil": "O Meu Perfil",
    "/clientes": "Clientes",
    "/novoAtendimento": "Atendimentos",
    "/servicos": "Serviços",
    "/categorias": "Categorias",
    "/relatorio": "Relatórios",
    "/caixa": "Caixa",
    "/despesas": "Despesas",
    "/funcionarios": "Funcionários",
    "/gestao-utilizadores": "Gestão de Utilizadores",
    "/permissoes": "Permissões",
    "/logs": "Logs",
    "/horarios": "Horários"
}

export default function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { pathname } = useLocation()
    const normalizedPath = pathname.replace(/\/+$/, "") || "/"
    const title = PAGE_TITLES[normalizedPath] || "Faces System"

    return (
        <div className="app-shell">
            <a className="app-skip-link" href="#conteudo-principal">
                Saltar para o conteúdo
            </a>

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="app-shell-main">
                <Headers title={title} />

                <main className="app-content" id="conteudo-principal" tabIndex={-1}>
                    <Outlet />
                </main>
            </div>

            <BottomNav
                onMore={() => setIsSidebarOpen(true)}
                menuOpen={isSidebarOpen}
            />
        </div>
    )
}
