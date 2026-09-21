//import Layout from "../../components/Layout/Layout.jsx";
import Sidebar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx";
import { ArrowUp, ArrowDown } from "lucide-react";
import './dashboard.css'


function DashBoard(){
    return(
        <article className="dashboard-main">
            <Headers
                heady="dash-header"
                title="Dashboard"
                h1Class="dash-h1"
                menuClass="menu"
                userClass="user"
                bellClass="bell"

            />
        <Sidebar/>

            <main className="dash-content">
                <article className="reciept-card cards">
                    <h3>Receita Total</h3>
                    <h1>49.450 MT</h1>
                    <p><span><ArrowUp/>18.0%</span> vs mes passado</p>
                </article>

                <article className="expenses-card cards">
                    <h3>Despesas Totais</h3>
                    <h1>29.310 MT</h1>
                    <p><span><ArrowDown/>8.4%</span> vs mes passado</p>
                </article>

                <article className="income-card cards">
                    <h3>Lucro Liquido</h3>
                    <h1>33.250 MT</h1>
                    <p><span><ArrowUp/>24.1%</span> vs mes passado</p>
                </article>

                <article className="services-card cards">
                    <h3>Servicos Realizados</h3>
                    <h1>312</h1>
                    <p><span><ArrowUp/>22.3%</span> vs mes passado</p>
                </article>
                <article className="billing cards">
                    <h2>Faturamento</h2>
                    <p></p>
                </article>

                <article className="most-services cards">
                    <h2>Servicos mais Realizados</h2>
                </article>


                <article className="featured-professionals cards">
                    <h2>Profissionais em Destaque</h2>
                    <p>este mes</p>
                </article>
                <article className="billing-per-service cards">
                    <h2>Faturamento por servico</h2>
                    <p>este mes</p>
                </article>
                <article className="expenses cards">
                    <h2>Despesas</h2>
                    <p>este mes</p>
                </article>
                <article className="profile cards">
                    <h2>Perfil</h2>
                    <p>este mes</p>
                </article>
                    <article className="recent-treatment cards">
                    <h2>Atendimentos Recentes</h2>
                    <p>este mes</p>
                </article>
            </main>
        </article>
        
    )
}
export default DashBoard;