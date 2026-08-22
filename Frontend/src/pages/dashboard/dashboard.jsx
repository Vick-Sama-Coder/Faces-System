import Layout from "../../components/Layout/Layout.jsx";
import { ArrowUp, ArrowDown } from "lucide-react";
import './dashboard.css'


function DashBoard(){
    return(
        <Layout>
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
                <article className="reciept-vs-expenses-card cards">
                    <h2>Receitas Vs Despesas</h2>
                    <p>este mes</p>
                </article>

                <article className="recieps-per-service-card cards">
                    <h2>Receitas Por Servicos</h2>
                    <p>este mes`</p>
                    
                </article>

                <article className="recent-transactions cards">
                    <h2>Transacoes recentes</h2>
                </article>

                <article className="reciept-evolution cards">
                    <h2>Evolucao de receitas <span>(ultimos 6 meses)</span></h2>
                </article>

                <article className="resume-per-reciept-category cards">
                    <h2>Resumo por categoria de despesa</h2>
                </article>

                <article className="featured-professionals cards">
                    <h2>Profissionais em Destaque</h2>
                    <p>este mes</p>
                </article>
            </main>
        </Layout>
    )
}
export default DashBoard;