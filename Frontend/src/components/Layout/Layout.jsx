import Sidebar from '../../components/sidebar/siderbar.jsx'
//import Headers from '../../components/headers/header.jsx'
import './Layout.css'


function Layout({children}){
    return(
        <main className='main-container'>
            <Sidebar/>
            <section className='content'>
               {children}
            </section>
        </main>
        

    )
}
export default Layout