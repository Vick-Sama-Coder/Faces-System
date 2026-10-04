import { useEffect, useState } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import { getUsers, getApiError } from "../../services/api.js"
import "../../pages/funcionarios/funcionarios.css"

//gestao de utilizadores: lista real vinda de GET /api/auth/users (so Administrador)
function GestaoUtilizadores(){
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [utilizadores, setUtilizadores] = useState([])
    const [erro, setErro] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function carregar(){
            try{
                const res = await getUsers()
                setUtilizadores(res.data.users || [])
            }catch(err){
                setErro(getApiError(err))
            }finally{
                setLoading(false)
            }
        }
        carregar()
    }, [])

    return(
        <div className="employee-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                title="Gestao de Utilizadores"
                onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="employee-content">
                {loading && <p>A carregar utilizadores...</p>}
                {erro && <p className="error-msg" role="alert">{erro}</p>}
                {!loading && !erro && (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Perfil</th>
                            </tr>
                        </thead>
                        <tbody>
                            {utilizadores.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td>{u.nome}</td>
                                    <td>{u.telefone}</td>
                                    <td>{u.id_perfil === 1 ? "Administrador" : "Usuario"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    )
}
export default GestaoUtilizadores
