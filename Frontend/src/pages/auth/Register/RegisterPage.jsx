import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Phone, User } from "lucide-react"
import AuthLayout from "../AuthLayout.jsx"
import AuthAlert from "../components/AuthAlert.jsx"
import AuthButton from "../components/AuthButton.jsx"
import AuthField from "../components/AuthField.jsx"
import PasswordField from "../components/PasswordField.jsx"
import { useAuthStore } from "../../../store/authStore.js"
import { validarRegisto } from "../../../utils/validacoes.js"

function RegisterPage() {
    const navigate = useNavigate()
    const { register, loading, error, errorField, clearError } = useAuthStore()

    const [nome, setNome] = useState("")
    const [telefone, setTelefone] = useState("")
    const [senha, setSenha] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})

    // valida um campo no momento em que e editado
    function validarCampo(campo, valor) {
        const validacoes = validarRegisto({
            nome,
            telefone,
            senha,
            confirmarSenha,
            [campo]: valor
        })
        setErros((prev) => ({ ...prev, [campo]: validacoes[campo] || null }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        clearError()

        const validados = validarRegisto({ nome, telefone, senha, confirmarSenha })
        setErros(validados)
        if (Object.values(validados).some(Boolean)) {
            return
        }

        const ok = await register({
            nome: nome.trim(),
            telefone: telefone.trim(),
            senha
        })

        if (ok) {
            // registo nao autentica: direciona para o login com aviso
            navigate("/login", {
                replace: true,
                state: { success: "Conta criada com sucesso! Faça login para entrar." }
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
            subtitle="Preencha os dados para começar a organizar o seu salão."
            footer={(
                <p>
                    Já tem uma conta?
                    <Link to="/login" className="auth-link">Entrar</Link>
                </p>
            )}
        >
            {error && !errorField && (
                <div className="auth-alerts">
                    <AuthAlert type="error">{error}</AuthAlert>
                </div>
            )}

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

                <PasswordField
                    id="register-password"
                    name="senha"
                    label="Senha"
                    placeholder="Crie uma senha segura"
                    hint="Mínimo 8 caracteres, com pelo menos uma letra e um número."
                    value={senha}
                    onChange={(e) => {
                        setSenha(e.target.value)
                        validarCampo("senha", e.target.value)
                    }}
                    onBlur={() => validarCampo("senha", senha)}
                    error={erroDe("senha")}
                    autoComplete="new-password"
                    maxLength={72}
                    disabled={loading}
                    required
                />

                <PasswordField
                    id="register-confirm-password"
                    name="confirmarSenha"
                    label="Confirmar senha"
                    placeholder="Repita a sua senha"
                    value={confirmarSenha}
                    onChange={(e) => {
                        setConfirmarSenha(e.target.value)
                        validarCampo("confirmarSenha", e.target.value)
                    }}
                    onBlur={() => validarCampo("confirmarSenha", confirmarSenha)}
                    error={erroDe("confirmarSenha")}
                    autoComplete="new-password"
                    maxLength={72}
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
