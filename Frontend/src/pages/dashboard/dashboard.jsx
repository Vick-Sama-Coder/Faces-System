import Sidebar from '../../components/sidebar/siderbar.jsx'
import Headers from '../../components/headers/header.jsx'
import './dashboard.css'

function DashBoard(){
    return(
        <main className='main-container'>
            <Sidebar/>
            <Headers/>
            <section className='content'></section>
        </main>
        

    )
}
export default DashBoard