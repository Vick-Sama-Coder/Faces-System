import { useEffect, useState } from "react"
import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react"
import SideBar from "../../components/sidebar/siderbar.jsx"
import Headers from "../../components/headers/header.jsx"
import "../admin/admin.css"
import "./perfil.css"
import {
    alterarSenha,
    getApiError,
    getApiErrorField,
    getMe,
    updateMe
} from "../../services/api.js"
import { useAuthStore } from "../../store/authStore.js"
import {
    limparTelefone,
    validarConfirmacao,
    validarNome,
    validarSenha,
    validarTelefone
} from "../../utils/validacoes.js"

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-MZ", {
    dateStyle: "short",
    timeStyle: "short"
})

function formatarData(valor, vazio = "—") {
    if (!valor) return vazio
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return vazio
    return FORMATADOR_DATA.format(data)
}

function formatarTelefone(valor) {
    const digitos = String(valor ?? "").replace(/\D/g, "").replace(/^258/, "")
    if (!digitos) return "—"
    if (digitos.length !== 9) return digitos
    return `${digitos.slice(0, 2)} ${digitos.slice(2, 5)} ${digitos.slice(5)}`
}

function iniciaisDe(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean)
    if (!partes.length) return "?"
    const primeira = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ""
    return `${primeira}${ultima}`.toUpperCase()
}

