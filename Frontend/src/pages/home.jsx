import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { validarLogin } from "../utils/validacoes.js"
import "./home.css"
import Logo from "../components/Logo/logo.jsx"
import Input from "../components/forms/input/input.jsx"
import { Phone, Lock } from "lucide-react"
import { useAuthStore } from "../store/authStore.js"

export default function Home(){
    const navigate = useNavigate()
    const location = useLocation()
    const { login, loading, error, errorField, clearError } = useAuthStore()

    const [telefone, setTelefone] = useState("")
    const [senha, setSenha] = useState("")
    const [erros, setErros] = useState({})
    //mensagem de sucesso vinda do registo (register -> /login)
    const [sucesso] = useState(location.state?.success || null)

    function validarCampo(campo, valor){
        const validados = validarLogin({
            telefone: campo === "telefone" ? valor : telefone,
            senha: campo === "senha" ? valor : senha
        })
        setErros((prev) => ({ ...prev, [campo]: validados[campo] || null }))
    }

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        const validados = validarLogin({ telefone: telefone.trim(), senha })
        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const ok = await login({ telefone: telefone.trim(), senha })
        if(ok){
            //dashboard e o index ("/") protegido
            navigate("/", { replace: true })
        }
    }

    //erro local de validacao tem prioridade; o erro do backend realca o campo
    function erroDe(campo){
        if(erros[campo]) return erros[campo]
        if(errorField === campo) return error
        return null
    }

    return(
        <>
        <section className="container">
            <Logo/>
            <h2>Bem Vindo(a) de volta {'\u{1F44B}'}</h2>
            <p className="text">Entre na sua conta para continuar</p>

            {sucesso && <p className="success-msg" role="status">{sucesso}</p>}
            {error && !errorField && <p className="error-msg" role="alert">{error}</p>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="input-section username">
                    <Input type="tel"
                           className="text-input"
                           labelId="phone"
                           labelName= "Numero de Celular :"
                           placeholder="84-123-4567"
                           icon={<Phone></Phone>}
                           value={telefone}
                           onChange={(e) => { setTelefone(e.target.value); validarCampo("telefone", e.target.value) }}
                           onBlur={() => validarCampo("telefone", telefone)}
                           error={erroDe("telefone")}
                           autoComplete="tel"
                           maxLength={20}
                           required
                    />
                </div>
            <div className="input-section">
                <Input 
                    type='password'
                    className='text-input'
                    labelName="Senha"
                    labelId="passId"
                    placeholder="A sua senha"
                    icon={<Lock></Lock>}
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); validarCampo("senha", e.target.value) }}
                    onBlur={() => validarCampo("senha", senha)}
                    error={erroDe("senha")}
                    autoComplete="current-password"
                    maxLength={72}
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