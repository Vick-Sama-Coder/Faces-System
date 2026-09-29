import { useState } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx";
import Headers from "../../components/headers/header.jsx";
import "./funcionarios.css"

function Funcionarios(){
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return(
        <div className="employee-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                title="Funcionarios"
                onMenuClick={() => setIsSidebarOpen(true)}
            />
        </div>

    )
}
export default Funcionarios