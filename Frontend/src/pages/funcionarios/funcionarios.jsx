import SideBar from "../../components/sidebar/siderbar.jsx";
//import Layout  from "../../components/Layout/Layout.jsx";
import Headers from "../../components/headers/header.jsx";
import Search from "../../components/forms/search/search.jsx"
import "./funcionarios.css"

import { useState } from "react"



function Funcionarios(){


    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    return(
        <div className="employee-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            
            <Headers
                heady="dash-header"
                title="Funcionarios"
                h1Class="dash-h1"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
                pClass="p-profile"
                onMenuClick={() => setIsSidebarOpen(true)}
                
            />
            <section className="dash-content">
                <article className="input-sect">
                    <Search/>
                    
                </article>
                <article className="employee-content">
                    
                </article>
            </section>

        </div>

    )
}
export default Funcionarios