function Perfil() {
    const { user, updateUser } = useAuthStore()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const [perfil, setPerfil] = useState(user)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [nome, setNome] = useState(user?.nome || "")
    const [telefone, setTelefone] = useState(String(user?.telefone ?? ""))
    const [senhaAtualPerfil, setSenhaAtualPerfil] = useState("")
    const [errosPerfil, setErrosPerfil] = useState({})
    const [erroPerfil, setErroPerfil] = useState(null)
    const [sucessoPerfil, setSucessoPerfil] = useState(null)
    const [savingPerfil, setSavingPerfil] = useState(false)

    const [senhaAtualTroca, setSenhaAtualTroca] = useState("")
    const [senhaNova, setSenhaNova] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [errosSenha, setErrosSenha] = useState({})
    const [erroSenha, setErroSenha] = useState(null)
    const [sucessoSenha, setSucessoSenha] = useState(null)
    const [savingSenha, setSavingSenha] = useState(false)

    useEffect(() => {
        let activo = true

        async function carregarPerfil() {
            try {
                const res = await getMe()
                const dados = res.data?.user

                if (!activo || !dados) return

                setPerfil((anterior) => ({ ...anterior, ...dados }))
                setNome(dados.nome || "")
                setTelefone(String(dados.telefone ?? ""))
                updateUser(dados)
            } catch (err) {
                if (activo) setLoadError(getApiError(err))
            } finally {
                if (activo) setLoading(false)
            }
        }

        carregarPerfil()
        return () => { activo = false }
    }, [updateUser])

    const perfilAtual = perfil || user || {}
    const nomeAtual = String(perfilAtual.nome || "")
    const telefoneAtual = String(perfilAtual.telefone ?? "")
    const nomeLimpo = nome.trim()
    const telefoneLimpo = limparTelefone(telefone)
    const nomeAlterado = nomeLimpo !== nomeAtual
    const telefoneAlterado = telefoneLimpo !== telefoneAtual
    const temAlteracoes = nomeAlterado || telefoneAlterado

    function limparFeedbackPerfil() {
        if (erroPerfil) setErroPerfil(null)
        if (sucessoPerfil) setSucessoPerfil(null)
    }

    function alterarNome(valor) {
        setNome(valor)
        if (errosPerfil.nome) {
            setErrosPerfil((anteriores) => ({ ...anteriores, nome: null }))
        }
        limparFeedbackPerfil()
    }

    function alterarTelefone(valor) {
        setTelefone(valor)
        if (errosPerfil.telefone) {
            setErrosPerfil((anteriores) => ({ ...anteriores, telefone: null }))
        }
        limparFeedbackPerfil()
    }

    function alterarSenhaAtualPerfil(valor) {
        setSenhaAtualPerfil(valor)
        if (errosPerfil.senha_atual) {
            setErrosPerfil((anteriores) => ({ ...anteriores, senha_atual: null }))
        }
        limparFeedbackPerfil()
    }

    function descartarAlteracoes() {
        setNome(nomeAtual)
        setTelefone(telefoneAtual)
        setSenhaAtualPerfil("")
        setErrosPerfil({})
        setErroPerfil(null)
        setSucessoPerfil(null)
    }

    async function guardarPerfil(e) {
        e.preventDefault()
        if (savingPerfil) return

        if (!temAlteracoes) {
            setErroPerfil("Altere o nome ou o telefone antes de guardar.")
            return
        }

        const erros = {}

        if (nomeAlterado) {
            const erroNome = validarNome(nomeLimpo)
            if (erroNome) erros.nome = erroNome
        }

        if (telefoneAlterado) {
            const erroTelefone = validarTelefone(telefone)
            if (erroTelefone) erros.telefone = erroTelefone
        }

        if (!senhaAtualPerfil) {
            erros.senha_atual = "Introduza a sua senha atual para confirmar as alterações."
        }

        setErrosPerfil(erros)
        setErroPerfil(null)
        setSucessoPerfil(null)

        if (Object.keys(erros).length > 0) return

        setSavingPerfil(true)

        try {
            const payload = { senha_atual: senhaAtualPerfil }
            if (nomeAlterado) payload.nome = nomeLimpo
            if (telefoneAlterado) payload.telefone = telefoneLimpo

            const res = await updateMe(payload)
            const dados = res.data?.user

            if (!dados) {
                setErroPerfil("O servidor não devolveu os dados atualizados.")
                return
            }

            setPerfil((anterior) => ({ ...anterior, ...dados }))
            setNome(dados.nome || nomeLimpo)
            setTelefone(String(dados.telefone ?? telefoneLimpo))
            setSenhaAtualPerfil("")
            setErrosPerfil({})
            updateUser(dados)
            setSucessoPerfil(
                nomeAlterado
                    ? "Perfil atualizado. Use o novo nome de utilizador no próximo início de sessão."
                    : "Perfil atualizado com sucesso."
            )
        } catch (err) {
            const field = getApiErrorField(err)
            const message = getApiError(err)

            if (field && ["nome", "telefone", "senha_atual"].includes(field)) {
                setErrosPerfil((anteriores) => ({ ...anteriores, [field]: message }))
            } else {
                setErroPerfil(message)
            }
        } finally {
            setSavingPerfil(false)
        }
    }

    function limparFeedbackSenha() {
        if (erroSenha) setErroSenha(null)
        if (sucessoSenha) setSucessoSenha(null)
    }

    function alterarSenhaAtualTroca(valor) {
        setSenhaAtualTroca(valor)
        if (errosSenha.senha_atual) {
            setErrosSenha((anteriores) => ({ ...anteriores, senha_atual: null }))
        }
        limparFeedbackSenha()
    }

    function alterarSenhaNova(valor) {
        setSenhaNova(valor)
        if (errosSenha.senha_nova) {
            setErrosSenha((anteriores) => ({ ...anteriores, senha_nova: null }))
        }
        limparFeedbackSenha()
    }

    function alterarConfirmarSenha(valor) {
        setConfirmarSenha(valor)
        if (errosSenha.confirmar_senha) {
            setErrosSenha((anteriores) => ({ ...anteriores, confirmar_senha: null }))
        }
        limparFeedbackSenha()
    }

    async function guardarSenha(e) {
        e.preventDefault()
        if (savingSenha) return

        const erros = {}

        if (!senhaAtualTroca) {
            erros.senha_atual = "Introduza a sua senha atual."
        }

        const erroSenhaNova = validarSenha(senhaNova)
        if (erroSenhaNova) erros.senha_nova = erroSenhaNova

        const erroConfirmacao = validarConfirmacao(senhaNova, confirmarSenha)
        if (erroConfirmacao) erros.confirmar_senha = erroConfirmacao

        setErrosSenha(erros)
        setErroSenha(null)
        setSucessoSenha(null)

        if (Object.keys(erros).length > 0) return

        setSavingSenha(true)

        try {
            await alterarSenha({
                senha_atual: senhaAtualTroca,
                senha_nova: senhaNova
            })

            setSenhaAtualTroca("")
            setSenhaNova("")
            setConfirmarSenha("")
            setErrosSenha({})
            setPerfil((anterior) => (
                anterior ? { ...anterior, alteracao_obrigatoria_senha: false } : anterior
            ))
            updateUser({
                alteracao_obrigatoria_senha: false,
                deve_alterar_senha: false
            })
            setSucessoSenha("Palavra-passe alterada com sucesso.")
        } catch (err) {
            const field = getApiErrorField(err)
            const message = getApiError(err)

            if (field && ["senha_atual", "senha_nova"].includes(field)) {
                setErrosSenha((anteriores) => ({ ...anteriores, [field]: message }))
            } else {
                setErroSenha(message)
            }
        } finally {
            setSavingSenha(false)
        }
    }

    return (
        <div className="admin-main">
            <SideBar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <Headers
                heady="admin-header"
                title="O Meu Perfil"
                h1Class="admin-header-title"
                menuClass="menu"
                userClass="user"
                bellClass="bell"
                onMenuClick={() => setIsSidebarOpen(true)}
            />

            <main className="admin-content profile-content">
                <header className="admin-page-header">
                    <div className="admin-page-header-inner">
                        <div>
                            <h1 className="admin-page-title">O Meu Perfil</h1>
                            <p className="admin-page-subtitle">
                                Consulte os dados da sua conta e mantenha as suas credenciais seguras
                            </p>
                        </div>
                        {loading && (
                            <span className="profile-sync" role="status">
                                A sincronizar...
                            </span>
                        )}
                    </div>
                </header>

                {loadError && (
                    <div className="admin-alert error" role="alert">
                        {loadError}
                    </div>
                )}

                <section className="profile-hero" aria-label="Resumo da conta">
                    <div className="profile-hero-main">
                        <span className="profile-avatar" aria-hidden="true">
                            {iniciaisDe(nomeAtual)}
                        </span>

                        <div className="profile-hero-copy">
                            <span className="profile-eyebrow">Conta autenticada</span>
                            <h2 className="profile-name">{nomeAtual || "Utilizador"}</h2>
                            <div className="profile-badges">
                                <span className="admin-badge primary">
                                    {perfilAtual.perfil || "Sem perfil"}
                                </span>
                                <span className={`admin-badge ${perfilAtual.estado === "Ativo" ? "success" : "neutral"}`}>
                                    {perfilAtual.estado || "Ativo"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <dl className="profile-meta">
                        <div>
                            <dt>Telefone</dt>
                            <dd>{formatarTelefone(perfilAtual.telefone)}</dd>
                        </div>
                        <div>
                            <dt>Último acesso</dt>
                            <dd>{formatarData(perfilAtual.ultimo_acesso, "Nunca")}</dd>
                        </div>
                        <div>
                            <dt>Conta criada</dt>
                            <dd>{formatarData(perfilAtual.data_criacao)}</dd>
                        </div>
                    </dl>
                </section>

                <div className="profile-grid">
                    <section className="profile-card" aria-labelledby="perfil-dados-titulo">
                        <header className="profile-card-header">
                            <span className="profile-card-icon" aria-hidden="true">
                                <UserRound size={20} />
                            </span>
                            <div className="profile-card-heading">
                                <h2 id="perfil-dados-titulo">Dados da conta</h2>
                                <p>Atualize o nome de utilizador ou o número de telefone.</p>
                            </div>
                        </header>

                        <form onSubmit={guardarPerfil} noValidate>
                            <div className="profile-card-body">
                                {erroPerfil && (
                                    <div className="admin-alert error" role="alert">
                                        {erroPerfil}
                                    </div>
                                )}

                                {sucessoPerfil && (
                                    <div className="admin-alert success" role="status">
                                        {sucessoPerfil}
                                    </div>
                                )}

                                <div className="admin-form-grid">
                                    <div className="admin-field">
                                        <label htmlFor="perfil-nome">Nome de utilizador</label>
                                        <input
                                            id="perfil-nome"
                                            type="text"
                                            value={nome}
                                            onChange={(e) => alterarNome(e.target.value)}
                                            className={errosPerfil.nome ? "invalid" : ""}
                                            aria-invalid={Boolean(errosPerfil.nome)}
                                            autoComplete="username"
                                            maxLength={100}
                                            placeholder="Ex.: Ana Silva"
                                            required
                                        />
                                        {errosPerfil.nome && (
                                            <span className="admin-field-error">{errosPerfil.nome}</span>
                                        )}
                                        <span className="admin-field-hint">
                                            Este nome identifica a conta no início de sessão.
                                        </span>
                                    </div>

                                    <div className="admin-field">
                                        <label htmlFor="perfil-telefone">Telefone</label>
                                        <input
                                            id="perfil-telefone"
                                            type="tel"
                                            value={telefone}
                                            onChange={(e) => alterarTelefone(e.target.value)}
                                            className={errosPerfil.telefone ? "invalid" : ""}
                                            aria-invalid={Boolean(errosPerfil.telefone)}
                                            autoComplete="tel"
                                            inputMode="tel"
                                            placeholder="Ex.: 84 123 4567"
                                            required
                                        />
                                        {errosPerfil.telefone && (
                                            <span className="admin-field-error">{errosPerfil.telefone}</span>
                                        )}
                                        <span className="admin-field-hint">
                                            Usado na recuperação de senha por SMS.
                                        </span>
                                    </div>

                                    <div className="admin-field full">
                                        <label htmlFor="perfil-senha-atual">Senha atual</label>
                                        <input
                                            id="perfil-senha-atual"
                                            type="password"
                                            value={senhaAtualPerfil}
                                            onChange={(e) => alterarSenhaAtualPerfil(e.target.value)}
                                            className={errosPerfil.senha_atual ? "invalid" : ""}
                                            aria-invalid={Boolean(errosPerfil.senha_atual)}
                                            autoComplete="current-password"
                                            placeholder="Confirme com a sua senha atual"
                                        />
                                        {errosPerfil.senha_atual && (
                                            <span className="admin-field-error">{errosPerfil.senha_atual}</span>
                                        )}
                                        <span className="admin-field-hint">
                                            A senha é pedida sempre que o nome ou o telefone são alterados.
                                        </span>
                                    </div>
                                </div>

                                <div className="admin-alert info">
                                    <ShieldCheck size={16} aria-hidden="true" />
                                    <span>
                                        Estes dados são sensíveis: o nome é o seu identificador de
                                        acesso e o telefone permite recuperar a conta.
                                    </span>
                                </div>
                            </div>

                            <footer className="profile-card-footer">
                                <button
                                    type="button"
                                    className="admin-btn secondary"
                                    onClick={descartarAlteracoes}
                                    disabled={savingPerfil || (!temAlteracoes && !senhaAtualPerfil)}
                                >
                                    Descartar
                                </button>
                                <button
                                    type="submit"
                                    className="admin-btn primary"
                                    disabled={savingPerfil || !temAlteracoes}
                                >
                                    <Save size={16} />
                                    {savingPerfil ? "A guardar..." : "Guardar alterações"}
                                </button>
                            </footer>
                        </form>
                    </section>

                    <section className="profile-card" aria-labelledby="perfil-seguranca-titulo">
                        <header className="profile-card-header">
                            <span className="profile-card-icon" aria-hidden="true">
                                <KeyRound size={20} />
                            </span>
                            <div className="profile-card-heading">
                                <h2 id="perfil-seguranca-titulo">Segurança</h2>
                                <p>Defina uma nova palavra-passe para a sua conta.</p>
                            </div>
                        </header>

                        <form onSubmit={guardarSenha} noValidate>
                            <div className="profile-card-body">
                                {perfilAtual.alteracao_obrigatoria_senha && (
                                    <div className="admin-alert info" role="status">
                                        Esta conta está a usar uma palavra-passe temporária.
                                        Defina uma nova palavra-passe.
                                    </div>
                                )}

                                {erroSenha && (
                                    <div className="admin-alert error" role="alert">
                                        {erroSenha}
                                    </div>
                                )}

                                {sucessoSenha && (
                                    <div className="admin-alert success" role="status">
                                        {sucessoSenha}
                                    </div>
                                )}

                                <div className="admin-form-grid profile-password-grid">
                                    <div className="admin-field full">
                                        <label htmlFor="senha-atual">Palavra-passe atual</label>
                                        <input
                                            id="senha-atual"
                                            type="password"
                                            value={senhaAtualTroca}
                                            onChange={(e) => alterarSenhaAtualTroca(e.target.value)}
                                            className={errosSenha.senha_atual ? "invalid" : ""}
                                            aria-invalid={Boolean(errosSenha.senha_atual)}
                                            autoComplete="current-password"
                                            placeholder="Introduza a senha atual"
                                        />
                                        {errosSenha.senha_atual && (
                                            <span className="admin-field-error">{errosSenha.senha_atual}</span>
                                        )}
                                    </div>

                                    <div className="admin-field full">
                                        <label htmlFor="senha-nova">Nova palavra-passe</label>
                                        <input
                                            id="senha-nova"
                                            type="password"
                                            value={senhaNova}
                                            onChange={(e) => alterarSenhaNova(e.target.value)}
                                            className={errosSenha.senha_nova ? "invalid" : ""}
                                            aria-invalid={Boolean(errosSenha.senha_nova)}
                                            autoComplete="new-password"
                                            placeholder="Mínimo 8 caracteres"
                                        />
                                        {errosSenha.senha_nova && (
                                            <span className="admin-field-error">{errosSenha.senha_nova}</span>
                                        )}
                                        <span className="admin-field-hint">
                                            Use pelo menos 8 caracteres, com 1 letra e 1 número.
                                        </span>
                                    </div>

                                    <div className="admin-field full">
                                        <label htmlFor="senha-confirmar">Confirmar nova palavra-passe</label>
                                        <input
                                            id="senha-confirmar"
                                            type="password"
                                            value={confirmarSenha}
                                            onChange={(e) => alterarConfirmarSenha(e.target.value)}
                                            className={errosSenha.confirmar_senha ? "invalid" : ""}
                                            aria-invalid={Boolean(errosSenha.confirmar_senha)}
                                            autoComplete="new-password"
                                            placeholder="Repita a nova palavra-passe"
                                        />
                                        {errosSenha.confirmar_senha && (
                                            <span className="admin-field-error">{errosSenha.confirmar_senha}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="profile-security-note">
                                    <ShieldCheck size={16} aria-hidden="true" />
                                    <span>
                                        A alteração da palavra-passe não termina as sessões já abertas
                                        noutros dispositivos.
                                    </span>
                                </div>
                            </div>

                            <footer className="profile-card-footer">
                                <button
                                    type="submit"
                                    className="admin-btn primary"
                                    disabled={savingSenha}
                                >
                                    <KeyRound size={16} />
                                    {savingSenha ? "A alterar..." : "Alterar palavra-passe"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            </main>
        </div>
    )
}

export default Perfil
