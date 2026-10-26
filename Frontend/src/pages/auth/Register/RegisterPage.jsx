import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Phone, User } from "lucide-react"
import AuthLayout from "../AuthLayout.jsx"
import AuthAlert from "../components/AuthAlert.jsx"
import AuthButton from "../components/AuthButton.jsx"
import AuthField from "../components/AuthField.jsx"
import { useAuthStore } from "../../../store/authStore.js"
import { validarRegisto } from "../../../utils/validacoes.js"

function RegisterPage() {
    const navigate = useNavigate()
    const { register, loading, error, errorField, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [telefone, setTelefone] = useState("")
    const [erros, setErros] = useState({})

    // valida um campo no momento em que e editado
    function validarCampo(campo, valor) {
        const validacoes = validarRegisto({
            nome: campo === "nome" ? valor : nome,
            telefone: campo === "telefone" ? valor : telefone
        })
        setErros((prev) => ({ ...prev, [campo]: validacoes[campo] || null }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        clearError()

        const validados = validarRegisto({ nome, telefone })
        setErros(validados)
        if (Object.values(validados).some(Boolean)) {
            return
        }

        const resultado = await register({
            nome: nome.trim(),
            telefone: telefone.trim()
        })

        if (resultado.ok) {
            const senhaInicial = resultado.data?.senha_padrao || "12345"
            // o registo nao autentica: direciona para o login com o aviso
            navigate("/login", {
                replace: true,
                state: {
                    success: `Conta criada com sucesso! A senha inicial é ${senhaInicial}. Inicie sessão para definir a sua nova senha.`
                }
            })
        }
    }

    // erro local de validacao tem prioridade sobre o erro do backend,
    // e o erro do backend realca o campo que ele indicar
    function erroDe(campo) {
        if (erros[campo]) return erros[campo]
        if (errorField === campo) return error
        return null
    }

    return (
        <AuthLayout
            eyebrow="Comece agora"
            title="Criar a sua conta"
            subtitle="Preencha o nome e o telefone. A conta será criada com uma senha inicial temporária."
            footer={(
                <p>
                    Já tem uma conta?
                    <Link to="/login" className="auth-link">Entrar</Link>
                </p>
            )}
        >
            <div className="auth-alerts">
                <AuthAlert type="info">
                    A conta é criada com a senha inicial <strong>12345</strong>.
                    No primeiro acesso, será pedido que defina uma nova senha.
                </AuthAlert>
                {error && !errorField && (
                    <AuthAlert type="error">{error}</AuthAlert>
                )}
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <AuthField
                    id="register-name"
                    name="nome"
                    label="Nome de utilizador"
                    placeholder="O seu nome de utilizador"
                    icon={<User size={18} />}
                    hint="Use de 3 a 100 caracteres, apenas letras e espaços."
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

                <AuthField
                    id="register-phone"
                    name="telefone"
                    type="tel"
                    inputMode="tel"
                    label="Número de celular"
                    placeholder="84 123 4567"
                    icon={<Phone size={18} />}
                    hint="9 dígitos, começando por 82 a 87."
                    value={telefone}
                    onChange={(e) => {
                        setTelefone(e.target.value)
                        validarCampo("telefone", e.target.value)
                    }}
                    onBlur={() => validarCampo("telefone", telefone)}
                    error={erroDe("telefone")}
                    autoComplete="tel"
                    maxLength={20}
                    disabled={loading}
                    required
                />

                <AuthButton loading={loading} loadingText="A criar conta...">
                    Criar conta
                </AuthButton>
            </form>
        </AuthLayout>
    )
}

export default RegisterPage
