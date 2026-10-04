import { useState } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import "../../pages/funcionarios/funcionarios.css"

//matriz perfil x permissao (stateless): quem decide e o backend via RequireRole
const PERMISSOES = [
    { recurso: "Dashboard", administrador: true, usuario: true },
    { recurso: "Novo Atendimento", administrador: true, usuario: true },
    { recurso: "Clientes", administrador: true, usuario: true },
    { recurso: "Servicos", administrador: true, usuario: true },
    { recurso: "Relatorio", administrador: true, usuario: true },
    { recurso: "Despesas", administrador: true, usuario: true },
    { recurso: "Funcionarios", administrador: true, usuario: false },
    { recurso: "Gestao de Utilizadores", administrador: true, usuario: false },
    { recurso: "Permissoes", administrador: true, usuario: false },
]

function SimNao({ ok }){
    return <span className={ok ? "perm-sim" : "perm-nao"}>{ok ? "Sim" : "Nao"}</span>
}

function Permissoes(){
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return(
        <div className="employee-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                title="Permissoes"
                onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="employee-content">
                <p className="text">Quem pode aceder a cada seccao (aplicado nas rotas e na sidebar):</p>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Recurso</th>
                            <th>Administrador</th>
                            <th>Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSOES.map((p) => (
                            <tr key={p.recurso}>
                                <td>{p.recurso}</td>
                                <td><SimNao ok={p.administrador}/></td>
                                <td><SimNao ok={p.usuario}/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    )
}
export default Permissoes
