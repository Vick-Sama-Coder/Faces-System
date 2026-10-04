import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import { useState } from "react"
//import  Layout  from "../../components/Layout/Layout.jsx";
import "./servicos.css"

function Servicos(){

    const[isSidebarOpen, setIsSidebarOpen] = useState(false)

    return(
        <div className="services-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                heady="dash-header"
                title="Dashboard"
                h1Class="dash-h1"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
                pClass="p-profile"
                onMenuClick={() => setIsSidebarOpen(true)}
            />
        </div>
        
            
    )
}
export default Servicos