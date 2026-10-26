import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { validarLogin } from "../utils/validacoes.js"
import "./home.css"
import Logo from "../components/Logo/logo.jsx"
import Input from "../components/forms/input/input.jsx"
import { User, Lock } from "lucide-react"
import { useAuthStore } from "../store/authStore.js"

export default function Home(){
    const navigate = useNavigate()
    const location = useLocation()
    const { login, loading, error, errorField, clearError } = useAuthStore()

    //o registo envia o nome e a senha padrao para preencher o login
    const [nome, setNome] = useState(location.state?.nome || "")
    const [senha, setSenha] = useState(location.state?.senha || "")
    const [erros, setErros] = useState({})
    //mensagem de sucesso vinda do registo (register -> /login)
    const [sucesso] = useState(location.state?.success || null)

    function validarCampo(campo, valor){
        const validados = validarLogin({
            nome: campo === "nome" ? valor : nome,
            senha: campo === "senha" ? valor : senha
        })
        setErros((prev) => ({ ...prev, [campo]: validados[campo] || null }))
    }

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        const validados = validarLogin({ nome: nome.trim(), senha })
        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const ok = await login({ nome: nome.trim(), senha })
        if(ok){
            const utilizador = useAuthStore.getState().user
            //primeiro acesso: passa pela definicao da nova senha antes do dashboard
            await navigate(utilizador?.deve_alterar_senha ? "/primeiro-acesso" : "/", { replace: true })
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
                    <Input type="text"
                           className="text-input"
                           labelId="user"
                           labelName= "Nome do Utilizador :"
                           placeholder="O seu nome de utilizador"
                           icon={<User></User>}
                           value={nome}
                           onChange={(e) => { setNome(e.target.value); validarCampo("nome", e.target.value) }}
                           onBlur={() => validarCampo("nome", nome)}
                           error={erroDe("nome")}
                           autoComplete="username"
                           maxLength={100}
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