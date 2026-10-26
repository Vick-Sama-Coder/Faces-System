import { useState } from "react"
import { Link } from "react-router-dom"
import { CircleCheckBig, KeyRound, Phone } from "lucide-react"
import AuthLayout from "../AuthLayout.jsx"
import AuthAlert from "../components/AuthAlert.jsx"
import AuthButton from "../components/AuthButton.jsx"
import AuthField from "../components/AuthField.jsx"
import AuthStepIndicator from "../components/AuthStepIndicator.jsx"
import PasswordField from "../components/PasswordField.jsx"
import { useAuthStore } from "../../../store/authStore.js"
import {
    validarCodigo,
    validarConfirmacao,
    validarSenha,
    validarTelefone
} from "../../../utils/validacoes.js"

const PEDIDO = "pedido"
const REDEFINICAO = "redefinicao"
const CONCLUIDO = "concluido"

const PASSOS = ["Pedido", "Código", "Concluído"]

const CONTEUDO = {
    [PEDIDO]: {
        eyebrow: "Recuperação de conta",
        title: "Esqueceu a senha?",
        subtitle: "Indique o número de celular associado à conta para receber um código."
    },
    [REDEFINICAO]: {
        eyebrow: "Quase lá",
        title: "Definir nova senha",
        subtitle: "Introduza o código recebido e escolha a nova senha."
    },
    [CONCLUIDO]: {
        eyebrow: "Tudo pronto",
        title: "Senha redefinida",
        subtitle: "A alteração foi concluída com sucesso."
    }
}

