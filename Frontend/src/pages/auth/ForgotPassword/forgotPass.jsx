import '../../home.css'
import { useState } from 'react'
import Input from '../../../components/forms/input/input.jsx'
import { Link } from 'react-router-dom'
function ForgotPass(){
    const [telefone, setTelefone] = useState("")
    const [mensagem, setMensagem] = useState("")

    function handleSubmit(e){
        e.preventDefault()
        if(!telefone.trim()){
            setMensagem("Informe o seu numero de celular")
            return
        }
        //fluxo de redefinicao ainda nao tem backend (envio de SMS)
        setMensagem("Se o numero estiver registado, enviaremos um codigo de redefinicao.")
    }

    return(
        <>
        <section className="container">
        <h1 className='h1'>Esqueceu a Senha?</h1>
            <p className='text'> Sem Problemas! Informe o seu numero de celular e enviaremos um codigo para redefinir a sua Senha.</p>

            {mensagem && <p className="success-msg" role="status">{mensagem}</p>}

            <form onSubmit={handleSubmit} noValidate>
                <div className='input-section'>
                    <Input
                        type='tel'
                        labelId='phone'
                        labelName='Numero de Celular'
                        placeholder="84-123-4567"
                        className='text-input'
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        autoComplete="tel"
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
        </>
    )
}
export default ForgotPass