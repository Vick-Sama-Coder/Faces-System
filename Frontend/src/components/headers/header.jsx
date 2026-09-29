import { MenuIcon, UserCircle, Bell, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../../store/authStore.js"
import './header.css'

function Headers({heady, title, h1Class, menuClass, userClass, bellClass, pClass,onMenuClick}){
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    async function handleLogout(){
        await logout()
        navigate("/", { replace: true })
    }

    return(

            <header className={heady}>
                
                <aside className={h1Class}>
                    <MenuIcon className={menuClass}
                    onClick={onMenuClick}
                    />
                    <h1>{title}</h1>
                </aside>
                <aside className={userClass}>
                    <Bell className={bellClass}/>
                    <p className={pClass}>
                        <span>Ola, {user ? user.nome : "Visitante"}{user ? ` (${user.perfil})` : ""}</span>
                        <UserCircle/>
                        <LogOut className="logout-icon" onClick={handleLogout}/>
                    </p>
                </aside>
            </header>
        
    )
}
export default Headers