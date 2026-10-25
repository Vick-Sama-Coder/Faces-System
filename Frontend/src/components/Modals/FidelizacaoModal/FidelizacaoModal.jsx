import { useMemo, useState } from "react"
import { X, Heart, Save, Scissors, CheckCircle2, AlertCircle } from "lucide-react"
import { updateServico, getApiError } from "../../../services/api.js"
import { LIMITE_FIDELIZACAO, META_FIDELIZACAO } from "../../../utils/validacoes.js"
import "./FidelizacaoModal.css"

function servicoDentroDoLimite(servico) {
    const valor = Number(servico?.valor)
    return Number.isFinite(valor) && valor > 0 && valor <= LIMITE_FIDELIZACAO
}

function FidelizacaoModal({ servicos, onclose, onSuccess }) {
    const [selecionados, setSelecionados] = useState(() => (
        new Set(servicos.filter((servico) => servico.elegivel_fidelizacao).map((servico) => servico.id))
    ))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [categoriaFiltro, setCategoriaFiltro] = useState("")

    const iniciais = useMemo(() => (
        new Set(servicos.filter((servico) => servico.elegivel_fidelizacao).map((servico) => servico.id))
    ), [servicos])

    const categorias = useMemo(() => {
        const mapa = new Map()
        servicos.forEach((servico) => {
            if (servico.categoria_id && servico.categoria_nome) {
                mapa.set(String(servico.categoria_id), servico.categoria_nome)
            }
        })
        return [...mapa.entries()]
            .map(([id, nome]) => ({ id, nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
    }, [servicos])

    const servicosVisiveis = useMemo(() => {
        if (!categoriaFiltro) return servicos
        return servicos.filter((servico) => String(servico.categoria_id) === categoriaFiltro)
    }, [servicos, categoriaFiltro])

    const invalidosSelecionados = useMemo(() => (
        servicos.filter((servico) => selecionados.has(servico.id) && !servicoDentroDoLimite(servico))
    ), [servicos, selecionados])

    function alternar(id) {
        const servico = servicos.find((item) => item.id === id)

        if (servico && !selecionados.has(id) && !servicoDentroDoLimite(servico)) {
            setError(`O servico "${servico.nome}" custa mais de ${LIMITE_FIDELIZACAO} MT e nao pode ser elegivel.`)
            return
        }

        setSelecionados((anteriores) => {
            const proximos = new Set(anteriores)
            if (proximos.has(id)) proximos.delete(id)
            else proximos.add(id)
            return proximos
        })
        if (error) setError(null)
    }

    async function guardar() {
        if (saving) return

        if (invalidosSelecionados.length > 0) {
            setError(`Remova da selecao os servicos acima de ${LIMITE_FIDELIZACAO} MT antes de guardar.`)
            return
        }

        setSaving(true)
        setError(null)

        try {
            const alteracoes = servicos.filter((servico) => (
                selecionados.has(servico.id) !== iniciais.has(servico.id)
            ))

            await Promise.all(alteracoes.map((servico) => (
                updateServico(servico.id, { elegivel_fidelizacao: selecionados.has(servico.id) })
            )))

            if (onSuccess) onSuccess()
            onclose()
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onclose}>
            <section className="fidelizacao-modal" onClick={(e) => e.stopPropagation()}>
                <header className="fidelizacao-modal-header">
                    <span className="fidelizacao-modal-icon"><Heart size={21} /></span>
                    <div>
                        <h2>Eleger fidelizacao</h2>
                        <p>Escolha os servicos que contam para o cartao de fidelizacao.</p>
                    </div>
                    <button type="button" className="fidelizacao-modal-close" onClick={onclose} aria-label="Fechar">
                        <X size={20} />
                    </button>
                </header>

                <div className="fidelizacao-modal-body">
                    {error && <div className="error-banner"><span>{error}</span></div>}

                    <div className="fidelizacao-modal-note">
                        <CheckCircle2 size={18} />
                        <span>
                            As marcas sao acumuladas <strong>por cliente</strong>, para ambos os sexos.
                            Cada dia com servico elegivel vale <strong>1 marca</strong>. Ao completar{" "}
                            <strong>{META_FIDELIZACAO} marcas</strong>, o cartao fica completo e o{" "}
                            <strong>6.º servico e gratuito</strong>, ate{" "}
                            <strong>{LIMITE_FIDELIZACAO} MT</strong>. So servicos ate{" "}
                            {LIMITE_FIDELIZACAO} MT podem ser elegiveis.
                        </span>
                    </div>

                    {invalidosSelecionados.length > 0 && (
                        <div className="fidelizacao-modal-alert" role="alert">
                            <AlertCircle size={17} />
                            <span>
                                {invalidosSelecionados.length === 1
                                    ? `"${invalidosSelecionados[0].nome}" esta acima de ${LIMITE_FIDELIZACAO} MT.`
                                    : `${invalidosSelecionados.length} servicos estao acima de ${LIMITE_FIDELIZACAO} MT.`}
                                {" "}Remova-os da selecao para guardar.
                            </span>
                        </div>
                    )}

                    <div className="fidelizacao-modal-filter">
                        <label htmlFor="fidelizacao-categoria">Categoria</label>
                        <select
                            id="fidelizacao-categoria"
                            value={categoriaFiltro}
                            onChange={(e) => setCategoriaFiltro(e.target.value)}
                        >
                            <option value="">Todas as categorias</option>
                            {categorias.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                            ))}
                        </select>
                    </div>

                    {servicos.length === 0 ? (
                        <p className="nm-hint">Ainda nao existem servicos registados.</p>
                    ) : servicosVisiveis.length === 0 ? (
                        <p className="nm-hint">Nao existem servicos nesta categoria.</p>
                    ) : (
                        <div className="fidelizacao-modal-list">
                            {servicosVisiveis.map((servico) => {
                                const marcado = selecionados.has(servico.id)
                                const inativo = servico.estado !== "Ativo"
                                const dentroDoLimite = servicoDentroDoLimite(servico)
                                const invalido = marcado && !dentroDoLimite
                                return (
                                    <label
                                        key={servico.id}
                                        className={`fidelizacao-option ${marcado ? "selected" : ""} ${inativo ? "inactive" : ""} ${invalido ? "invalid" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={marcado}
                                            onChange={() => alternar(servico.id)}
                                            disabled={(!marcado && inativo) || (!marcado && !dentroDoLimite)}
                                        />
                                        <span className="fidelizacao-option-icon"><Scissors size={17} /></span>
                                        <span className="fidelizacao-option-info">
                                            <strong>{servico.nome}</strong>
                                            <span>
                                                {servico.categoria_nome || "Sem categoria"} · {Number(servico.valor).toLocaleString("pt-MZ")} MT
                                                {inativo ? " · Inativo" : ""}
                                            </span>
                                        </span>
                                        <span className={`fidelizacao-option-state ${marcado && dentroDoLimite ? "on" : ""} ${invalido ? "invalid" : ""}`}>
                                            {invalido
                                                ? "Fora do limite"
                                                : !dentroDoLimite
                                                    ? `Acima de ${LIMITE_FIDELIZACAO} MT`
                                                    : marcado
                                                        ? "Elegivel"
                                                        : "Nao"}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>

                <footer className="fidelizacao-modal-footer">
                    <span className="fidelizacao-modal-count">
                        {selecionados.size} de {servicos.length} servicos elegiveis
                    </span>
                    <div>
                        <button type="button" className="fid-btn secondary" onClick={onclose}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="fid-btn primary"
                            onClick={guardar}
                            disabled={saving || invalidosSelecionados.length > 0}
                        >
                            <Save size={16} />
                            {saving ? "A guardar..." : "Guardar selecao"}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    )
}

export default FidelizacaoModal
