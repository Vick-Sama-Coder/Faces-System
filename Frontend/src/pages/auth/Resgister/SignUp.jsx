import { useState } from "react"
import Input from "../../../components/forms/input/input.jsx"
import { Link, useNavigate } from "react-router-dom"
import { User, Lock, Phone } from "lucide-react"
import "../../home.css"
import { useAuthStore } from "../../../store/authStore.js"

function Register(){
    const navigate = useNavigate()
    const { register, loading, error, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [telefone, setTelefone] = useState("")
    const [senha, setSenha] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erroLocal, setErroLocal] = useState("")

    async function handleSubmit(e){
        e.preventDefault()
        clearError()
        setErroLocal("")

        if(!nome.trim() || !telefone.trim() || !senha){
            setErroLocal("Preencha todos os campos")
            return
        }
        if(senha.length < 6){
            setErroLocal("A senha deve ter no minimo 6 caracteres")
            return
        }
        if(senha !== confirmarSenha){
            setErroLocal("As senhas nao coincidem")
            return
        }

        const ok = await register({
            nome: nome.trim(),
            telefone: telefone.trim(),
            senha
        })

        if(ok){
            navigate("/dashboard", { replace: true })
        }
    }

    const mensagem = erroLocal || error

    return(
       <section className="container">
        
        <h1 className="h1">Crie a Sua Conta</h1>
        <p className="paragraph">Comece a gerir a sua conta agora</p>

        {mensagem && <p className="error-msg" role="alert">{mensagem}</p>}

        <form onSubmit={handleSubmit} noValidate>
            <div className="input-section">
                <Input type="text"
                    labelId="user"
                    className='text-input'
                    labelName= "Nome Do Usuario :"
                    placeholder="Nome do Usuario"
                    icon={<User></User>}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    required
                />
            </div>
            <div className="input-section">
                <Input type="tel"
                    labelId="phone"
                    className='text-input'
                    labelName= "Numero de Celular:"
                    placeholder="84-123-4567"
                    icon={<Phone></Phone>}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    autoComplete="tel"
                    required
                />
            </div>
            <div className="input-section">
                <Input type="password"
                    labelId="pass"
                    className='text-input'
                    labelName= "Senha"
                    placeholder="Minimo 6 caracteres"
                    icon={<Lock></Lock>}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="new-password"
                    required
                    />
            </div>
            <div className="input-section">
                <Input type="password"
                    labelId="confirm-pass"
                    className='text-input'
                    labelName= "Confirmar Senha"
                    placeholder="confirme a sua senha"
                    icon={<Lock></Lock>}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    autoComplete="new-password"
                    required
                    />
            </div>
            <div>
                <Input
                    type="submit"
                    value={loading ? "A criar conta..." : "Criar"}
                    className="submit-btn"
                    disabled={loading}
                />
            </div>

        </form>
        <p className="footer-p">
            Ja tem conta? <Link to="/" className="link">Entrar</Link>
        </p>
       </section> 
    )
}
export default Register