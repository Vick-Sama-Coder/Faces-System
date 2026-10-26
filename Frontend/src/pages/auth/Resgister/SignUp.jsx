import { useState } from "react"
import Input from "../../../components/forms/input/input.jsx"
import { Link, useNavigate } from "react-router"
import { User, Phone } from "lucide-react"
import "../../home.css"
import { useAuthStore } from "../../../store/authStore.js"
import { validarRegisto } from "../../../utils/validacoes.js"

function Register(){
    const navigate = useNavigate()
    const { register, loading, error, errorField, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [telefone, setTelefone] = useState("")
    const [erros, setErros] = useState({})
    const [contaCriada, setContaCriada] = useState(null)

    //valida um campo no momento em que e editado
    function validarCampo(campo, valor){
        const validacoes = validarRegisto({ nome, telefone, [campo]: valor })
        setErros((prev) => ({ ...prev, [campo]: validacoes[campo] || null }))
    }

    //erro local de validacao tem prioridade sobre o erro do backend,
    //e o erro do backend realca o campo que ele indicar
    function erroDe(campo){
        if(erros[campo]) return erros[campo]
        if(errorField === campo) return error
        return null
    }

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        const validados = validarRegisto({ nome, telefone })
        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const resultado = await register({
            nome: nome.trim(),
            telefone: telefone.trim()
        })

        if(resultado.ok){
            setContaCriada(resultado.data || {})
        }
    }

    //segue para o login normal, levando o nome e a senha padrao preenchidos
    function irParaLogin(){
        const dados = contaCriada || {}
        const senhaPadrao = dados.senha_padrao || "12345"

        navigate("/login", {
            replace: true,
            state: {
                success: `Conta criada com sucesso! A sua senha padrão é ${senhaPadrao}. Inicie sessão e defina uma nova senha.`,
                nome: dados.user?.nome || nome.trim(),
                senha: senhaPadrao
            }
        })
    }

    if(contaCriada){
        return(
            <section className="container">
                <h1 className="h1">Conta Criada</h1>
                <p className="success-msg" role="status">
                    A sua senha padrão é <strong>{contaCriada.senha_padrao || "12345"}</strong>.
                </p>
                <p className="text">
                    Inicie sessão com esta senha. Por ser o primeiro acesso, será pedido
                    que defina uma nova senha antes de entrar no sistema.
                </p>
                <div className="input-section">
                    <button type="button" className="submit-btn" onClick={irParaLogin}>
                        Ir para o login
                    </button>
                </div>
            </section>
        )
    }

    return(
       <section className="container">

        <h1 className="h1">Crie a Sua Conta</h1>
        <p className="paragraph">Comece a gerir a sua conta agora</p>
        <p className="text">
            A conta será criada com a senha padrão <strong>12345</strong>.
            No primeiro login será pedido que defina uma nova senha.
        </p>

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
                    maxLength={10}
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
                    maxLength={9}
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
