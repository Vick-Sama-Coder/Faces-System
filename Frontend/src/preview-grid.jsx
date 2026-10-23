import { createRoot } from "react-dom/client"
import DataGrid from "./components/DataGrid/DataGrid.jsx"
import "./Styles/variables.css"
import "./Styles/global.css"
import "./Styles/management.css"

const rows = [
    { id: 1, nome: "Maria", apelido: "Costa", telefone: "912 345 678", estado: "Ativo" },
    { id: 2, nome: "João", apelido: "Silva", telefone: "923 456 789", estado: "Ativo" },
    { id: 3, nome: "Ana", apelido: "Ferreira", telefone: "934 567 890", estado: "Inativo" },
    { id: 4, nome: "Rui", apelido: "Santos", telefone: "945 678 901", estado: "Ativo" }
]

function iniciais(nome = "", apelido = "") {
    return `${nome.charAt(0)}${apelido.charAt(0)}`.toUpperCase()
}

function ClienteCell({ data }) {
    return (
        <div className="mgmt-user-cell">
            <span className="mgmt-avatar customer">{iniciais(data.nome, data.apelido)}</span>
            <span className="mgmt-user-copy">
                <strong>{data.nome} {data.apelido}</strong>
                <small>Cliente #{data.id}</small>
            </span>
        </div>
    )
}

const columnDefs = [
    { field: "nome", headerName: "Cliente", cellRenderer: ClienteCell, flex: 2, minWidth: 240 },
    { field: "telefone", headerName: "Telefone", minWidth: 170 },
    { field: "estado", headerName: "Estado", minWidth: 130 }
]

createRoot(document.getElementById("root")).render(
    <main style={{ height: "100vh", padding: 24, background: "#f5f3f8" }}>
        <DataGrid rowData={rows} columnDefs={columnDefs} pageSize={10} />
    </main>
)
