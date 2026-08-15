import { MenuIcon, UserCircle } from "lucide-react"
import './header.css'

function Headers(){
    return(
        <>
            <header className="heady">
                <MenuIcon className="menu" />
                <input className="search" type="search" name="searchy" id="search" />
                <UserCircle className="menu"/>
            </header>
            <hr />
        </>
    )
}
export default Headers