function ForgotPasswordPage() {
    const { recuperarSenha, redefinirSenha, loading, error, errorField, clearError } = useAuthStore()

    const [passo, setPasso] = useState(PEDIDO)
    const [telefone, setTelefone] = useState("")
    const [codigo, setCodigo] = useState("")
    const [senhaNova, setSenhaNova] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})
    const [aviso, setAviso] = useState("")
    // codigo devolvido pelo backend apenas em desenvolvimento (sem SMS real)
    const [codigoDev, setCodigoDev] = useState(null)

    // erro local tem prioridade; o erro do backend realca o campo indicado
    function erroDe(campo) {
        if (erros[campo]) return erros[campo]
        if (errorField === campo) return error
        return null
    }

    // passo 1: pede o codigo por SMS ao numero indicado
    async function pedirCodigo(e) {
        e.preventDefault()
        clearError()

        const erroTel = validarTelefone(telefone)
        setErros({ telefone: erroTel })
        if (erroTel) {
            return
        }

        const resultado = await recuperarSenha({ telefone: telefone.trim() })
        if (resultado.ok) {
            setPasso(REDEFINICAO)
            setAviso("Se o número estiver registado, enviaremos um código de redefinição.")
            setCodigoDev(resultado.codigo)
        }
    }

    // passo 2: valida o codigo e define a nova senha
    async function confirmarRedefinicao(e) {
        e.preventDefault()
        clearError()

        const validados = {}
        const erroCodigo = validarCodigo(codigo.trim())
        if (erroCodigo) validados.codigo = erroCodigo
        const erroSenha = validarSenha(senhaNova)
        if (erroSenha) validados.senha_nova = erroSenha
        const erroConf = validarConfirmacao(senhaNova, confirmarSenha)
        if (erroConf) validados.confirmarSenha = erroConf

        setErros(validados)
        if (Object.values(validados).some(Boolean)) {
            return
        }

        const ok = await redefinirSenha({
            telefone: telefone.trim(),
            codigo: codigo.trim(),
            senha_nova: senhaNova
        })

        if (ok) {
            setPasso(CONCLUIDO)
        }
    }

    function voltarAoPedido() {
        clearError()
        setAviso("")
        setCodigoDev(null)
        setErros({})
        setPasso(PEDIDO)
    }

    const conteudo = CONTEUDO[passo]
    const passoAtual = passo === PEDIDO ? 1 : passo === REDEFINICAO ? 2 : 3
    const temAlertaPedido = Boolean(error && !errorField)
    const temAlertaRedefinicao = Boolean(aviso || codigoDev || (error && !errorField))

    return (
        <AuthLayout
            eyebrow={conteudo.eyebrow}
            title={conteudo.title}
            subtitle={conteudo.subtitle}
            headerExtra={<AuthStepIndicator steps={PASSOS} current={passoAtual} />}
            footer={passo === CONCLUIDO ? null : (
                <p>
                    Lembrou-se da senha?
                    <Link to="/login" className="auth-link">Entrar</Link>
                </p>
            )}
        >
            {passo === CONCLUIDO && (
                <>
                    <div className="auth-success-mark">
                        <CircleCheckBig size={30} aria-hidden="true" />
                    </div>
                    <p className="auth-success-copy">
                        Já pode entrar na sua conta com a nova senha.
                    </p>
                    <Link to="/login" className="auth-button auth-button-link">
                        Ir para o login
                    </Link>
                </>
            )}

            {passo === PEDIDO && (
                <>
                    {temAlertaPedido && (
                        <div className="auth-alerts">
                            <AuthAlert type="error">{error}</AuthAlert>
                        </div>
                    )}

                    <form className="auth-form" onSubmit={pedirCodigo} noValidate>
                        <AuthField
                            id="forgot-phone"
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
                                setErros({})
                            }}
                            onBlur={() => setErros({ telefone: validarTelefone(telefone) })}
                            error={erroDe("telefone")}
                            autoComplete="tel"
                            maxLength={20}
                            disabled={loading}
                            required
                        />

                        <AuthButton loading={loading} loadingText="A enviar...">
                            Enviar código de redefinição
                        </AuthButton>
                    </form>
                </>
            )}

            {passo === REDEFINICAO && (
                <>
                    {temAlertaRedefinicao && (
                        <div className="auth-alerts">
                            {aviso && <AuthAlert type="success">{aviso}</AuthAlert>}
                            {codigoDev && (
                                <AuthAlert type="info">
                                    Código de teste (dev): <strong>{codigoDev}</strong>
                                </AuthAlert>
                            )}
                            {error && !errorField && <AuthAlert type="error">{error}</AuthAlert>}
                        </div>
                    )}

                    <form className="auth-form" onSubmit={confirmarRedefinicao} noValidate>
                        <AuthField
                            id="forgot-code"
                            name="codigo"
                            type="text"
                            inputMode="numeric"
                            label="Código recebido"
                            placeholder="000000"
                            icon={<KeyRound size={18} />}
                            hint="Introduza os 6 dígitos recebidos."
                            value={codigo}
                            onChange={(e) => {
                                setCodigo(e.target.value)
                                setErros((prev) => ({ ...prev, codigo: null }))
                            }}
                            error={erroDe("codigo")}
                            autoComplete="one-time-code"
                            maxLength={6}
                            disabled={loading}
                            required
                        />

                        <PasswordField
                            id="forgot-new-password"
                            name="senha_nova"
                            label="Nova senha"
                            placeholder="Crie uma senha segura"
                            hint="Mínimo 8 caracteres, com pelo menos uma letra e um número."
                            value={senhaNova}
                            onChange={(e) => {
                                setSenhaNova(e.target.value)
                                setErros((prev) => ({ ...prev, senha_nova: null }))
                            }}
                            error={erroDe("senha_nova")}
                            autoComplete="new-password"
                            maxLength={72}
                            disabled={loading}
                            required
                        />

                        <PasswordField
                            id="forgot-confirm-password"
                            name="confirmarSenha"
                            label="Confirmar nova senha"
                            placeholder="Repita a nova senha"
                            value={confirmarSenha}
                            onChange={(e) => {
                                setConfirmarSenha(e.target.value)
                                setErros((prev) => ({ ...prev, confirmarSenha: null }))
                            }}
                            error={erroDe("confirmarSenha")}
                            autoComplete="new-password"
                            maxLength={72}
                            disabled={loading}
                            required
                        />

                        <AuthButton loading={loading} loadingText="A redefinir...">
                            Redefinir senha
                        </AuthButton>
                    </form>

                    <p className="auth-inline-help">
                        Não recebeu o código?{" "}
                        <button
                            type="button"
                            className="auth-text-button"
                            onClick={voltarAoPedido}
                            disabled={loading}
                        >
                            Tentar novamente
                        </button>
                    </p>
                </>
            )}
        </AuthLayout>
    )
}

export default ForgotPasswordPage
