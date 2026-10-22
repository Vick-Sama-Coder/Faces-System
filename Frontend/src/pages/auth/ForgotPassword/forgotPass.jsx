import '../../home.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Lock, KeyRound } from 'lucide-react'
import Input from '../../../components/forms/input/input.jsx'
import { useAuthStore } from '../../../store/authStore.js'
import { validarTelefone, validarSenha, validarConfirmacao, validarCodigo } from '../../../utils/validacoes.js'

const PEDIDO = "pedido";
const REDEFINICAO = "redefinicao";
const CONCLUIDO = "concluido";

function ForgotPass(){
    const { recuperarSenha, redefinirSenha, loading, error, errorField, clearError } = useAuthStore()

    const [passo, setPasso] = useState(PEDIDO)
    const [telefone, setTelefone] = useState("")
    const [codigo, setCodigo] = useState("")
    const [senhaNova, setSenhaNova] = useState("")
    const [confirmarSenha, setConfirmarSenha] = useState("")
    const [erros, setErros] = useState({})
    const [aviso, setAviso] = useState("")
    //codigo devolvido pelo backend apenas em desenvolvimento (sem SMS real)
    const [codigoDev, setCodigoDev] = useState(null)

    //erro local tem prioridade; o erro do backend realca o campo indicado
    function erroDe(campo){
        if(erros[campo]) return erros[campo]
        if(errorField === campo) return error
        return null
    }

    //passo 1: pede o codigo por SMS ao numero indicado
    async function pedirCodigo(e){
        e.preventDefault()
        clearError()

        const erroTel = validarTelefone(telefone)
        setErros({ telefone: erroTel })
        if(erroTel){
            return
        }

        const resultado = await recuperarSenha({ telefone: telefone.trim() })
        if(resultado.ok){
            setPasso(REDEFINICAO)
            setAviso("Se o numero estiver registado, enviaremos um codigo de redefinicao.")
            setCodigoDev(resultado.codigo)
        }
    }

    //passo 2: valida o codigo e define a nova senha
    async function confirmarRedefinicao(e){
        e.preventDefault()
        clearError()

        const validados = {}
        const erroCodigo = validarCodigo(codigo.trim())
        if(erroCodigo) validados.codigo = erroCodigo
        const erroSenha = validarSenha(senhaNova)
        if(erroSenha) validados.senha_nova = erroSenha
        const erroConf = validarConfirmacao(senhaNova, confirmarSenha)
        if(erroConf) validados.confirmarSenha = erroConf

        setErros(validados)
        if(Object.values(validados).some(Boolean)){
            return
        }

        const ok = await redefinirSenha({
            telefone: telefone.trim(),
            codigo: codigo.trim(),
            senha_nova: senhaNova
        })

        if(ok){
            setPasso(CONCLUIDO)
        }
    }

    function voltarAoPedido(){
        clearError()
        setAviso("")
        setCodigoDev(null)
        setErros({})
        setPasso(PEDIDO)
    }

    if(passo === CONCLUIDO){
        return (
            <section className="container">
                <h1 className='h1'>Senha Redefinida</h1>
                <p className='text'>A sua senha foi alterada com sucesso. Ja pode entrar com a nova senha.</p>
                <p className='footer-p'><Link to="/login" className='link'>Ir para o login</Link></p>
            </section>
        )
    }

    return(
        <section className="container">
            <h1 className='h1'>Esqueceu a Senha?</h1>

            {passo === PEDIDO && (
                <>
                    <p className='text'> Sem Problemas! Informe o seu numero de celular e enviaremos um codigo para redefinir a sua Senha.</p>

                    {error && !errorField && <p className="error-msg" role="alert">{error}</p>}

                    <form onSubmit={pedirCodigo} noValidate>
                        <div className='input-section'>
                            <Input
                                type='tel'
                                labelId='phone'
                                labelName='Numero de Celular'
                                placeholder="84-123-4567"
                                className='text-input'
                                icon={<Phone></Phone>}
                                value={telefone}
                                onChange={(e) => { setTelefone(e.target.value); setErros({}) }}
                                onBlur={() => setErros({ telefone: validarTelefone(telefone) })}
                                error={erroDe("telefone")}
                                autoComplete="tel"
                                maxLength={20}
                            />
                        </div>
                        <div className='input-section'>
                            <Input
                                type="submit"
                                value={loading ? "A enviar..." : "Enviar codigo de Redefinicao"}
                                className="submit-btn"
                                disabled={loading}
                            />
                        </div>
                    </form>
                </>
            )}

            {passo === REDEFINICAO && (
                <>
                    {aviso && <p className="success-msg" role="status">{aviso}</p>}
                    {codigoDev && <p className="success-msg" role="status">Codigo de teste (dev): {codigoDev}</p>}
                    {error && !errorField && <p className="error-msg" role="alert">{error}</p>}

                    <form onSubmit={confirmarRedefinicao} noValidate>
                        <div className='input-section'>
                            <Input
                                type='text'
                                labelId='codigo'
                                labelName='Codigo recebido'
                                placeholder="000000"
                                className='text-input'
                                icon={<KeyRound></KeyRound>}
                                value={codigo}
                                onChange={(e) => { setCodigo(e.target.value); setErros((p) => ({ ...p, codigo: null })) }}
                                error={erroDe("codigo")}
                                inputMode="numeric"
                                maxLength={6}
                            />
                        </div>
                        <div className='input-section'>
                            <Input
                                type='password'
                                labelId='pass'
                                labelName='Nova Senha'
                                placeholder="8+ caracteres, 1 letra e 1 numero"
                                className='text-input'
                                icon={<Lock></Lock>}
                                value={senhaNova}
                                onChange={(e) => { setSenhaNova(e.target.value); setErros((p) => ({ ...p, senha_nova: null })) }}
                                error={erroDe("senha_nova")}
                                autoComplete="new-password"
                                maxLength={72}
                            />
                        </div>
                        <div className='input-section'>
                            <Input
                                type='password'
                                labelId='confirm-pass'
                                labelName='Confirmar Senha'
                                placeholder="repita a nova senha"
                                className='text-input'
                                icon={<Lock></Lock>}
                                value={confirmarSenha}
                                onChange={(e) => { setConfirmarSenha(e.target.value); setErros((p) => ({ ...p, confirmarSenha: null })) }}
                                error={erroDe("confirmarSenha")}
                                autoComplete="new-password"
                                maxLength={72}
                            />
                        </div>
                        <div className='input-section'>
                            <Input
                                type="submit"
                                value={loading ? "A redefinir..." : "Redefinir Senha"}
                                className="submit-btn"
                                disabled={loading}
                            />
                        </div>
                    </form>

                    <p className='footer-p'>
                        Nao recebeu o codigo?{' '}
                        <button type="button" className='link' onClick={voltarAoPedido}>Tentar novamente</button>
                    </p>
                </>
            )}

            <p className='footer-p'>Lembrou-se da sua Senha? <Link to="/login" className='link'>Entrar</Link></p>
        </section>
    )
}
export default ForgotPass
