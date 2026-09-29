import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"
import "./home.css"
import Logo from "../components/Logo/logo.jsx"
import Input from "../components/forms/input/input.jsx"
import { Phone, Lock } from "lucide-react"
import { useAuthStore } from "../store/authStore.js"

export default function Home(){
    const navigate = useNavigate()
    const { login, loading, error, clearError } = useAuthStore()

    const [telefone, setTelefone] = useState("")
    const [senha, setSenha] = useState("")

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        if(!telefone.trim() || !senha){
            return
        }

        const ok = await login({ telefone: telefone.trim(), senha })
        if(ok){
            navigate("/dashboard", { replace: true })
        }
    }

    return(
        <>
        <section className="container">
            <Logo/>
            <h2>Bem Vindo(a) de volta {'\u{1F44B}'}</h2>
            <p className="text">Entre na sua conta para continuar</p>

            {error && <p className="error-msg" role="alert">{error}</p>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="input-section username">
                    <Input type="tel"
                           className="text-input"
                           labelId="phone"
                           labelName= "Numero de Celular :"
                           placeholder="84-123-4567"
                           icon={<Phone></Phone>}
                           value={telefone}
                           onChange={(e) => setTelefone(e.target.value)}
                           autoComplete="tel"
                           required
                    />
                </div>
            <div className="input-section">
                <Input 
                    type='password'
                    className='text-input'
                    labelName="Senha"
                    labelId="passId"
                    placeholder="Minimo 6 caracteres"
                    icon={<Lock></Lock>}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                ></Input>
            </div>
            <p className="p-pass"><Link to="/forgotpass" className="pass link">Esqueceu a senha?</Link></p>
            <div>
                <Input
                    type='submit'
                    value={loading ? "A entrar..." : "Entrar"}
                    className="submit-btn"
                    disabled={loading}
                ></Input>
            </div>
            </form>
            <p className="footer-p">Nao tem uma conta? <Link to='/register' className="link">Criar Conta</Link></p>
        </section>
        <div></div>
        </>
        
    )
}