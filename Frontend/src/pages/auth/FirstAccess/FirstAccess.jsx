import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import AuthLayout from "../AuthLayout.jsx"
import AuthAlert from "../components/AuthAlert.jsx"
import AuthButton from "../components/AuthButton.jsx"
import PasswordField from "../components/PasswordField.jsx"
import { useAuthStore } from "../../../store/authStore.js"
import { validarSenha, validarConfirmacao } from "../../../utils/validacoes.js"

function FirstAccess() {
    const navigate = useNavigate()
    const {
        user,
        definirSenhaPrimeiroAcesso,
        logout,
        loading,
        error,
        errorField,
        clearError
    } = useAuthStore()

    const [senhaNova, setSenhaNova] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})

    const precisaTrocarSenha = Boolean(user?.deve_alterar_senha || user?.alteracao_obrigatoria_senha)

    // se a conta ja tem uma senha definida, nao ha nada a fazer aqui
    if (!precisaTrocarSenha) {
        return <Navigate to="/dashboard" replace />
    }

    // erro local tem prioridade; o erro do backend realca o campo indicado
    function erroDe(campo) {
        if (erros[campo]) return erros[campo]
        if (errorField === campo) return error
        return null
    }

    function validarCampo(campo, valor) {
        const mensagem = campo === "senha_nova"
            ? validarSenha(valor)
            : validarConfirmacao(senhaNova, valor)

        setErros((prev) => ({ ...prev, [campo]: mensagem }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        clearError()

        const validados = {
            senha_nova: validarSenha(senhaNova),
            confirmarSenha: validarConfirmacao(senhaNova, confirmarSenha)
        }

        setErros(validados)
        if (Object.values(validados).some(Boolean)) {
            return
        }

        const ok = await definirSenhaPrimeiroAcesso({ senha_nova: senhaNova })
        if (ok) {
            navigate("/dashboard", { replace: true })
        }
    }

    async function handleLogout() {
        await logout()
        navigate("/login", { replace: true })
    }

    return (
        <AuthLayout
            eyebrow="Primeiro acesso"
            title="Defina a sua nova senha"
            subtitle={`Bem-vindo(a), ${user?.nome || "utilizador"}. Antes de continuar, escolha uma nova senha para a sua conta.`}
            footer={(
                <p>
                    Não é você?
                    <button
                        type="button"
                        className="auth-text-button"
                        onClick={handleLogout}
                        disabled={loading}
                    >
                        Terminar sessão
                    </button>
                </p>
            )}
        >
            <div className="auth-alerts">
                <AuthAlert type="info">
                    A sua conta ainda usa a senha inicial. Por segurança, defina uma nova senha.
                </AuthAlert>
                {error && !errorField && <AuthAlert type="error">{error}</AuthAlert>}
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <PasswordField
                    id="first-access-password"
                    name="senha_nova"
                    label="Nova senha"
                    placeholder="Crie uma nova senha"
                    hint="Mínimo 8 caracteres, com pelo menos uma letra e um número."
                    value={senhaNova}
                    onChange={(e) => {
                        setSenhaNova(e.target.value)
                        setErros((prev) => ({ ...prev, senha_nova: null }))
                    }}
                    onBlur={() => validarCampo("senha_nova", senhaNova)}
                    error={erroDe("senha_nova")}
                    autoComplete="new-password"
                    maxLength={72}
                    disabled={loading}
                    autoFocus
                    required
                />

                <PasswordField
                    id="first-access-confirm-password"
                    name="confirmarSenha"
                    label="Confirmar nova senha"
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => {
                        setConfirmarSenha(e.target.value)
                        setErros((prev) => ({ ...prev, confirmarSenha: null }))
                    }}
                    onBlur={() => validarCampo("confirmarSenha", confirmarSenha)}
                    error={erroDe("confirmarSenha")}
                    autoComplete="new-password"
                    maxLength={72}
                    disabled={loading}
                    required
                />

                <AuthButton loading={loading} loadingText="A guardar...">
                    Guardar senha e entrar
                </AuthButton>
            </form>
        </AuthLayout>
    )
}

export default FirstAccess
