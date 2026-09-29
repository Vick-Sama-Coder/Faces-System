import SideBar from "../../components/sidebar/siderbar"
import { useState } from "react"
//import  Layout  from "../../components/Layout/Layout.jsx";
import "./clientes.css"

function Clientes(){
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    return(
        <div className="clients-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
        </div>
    )
}
export default Clientes