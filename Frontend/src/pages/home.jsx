import Input from "../components/forms/input/input.jsx"
//import { Lock, User } from "lucide-react"
import { Link } from "react-router-dom"
import "./home.css"
import Logo from "../components/Logo/logo.jsx"


export default function Home(){
    return(
        <>
        <section className="container">
            {/*<Layout/>*/}
                <Logo/>
                <h2>Bem Vindo(a) de volta {'\u{1F44B}'}</h2>
                <p className="text">Entre na sua conta para continuar</p>
            <form action="">
                <div className="input-section">
                    <Input type="text"
                           className="text-input"
                           labelId="user"
                           labelName= "Nome Do Usuario :"
                           placeholder="Nome do Usuario"
                           //icon={<User></User>}
                    >
                    </Input>
                </div>
            <div className="input-section">
                <Input 
                    type="password"
                    className='text-input'
                    labelName="Password"
                    labelId="passId"
                    placeholder="Minimo 6 caracteres"
                    //icon={<Lock></Lock>}
                ></Input>
            </div>
            <p className="p-pass"><Link to="/forgotpass" className="pass link">Esqueceu a senha?</Link></p>
            <div>
                <Input
                    type='submit'
                    value="Entrar"
                    className="submit-btn"
                ></Input>
            </div>
            </form>
            <p className="footer-p">Nao tem uma conta? <Link to='/register' className="link">Criar Conta</Link></p>
        </section>
        <div></div>
        </>
        
    )
}