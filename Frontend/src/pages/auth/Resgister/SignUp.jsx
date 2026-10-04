import { useState } from "react"
import Input from "../../../components/forms/input/input.jsx"
import { Link, useNavigate } from "react-dom"
import { User, Lock, Phone } from "lucide-react"
import "../../home.css"
import { useAuthStore } from "../../../store/authStore.js"
import { validarRegisto } from "../../../utils/validacoes.js"

function Register(){
    const navigate = useNavigate()
    const { register, loading, error, errorField, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [telefone, setTelefone] = useState("")
    const [senha, setSenha] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})

    //valida um campo no momento em que e editado
    function validarCampo(campo, valor){
        const validacoes = validarRegisto({ nome, telefone, senha, confirmarSenha, [campo]: valor })
        setErros((prev) => ({ ...prev, [campo]: validacoes[campo] || null }))
    }

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        const validados = validarRegisto({ nome, telefone, senha, confirmarSenha })
        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const ok = await register({
            nome: nome.trim(),
            telefone: telefone.trim(),
            senha
        })

        if(ok){
            //registo nao autentica: direciona para o login com aviso
            navigate("/login", {
                replace: true,
                state: { success: "Conta criada com sucesso! Faca login para entrar." }
            })
        }
    }

    //erro local de validacao tem prioridade sobre o erro do backend,
    //e o erro do backend realca o campo que ele indicar
    function erroDe(campo){
        if(erros[campo]) return erros[campo]
        if(errorField === campo) return error
        return null
    }

    return(
       <section className="container">
        
        <h1 className="h1">Crie a Sua Conta</h1>
        <p className="paragraph">Comece a gerir a sua conta agora</p>

        {error && !errorField && <p className="error-msg" role="alert">{error}</p>}

        <form onSubmit={handleSubmit} noValidate>
            <div className="input-section">
                <Input type="text"
                    labelId="user"
                    className='text-input'
                    labelName= "Nome Do Usuario :"
                    placeholder="Nome do Usuario"
                    icon={<User></User>}
                    value={nome}
                    onChange={(e) => { setNome(e.target.value); validarCampo("nome", e.target.value) }}
                    onBlur={() => validarCampo("nome", nome)}
                    error={erroDe("nome")}
                    autoComplete="name"
                    maxLength={100}
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
                    onChange={(e) => { setTelefone(e.target.value); validarCampo("telefone", e.target.value) }}
                    onBlur={() => validarCampo("telefone", telefone)}
                    error={erroDe("telefone")}
                    autoComplete="tel"
                    maxLength={20}
                    required
                />
            </div>
            <div className="input-section">
                <Input type="password"
                    labelId="pass"
                    className='text-input'
                    labelName= "Senha"
                    placeholder="8+ caracteres, 1 letra e 1 numero"
                    icon={<Lock></Lock>}
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); validarCampo("senha", e.target.value) }}
                    onBlur={() => validarCampo("senha", senha)}
                    error={erroDe("senha")}
                    autoComplete="new-password"
                    maxLength={72}
                    required
                    />
            </div>
            <div className="input-section">
                <Input type="password"
                    labelId="confirm-pass"
                    className='text-input'
                    labelName= "Confirmar Senha"
                    placeholder="repita a sua senha"
                    icon={<Lock></Lock>}
                    value={confirmarSenha}
                    onChange={(e) => { setConfirmarSenha(e.target.value); validarCampo("confirmarSenha", e.target.value) }}
                    onBlur={() => validarCampo("confirmarSenha", confirmarSenha)}
                    error={erroDe("confirmarSenha")}
                    autoComplete="new-password"
                    maxLength={72}
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
            Ja tem conta? <Link to="/login" className="link">Entrar</Link>
        </p>
       </section> 
    )
}
export default Register