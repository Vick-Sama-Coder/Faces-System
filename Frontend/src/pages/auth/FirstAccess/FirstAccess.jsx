import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import Input from "../../../components/forms/input/input.jsx"
import { useAuthStore } from "../../../store/authStore.js"
import { validarSenha, validarConfirmacao } from "../../../utils/validacoes.js"
import "../../home.css"

function FirstAccess(){
    const navigate = useNavigate()
    const {
        user,
        definirSenhaPrimeiroAcesso,
        loading,
        error,
        errorField,
        clearError
    } = useAuthStore()

    const [senhaNova, setSenhaNova] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})

    const precisaTrocarSenha = Boolean(user?.deve_alterar_senha || user?.alteracao_obrigatoria_senha)

    //se a conta ja tem uma senha definida, nao ha nada a fazer aqui
    if(!precisaTrocarSenha){
        return <Navigate to="/" replace/>
    }

    //erro local tem prioridade; o erro do backend realca o campo indicado
    function erroDe(campo){
        if(erros[campo]) return erros[campo]
        if(errorField === campo) return error
        return null
    }

    async function handleSubmit(e){
        e.preventDefault()
        clearError()

        const validados = {}
        const erroSenha = validarSenha(senhaNova)
        if(erroSenha) validados.senha_nova = erroSenha
        const erroConfirmacao = validarConfirmacao(senhaNova, confirmarSenha)
        if(erroConfirmacao) validados.confirmarSenha = erroConfirmacao

        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const ok = await definirSenhaPrimeiroAcesso({ senha_nova: senhaNova })
        if(ok){
            navigate("/", { replace: true })
        }
    }

    return(
        <section className="container">
            <h1 className="h1">Primeiro Acesso</h1>
            <p className="paragraph">
                Bem-vindo(a), {user.nome}. Defina uma nova senha para entrar no sistema.
            </p>

            <p className="success-msg" role="status">
                A sua conta ainda usa a senha padrão. Por segurança, defina uma nova senha.
            </p>

            {error && !errorField && <p className="error-msg" role="alert">{error}</p>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="input-section">
                    <Input type="password"
                        labelId="pass"
                        className='text-input'
                        labelName= "Nova Senha"
                        placeholder="8+ caracteres, 1 letra e 1 numero"
                        icon={<Lock></Lock>}
                        value={senhaNova}
                        onChange={(e) => { setSenhaNova(e.target.value); setErros((prev) => ({ ...prev, senha_nova: null })) }}
                        onBlur={() => setErros((prev) => ({ ...prev, senha_nova: validarSenha(senhaNova) }))}
                        error={erroDe("senha_nova")}
                        autoComplete="new-password"
                        maxLength={72}
                        required
                    />
                </div>
                <div className="input-section">
                    <Input type="password"
                        labelId="confirm-pass"
                        className='text-input'
                        labelName= "Confirmar Nova Senha"
                        placeholder="repita a nova senha"
                        icon={<Lock></Lock>}
                        value={confirmarSenha}
                        onChange={(e) => { setConfirmarSenha(e.target.value); setErros((prev) => ({ ...prev, confirmarSenha: null })) }}
                        onBlur={() => setErros((prev) => ({ ...prev, confirmarSenha: validarConfirmacao(senhaNova, confirmarSenha) }))}
                        error={erroDe("confirmarSenha")}
                        autoComplete="new-password"
                        maxLength={72}
                        required
                    />
                </div>
                <div>
                    <Input
                        type="submit"
                        value={loading ? "A guardar..." : "Guardar senha e entrar"}
                        className="submit-btn"
                        disabled={loading}
                    />
                </div>
            </form>
        </section>
    )
}

export default FirstAccess
