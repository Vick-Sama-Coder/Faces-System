import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { User } from "lucide-react"
import AuthLayout from "../AuthLayout.jsx"
import AuthAlert from "../components/AuthAlert.jsx"
import AuthButton from "../components/AuthButton.jsx"
import AuthField from "../components/AuthField.jsx"
import PasswordField from "../components/PasswordField.jsx"
import { validarLogin } from "../../../utils/validacoes.js"
import { useAuthStore } from "../../../store/authStore.js"

function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, loading, error, errorField, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [senha, setSenha] = useState("")
    const [erros, setErros] = useState({})
    // mensagem de sucesso vinda do registo (register -> /login)
    const [sucesso] = useState(location.state?.success || null)

    function validarCampo(campo, valor) {
        const validados = validarLogin({
            nome: campo === "nome" ? valor : nome,
            senha: campo === "senha" ? valor : senha
        })
        setErros((prev) => ({ ...prev, [campo]: validados[campo] || null }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        clearError()

        const validados = validarLogin({ nome: nome.trim(), senha })
        setErros(validados)
        if (Object.values(validados).some(Boolean)) {
            return
        }

        const ok = await login({ nome: nome.trim(), senha })
        if (ok) {
            // dashboard e o index ("/") protegido
            await navigate("/", { replace: true })
        }
    }

    // erro local de validacao tem prioridade; o erro do backend realca o campo
    function erroDe(campo) {
        if (erros[campo]) return erros[campo]
        if (errorField === campo) return error
        return null
    }

    const temAlerta = Boolean(sucesso || (error && !errorField))

    return (
        <AuthLayout
            eyebrow="Bem-vindo de volta"
            title="Entrar na sua conta"
            subtitle="Aceda ao painel para gerir o seu salão."
            footer={(
                <p>
                    Não tem uma conta?
                    <Link to="/register" className="auth-link">Criar conta</Link>
                </p>
            )}
        >
            {temAlerta && (
                <div className="auth-alerts">
                    {sucesso && <AuthAlert type="success">{sucesso}</AuthAlert>}
                    {error && !errorField && <AuthAlert type="error">{error}</AuthAlert>}
                </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <AuthField
                    id="login-user"
                    name="nome"
                    label="Nome de utilizador"
                    placeholder="O seu nome de utilizador"
                    icon={<User size={18} />}
                    value={nome}
                    onChange={(e) => {
                        setNome(e.target.value)
                        validarCampo("nome", e.target.value)
                    }}
                    onBlur={() => validarCampo("nome", nome)}
                    error={erroDe("nome")}
                    autoComplete="username"
                    autoFocus
                    maxLength={100}
                    disabled={loading}
                    required
                />

                <PasswordField
                    id="login-password"
                    name="senha"
                    label="Senha"
                    placeholder="A sua senha"
                    value={senha}
                    onChange={(e) => {
                        setSenha(e.target.value)
                        validarCampo("senha", e.target.value)
                    }}
                    onBlur={() => validarCampo("senha", senha)}
                    error={erroDe("senha")}
                    autoComplete="current-password"
                    maxLength={72}
                    disabled={loading}
                    required
                />

                <div className="auth-form-row">
                    <Link to="/forgotpass" className="auth-link auth-link-small">
                        Esqueceu a senha?
                    </Link>
                </div>

                <AuthButton loading={loading} loadingText="A entrar...">
                    Entrar
                </AuthButton>
            </form>
        </AuthLayout>
    )
}

export default LoginPage
