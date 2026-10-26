import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
    Clock,
    ImageUp,
    MapPin,
    Phone,
    Scissors,
    Trash2,
    UtensilsCrossed
} from "lucide-react"
import Logo from "../../components/Logo/logo.jsx"
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle.jsx"
import { getApiError, getServicosPublicos } from "../../services/api.js"
import "./landing.css"

// A versao instalada do lucide-react nao inclui icones de marcas.
function FacebookIcon({ size = 16, ...props }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
        </svg>
    )
}

function InstagramIcon({ size = 16, ...props }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
    )
}

/*
 * Pagina publica do salao ("/").
 * A informacao do negocio vive no objecto CONTACTOS abaixo: basta preencher
 * os campos (telefone, morada, redes sociais, horario) quando estiverem
 * definitivos. Nada disto e guardado na base de dados por agora.
 */
const CONTACTOS = {
    nome: "Faces Salon",
    telefone: "+258 84 000 0000",        // <-- preencher com o numero do salao
    telefoneHref: "+258840000000",
    morada: "Av. Exemplo, 123 — Maputo, Mozambique", // <-- preencher com a morada real
    horario: "Seg a Sex · 08h00 – 18h00 | Sáb · 08h00 – 14h00", // <-- preencher
    redes: [
        { nome: "Facebook", url: "https://facebook.com/", Icone: FacebookIcon },   // <-- colocar o link da pagina
        { nome: "Instagram", url: "https://instagram.com/", Icone: InstagramIcon } // <-- colocar o perfil
    ]
}

const SOBRE_NOS = {
    titulo: "Sobre nós",
    // <-- substituir pelo texto real do salao
    texto: [
        "O Faces Salon é um salão de cabeleireiro unissex dedicado ao cuidado e à sua confiança. " +
        "A nossa equipa combina técnica, criatividade e um atendimento próximo para realçar a sua melhor versão.",
        "Trabalhamos apenas com produtos de qualidade e um ambiente pensado para o seu conforto — " +
        "desde o primeiro contacto até ao resultado final."
    ]
}

// chave local da fotografia do salao escolhida nesta pagina
const CHAVE_IMAGEM = "faces:landing:imagem-salao"
const LARGURA_MAXIMA = 1400

// formata valores em meticais (ex.: 350 MT)
function formatarPreco(valor) {
    const numero = Number(valor)
    if (!Number.isFinite(numero)) return null

    try {
        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: "MZN",
            maximumFractionDigits: 0
        }).format(numero)
    } catch {
        return `${numero.toLocaleString("pt-PT")} MT`
    }
}

// reduz a fotografia escolhida antes de guardar (o localStorage e pequeno)
function comprimirImagem(ficheiro, larguraMaxima = LARGURA_MAXIMA) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader()

        leitor.onerror = () => reject(new Error("Nao foi possivel ler o ficheiro"))
        leitor.onload = () => {
            const imagem = new Image()

            imagem.onerror = () => reject(new Error("Ficheiro de imagem invalido"))
            imagem.onload = () => {
                const escala = Math.min(1, larguraMaxima / imagem.width)
                const canvas = document.createElement("canvas")
                canvas.width = Math.round(imagem.width * escala)
                canvas.height = Math.round(imagem.height * escala)

                const contexto = canvas.getContext("2d")
                contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)

                resolve(canvas.toDataURL("image/jpeg", 0.82))
            }

            imagem.src = leitor.result
        }

        leitor.readAsDataURL(ficheiro)
    })
}

