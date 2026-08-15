import Input from "../../../components/forms/input/input.jsx"
import { Link } from "react-router-dom"
//import { User, Lock, Phone } from "lucide-react"
import "../../home.css"

function Register(){
    return(
       <section className="container">
        
        <h1 className="h1">Crie a Sua Conta</h1>
        <p className="paragraph">Comece a gerir a sua conta agora</p>
        <form action="">
            <div className="input-section">
                <Input type="text"
                    labelId="user"
                    className='text-input'
                    labelName= "Nome Do Usuario :"
                    placeholder="Nome do Usuario"
                    //icon={<User></User>}
                >
                </Input>
            </div>
            <div className="input-section">
                <Input type="phone"
                    labelId="phone"
                    className='text-input'
                    labelName= "Numero de Celular:"
                    placeholder="84-123-4567"
                    //icon={<Phone></Phone>}
                >
                </Input>
            </div>
            <div className="input-section">
                <Input type="password"
                    labelId="pass"
                    className='text-input'
                    labelName= "Senha"
                    placeholder="Minimo 6 caracteres"
                    //icon={<Lock></Lock>}
                    >
                </Input>
            </div>
            <div>
                <Input type="password"
                    labelId="confirm-pass"
                    className='text-input'
                    labelName= "Confirmar Senha"
                    placeholder="confirme a sua senha"
                    //icon={<Lock></Lock>}
                    >
                </Input>
            </div>
            <div>
                <Input
                    type="submit"
                    value="Criar"
                    className="submit-btn"
                ></Input>
            </div>

        </form>
        <p className="footer-p">
            Ja tem conta? <Link to="/" className="link">Entrar</Link>
        </p>
       </section> 
    )
}
export default Register