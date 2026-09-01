import SideBar from "../../components/sidebar/siderbar.jsx";
//import Layout  from "../../components/Layout/Layout.jsx";
import Headers from "../../components/headers/header.jsx";
import "./funcionarios.css"

function Funcionarios(){
    return(
        <div className="employee-main">
            <SideBar/>
            
            <Headers/>
        </div>

    )
}
export default Funcionarios