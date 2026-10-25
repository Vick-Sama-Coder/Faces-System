import { Heart, Gift, Sparkles } from "lucide-react"
import { LIMITE_FIDELIZACAO, META_FIDELIZACAO } from "../../utils/validacoes.js"
import "./FidelizacaoCard.css"

function FidelizacaoCard({
    fidelizacao,
    loading = false,
    compact = false,
    title = "Cartao de fidelizacao",
    emptyHint = "O cartao e criado automaticamente no primeiro servico elegivel para fidelizacao."
}) {
    const meta = Number(fidelizacao?.meta) || META_FIDELIZACAO
    const limite = Number(fidelizacao?.limite_beneficio) || LIMITE_FIDELIZACAO
    const marcas = Number(fidelizacao?.marcas_no_ciclo) || 0
    const beneficios = Number(fidelizacao?.beneficios_disponiveis) || 0
    const temCartao = !!fidelizacao?.cartao

    return (
        <section className={`fidelizacao-card ${compact ? "compact" : ""}`}>
            <header className="fidelizacao-card-header">
                <span className="fidelizacao-card-icon"><Heart size={18} /></span>
                <div>
                    <strong>{title}</strong>
                    <span>
                        {loading
                            ? "A carregar progresso..."
                            : temCartao
                                ? `Ciclo ${fidelizacao.ciclo_atual} · ${marcas} de ${meta} marcas`
                                : "Ainda sem cartao ativo"}
                    </span>
                </div>
                {beneficios > 0 && (
                    <span className="fidelizacao-beneficio" title="O 6.º serviço é gratuito">
                        <Gift size={15} /> 6.º grátis
                    </span>
                )}
            </header>

            <div className="fidelizacao-marks" aria-label={`${marcas} de ${meta} marcas`}>
                {Array.from({ length: meta }).map((_, index) => (
                    <span
                        key={index}
                        className={`fidelizacao-mark ${index < marcas ? "filled" : ""}`}
                        title={index < marcas ? "Marca concluida" : "Marca por concluir"}
                    >
                        <Sparkles size={16} />
                    </span>
                ))}
            </div>

            {!compact && (
                <p className="fidelizacao-hint">
                    {temCartao
                        ? beneficios > 0
                            ? `Cartão completo: o 6.º serviço é gratuito até ${limite.toLocaleString("pt-MZ")} MT. Ao utilizá-lo, o cartão reinicia em 0/${meta}.`
                            : `Faltam ${Math.max(meta - marcas, 0)} marca${meta - marcas === 1 ? "" : "s"} para o 6.º serviço ser gratuito até ${limite.toLocaleString("pt-MZ")} MT.`
                        : emptyHint}
                </p>
            )}
        </section>
    )
}

export default FidelizacaoCard
