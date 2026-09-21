import { MenuIcon, UserCircle, Bell } from "lucide-react"
import './header.css'

function Headers({heady, title, h1Class, menuClass, userClass, bellClass, pClass}){
    return(

            <header className={heady}>
                
                <aside className={h1Class}>
                    <MenuIcon className={menuClass}/>
                    <h1>{title}</h1>
                </aside>
                <aside className={userClass}>
                    <Bell className={bellClass}/>
                    <p className={pClass}><span>Ola, Admin</span><UserCircle/></p>
                </aside>
            </header>
        
    )
}
export default Headers