import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
import Button from "../../components/forms/button/button.jsx"//import  Layout  from "../../components/Layout/Layout.jsx";
import "./novoAtendimento.css"
import Search from "../../components/forms/search/search.jsx"


import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';
import { AgGridReact } from "ag-grid-react"

import { useState } from "react"

const modules = [AllCommunityModule];


function NovoAtendimento(){

    const [rowData]= useState([
        {
            cliente:"Joao",
            servico:"fraces + Barba", valor:250,
            data:"12/09/2026"
        },

        {
            cliente:"claudio",
            servico:"fraces + Barba", valor:250,
            data:"12/09/2026"
        },
        {
            cliente:"Joao",
            servico:"fraces + Barba", valor:250,
            data:"12/09/2026"
        },
        {
            cliente:"Joao",
            servico:"fraces + Barba", valor:250,
            data:"12/09/2026"
        },
        {
            cliente:"Joao",
            servico:"fraces + Barba", valor:250,
            data:"12/09/2026"
        },
        {
            cliente:"Joao", 
            servico:"fraces + Barba", valor:250, 
            data:"12/09/2026"},
        {
            cliente:"Joao", 
            servico:"fraces + Barba", valor:250, 
            data:"12/09/2026"
        },
        {
            cliente:"Joao", 
            servico:"fraces + Barba", valor:250, 
            data:"12/09/2026"
        },
        {
            cliente:"Joao", 
            servico:"fraces + Barba", valor:250, 
            data:"12/09/2026"
        },
        {
            cliente:"Joao", 
            servico:"fraces + Barba", valor:250, 
            data:"12/09/2026"
        },
    ])

    const [colummData] = useState([
        {
            field:'cliente',
            flex:1.5, 
            WrapText: true, autoHeight:true
        },
        {
            field:'servico',
            flex:2, 
            WrapText: true
        },    
        {
            field:'Profissional',
            flex:1, 
            WrapText: true, autoHeight:true},
        {
            field:'valor',
            flex:0.25, 
            WrapText: true, autoHeight:true},
        {
            field:'data',
            flex:2, 
            WrapText: true, autoHeight:true},
    ])

    return(
        <div className="newbookmark-main">
            <SideBar/>
            <Headers
                heady="newmark-header"
                title="Novo Atendimento"
                h1Class="newmark-h1"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
            />
            <section className="newbookmark-content">
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
                            paginationPageSize={10}
                            pagination={10}
                            paginationPageSizeSelector={[10,20,30,40,50, 60, 70, 80, 90, 100]}
                            />
                        </div>
                    </AgGridProvider>
                </article>
            </section>

        </div>
    )
}
export default NovoAtendimento