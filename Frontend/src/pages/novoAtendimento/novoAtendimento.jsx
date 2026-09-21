import SideBar from "../../components/sidebar/siderbar"
import Headers from "../../components/headers/header.jsx"
//import  Layout  from "../../components/Layout/Layout.jsx";
import "./novoAtendimento.css"

function NovoAtendimento(){
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
                
            </section>

        </div>
    )
}
export default NovoAtendimento