function LandingPage() {
    const [servicos, setServicos] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erroCatalogo, setErroCatalogo] = useState(null)
    const [erroImagem, setErroImagem] = useState(null)
    const inputImagemRef = useRef(null)

    // fotografia do salao: guardada localmente ate existir um lugar definitivo
    // (lida na inicializacao do estado, para nao causar um render extra)
    const [imagemSalao, setImagemSalao] = useState(() => {
        try {
            return window.localStorage.getItem(CHAVE_IMAGEM)
        } catch {
            return null
        }
    })

    // catalogo de servicos vindo da base de dados (endpoint publico)
    useEffect(() => {
        let activo = true

        async function carregar() {
            setCarregando(true)
            setErroCatalogo(null)

            try {
                const { data } = await getServicosPublicos()
                if (activo) setServicos(Array.isArray(data) ? data : [])
            } catch (erro) {
                if (activo) setErroCatalogo(getApiError(erro))
            } finally {
                if (activo) setCarregando(false)
            }
        }

        carregar()

        return () => {
            activo = false
        }
    }, [])

    // agrupa os servicos por categoria para o catalogo ficar legivel
    const categorias = useMemo(() => {
        const mapa = new Map()

        for (const servico of servicos) {
            const nome = servico.categoria_nome || "Outros"
            if (!mapa.has(nome)) mapa.set(nome, [])
            mapa.get(nome).push(servico)
        }

        return [...mapa.entries()]
            .sort(([a], [b]) => a.localeCompare(b, "pt"))
            .map(([nome, lista]) => ({ nome, servicos: lista }))
    }, [servicos])

    async function escolherImagem(evento) {
        const ficheiro = evento.target.files?.[0]
        evento.target.value = ""
        if (!ficheiro) return

        setErroImagem(null)

        try {
            const dados = await comprimirImagem(ficheiro)
            setImagemSalao(dados)
            window.localStorage.setItem(CHAVE_IMAGEM, dados)
        } catch (erro) {
            setErroImagem(erro.message || "Nao foi possivel carregar a imagem")
        }
    }

    function removerImagem() {
        setImagemSalao(null)
        setErroImagem(null)
        try {
            window.localStorage.removeItem(CHAVE_IMAGEM)
        } catch {
            // sem storage nao ha nada a limpar
        }
    }

    return (
        <div className="landing">
            <header className="landing-nav">
                <Link to="/" className="landing-nav-brand" aria-label={`${CONTACTOS.nome} — pagina inicial`}>
                    <Logo />
                </Link>

                <nav className="landing-nav-links" aria-label="Navegacao principal">
                    <a href="#catalogo" className="landing-nav-link">Serviços</a>
                    <a href="#sobre" className="landing-nav-link">Sobre nós</a>
                    <a href="#contactos" className="landing-nav-link">Contactos</a>
                </nav>

                <div className="landing-nav-actions">
                    <ThemeToggle />
                    <Link to="/login" className="landing-btn landing-btn-ghost">Entrar</Link>
                    <Link to="/register" className="landing-btn landing-btn-primary">Criar conta</Link>
                </div>
            </header>

            <section className="landing-hero">
                <div className="landing-hero-texto">
                    <p className="landing-kicker">Salão de cabeleireiro unissex</p>
                    <h1 className="landing-title">
                        O seu salão,
                        <span> em grande forma.</span>
                    </h1>
                    <p className="landing-subtitle">
                        Corte, tratamento e beleza com uma equipa que trata cada detalhe.
                        Conheça os nossos serviços e marque a sua visita.
                    </p>

                    <div className="landing-hero-acoes">
                        <a href="#catalogo" className="landing-btn landing-btn-primary">Ver serviços</a>
                        <Link to="/register" className="landing-btn landing-btn-ghost">Marcar online</Link>
                    </div>
                </div>

                <figure className="landing-hero-media">
                    {imagemSalao ? (
                        <img src={imagemSalao} alt={`Fotografia do salao ${CONTACTOS.nome}`} />
                    ) : (
                        <div className="landing-hero-placeholder" aria-hidden="true">
                            <Scissors size={42} strokeWidth={1.5} />
                            <span>Fotografia do salão</span>
                        </div>
                    )}

                    <figcaption className="landing-hero-media-acoes">
                        <input
                            ref={inputImagemRef}
                            type="file"
                            accept="image/*"
                            className="landing-visually-hidden"
                            onChange={escolherImagem}
                        />
                        <button
                            type="button"
                            className="landing-btn landing-btn-soft"
                            onClick={() => inputImagemRef.current?.click()}
                        >
                            <ImageUp size={16} aria-hidden="true" />
                            {imagemSalao ? "Trocar fotografia" : "Adicionar fotografia"}
                        </button>

                        {imagemSalao && (
                            <button
                                type="button"
                                className="landing-btn landing-btn-ghost-ic"
                                onClick={removerImagem}
                                aria-label="Remover fotografia do salao"
                                title="Remover fotografia"
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        )}
                    </figcaption>

                    {erroImagem && <p className="landing-erro">{erroImagem}</p>}
                </figure>
            </section>

            <section className="landing-section" id="sobre">
                <div className="landing-section-cabecalho">
                    <p className="landing-kicker">Quem somos</p>
                    <h2>{SOBRE_NOS.titulo}</h2>
                </div>

                <div className="landing-sobre">
                    <div className="landing-sobre-texto">
                        {SOBRE_NOS.texto.map((paragrafo) => (
                            <p key={paragrafo}>{paragrafo}</p>
                        ))}

                        <ul className="landing-sobre-pontos">
                            <li><Scissors size={17} aria-hidden="true" /> Equipa experiente e actualizada</li>
                            <li><UtensilsCrossed size={17} aria-hidden="true" /> Ambiente confortável e higiénico</li>
                            <li><Clock size={17} aria-hidden="true" /> {CONTACTOS.horario}</li>
                        </ul>
                    </div>

                    <div className="landing-sobre-media">
                        {imagemSalao ? (
                            <img src={imagemSalao} alt={`Ambiente do salao ${CONTACTOS.nome}`} loading="lazy" />
                        ) : (
                            <div className="landing-hero-placeholder" aria-hidden="true">
                                <ImageUp size={36} strokeWidth={1.5} />
                                <span>Espaço reservado para a fotografia do salão</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="landing-section landing-catalogo" id="catalogo">
                <div className="landing-section-cabecalho">
                    <p className="landing-kicker">Tabela de preços</p>
                    <h2>Catálogo de serviços</h2>
                    <p className="landing-section-texto">
                        Serviços e preços actualizados directamente da nossa recepção.
                    </p>
                </div>

                {carregando && (
                    <p className="landing-catalogo-estado" role="status">A carregar os serviços…</p>
                )}

                {!carregando && erroCatalogo && (
                    <p className="landing-catalogo-estado landing-catalogo-erro" role="alert">
                        Não foi possível carregar o catálogo: {erroCatalogo}
                    </p>
                )}

                {!carregando && !erroCatalogo && categorias.length === 0 && (
                    <p className="landing-catalogo-estado" role="status">
                        O catálogo ainda está a ser preparado. Volte em breve.
                    </p>
                )}

                <div className="landing-catalogo-grupos">
                    {categorias.map((categoria) => (
                        <article key={categoria.nome} className="landing-catalogo-grupo">
                            <h3 className="landing-catalogo-titulo">
                                <Scissors size={17} aria-hidden="true" />
                                {categoria.nome}
                            </h3>

                            <ul className="landing-catalogo-lista">
                                {categoria.servicos.map((servico) => (
                                    <li key={servico.id} className="landing-catalogo-item">
                                        <div className="landing-catalogo-info">
                                            <h4>
                                                {servico.nome}
                                                {servico.faixa_etaria && servico.faixa_etaria !== "Geral" && (
                                                    <span className={`landing-catalogo-faixa ${servico.faixa_etaria === "Crianca" ? "crianca" : "adulto"}`}>
                                                        {servico.faixa_etaria === "Crianca" ? "Criança" : servico.faixa_etaria}
                                                    </span>
                                                )}
                                            </h4>
                                            {servico.descricao && <p>{servico.descricao}</p>}
                                        </div>

                                        <div className="landing-catalogo-preco">
                                            <strong>
                                                {formatarPreco(servico.valor) || "Sob consulta"}
                                            </strong>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section className="landing-cta">
                <div>
                    <h2>Pronto para a sua próxima visita?</h2>
                    <p>Crie a sua conta e acompanhe os seus atendimentos com o nosso sistema.</p>
                </div>

                <div className="landing-cta-acoes">
                    <Link to="/login" className="landing-btn landing-btn-ghost">Entrar</Link>
                    <Link to="/register" className="landing-btn landing-btn-primary">Criar conta</Link>
                </div>
            </section>

            <footer className="landing-footer" id="contactos">
                <div className="landing-footer-coluna">
                    <div className="landing-footer-marca">
                        <Logo />
                    </div>
                    <p>
                        Um salão pensado para si: serviços de cabelo, tratamento e beleza
                        num só lugar.
                    </p>
                </div>

                <div className="landing-footer-coluna">
                    <h3>Contactos</h3>
                    <ul className="landing-footer-lista">
                        <li>
                            <a href={`tel:${CONTACTOS.telefoneHref}`}>
                                <Phone size={15} aria-hidden="true" />
                                {CONTACTOS.telefone}
                            </a>
                        </li>
                        <li>
                            <span>
                                <MapPin size={15} aria-hidden="true" />
                                {CONTACTOS.morada}
                            </span>
                        </li>
                        <li>
                            <span>
                                <Clock size={15} aria-hidden="true" />
                                {CONTACTOS.horario}
                            </span>
                        </li>
                    </ul>
                </div>

                <div className="landing-footer-coluna">
                    <h3>Redes sociais</h3>
                    <ul className="landing-footer-lista landing-footer-redes">
                        {CONTACTOS.redes.map(({ nome, url, Icone }) => (
                            <li key={nome}>
                                <a href={url} target="_blank" rel="noreferrer" aria-label={nome}>
                                    <Icone size={16} aria-hidden="true" />
                                    {nome}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="landing-footer-coluna">
                    <h3>Navegação</h3>
                    <ul className="landing-footer-lista">
                        <li><a href="#catalogo">Serviços</a></li>
                        <li><a href="#sobre">Sobre nós</a></li>
                        <li><Link to="/login">Entrar</Link></li>
                        <li><Link to="/register">Criar conta</Link></li>
                    </ul>
                </div>

                <p className="landing-footer-copy">
                    © {new Date().getFullYear()} {CONTACTOS.nome}. Todos os direitos reservados.
                </p>
            </footer>
        </div>
    )
}

export default LandingPage
