import '../../home.css'
import Input from '../../../components/forms/input/input.jsx'
import { Link } from 'react-router-dom'
function ForgotPass(){
    return(
        <>
        <section className="container">
        <h1 className='h1'>Esqueceu a Senha?</h1>
            <p className='text'> Sem Problemas! Informe o seu nome de celular e enviaremos um codigo para redefinir a sua Senha.</p>
            <form action="">
                <div className='input-section'>
                    <Input
                        type='phone'
                        labelId='phone'
                        labelName='Numero de Celular'
                        placeholder="Insira o seu numero"
                        className='text-input'
                    />
                    </div>
                <div className='input-section'>
                    <Input
                        type="submit"
                        value='Enviar codigo de Redefinicao'
                        className="submit-btn"
                    />    
                </div>    
            </form>
            <p className='footer-p'>Lembrou-se da sua Senha? <Link to="/" className='link'>Entrar</Link></p>
        </section>

<dialog></dialog>
        </>
    )
}
export default ForgotPass