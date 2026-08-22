import { MenuIcon, UserCircle } from "lucide-react"
import './header.css'

function Headers(type, name, id){
    return(
        <>
            <header className="heady">
                <MenuIcon className="menu" />
                <h1 className={id}>{name}</h1>
                <UserCircle className="menu"/>
            </header>
            <hr />
        </>
    )
}
export default Headers