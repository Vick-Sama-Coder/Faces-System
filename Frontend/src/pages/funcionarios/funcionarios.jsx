import { useState } from "react"
import SideBar from "../../components/sidebar/siderbar.jsx";
import Headers from "../../components/headers/header.jsx";
import Button from "../../components/forms/button/button.jsx"
import Search from "../../components/forms/search/search.jsx"
import "./funcionarios.css"
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';
import { AgGridReact } from "ag-grid-react"

import { useState } from "react"

const modules = [AllCommunityModule];

function Funcionarios(){
<<<<<<< HEAD

     const [rowData]= useState([
        {
            cliente:"Abdul",
            servico:"fraces + Barba", 
            data:"12/09/2026"
        },

        {
            cliente:"Gertrudes",
            servico:"fraces + Barba", 
            data:"12/09/2026"
        },
        {
            cliente:"Ludovina",
            servico:"fraces + Barba", 
            data:"12/09/2026"
        },
        {
            cliente:"Marta",
            servico:"fraces + Barba", 
            data:"12/09/2026"
        },
        {
            Nome:"Saul",
            Funcao:"fraces + Barba", 
            Numero_de_Ce:"12/09/2026"
        }
    ])

    const [colummData] = useState([
        {
            field:'Nome',
            flex:1, 
            WrapText: true, autoHeight:true
        },
        {
            field:'Numero',
            HeaderName: "Numero de celular",
            flex:1, 
            WrapText: true
        },    
        {
            field:'Funcao',
            flex:1, 
            WrapText: true, autoHeight:true},
    ])


    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
=======
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

>>>>>>> 553e37bd1513383126f481336d845ac366f74d57
    return(
        <div className="employee-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
<<<<<<< HEAD
            
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
                    <Search placeholderInfo="Pesquise o atendimento"/>
                    <Button> <span className="plus">+</span> Novo Atendimento</Button>
                    
                </article>
                <article className="newmark-table">
                    <AgGridProvider modules={modules} >
                        <div className="ag-theme-quartz new-table">
                            <AgGridReact
                            rowData={rowData}
                            columnDefs={colummData}
                            defaultColDef={{
                                flex:1,
                                minWidth:100
                            }}
                            
                            />
                        </div>
                    </AgGridProvider>
                </article>
            </section>

=======
            <Headers
                title="Funcionarios"
                onMenuClick={() => setIsSidebarOpen(true)}
            />
>>>>>>> 553e37bd1513383126f481336d845ac366f74d57
        </div>

    )
}
export default Funcionarios