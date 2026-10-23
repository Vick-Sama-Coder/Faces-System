import { Heart, Gift, Sparkles } from "lucide-react"
import "./FidelizacaoCard.css"

function FidelizacaoCard({ fidelizacao, loading = false, compact = false, title = "Cartao de fidelizacao" }) {
    const meta = Number(fidelizacao?.meta) || 5
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
                    <span className="fidelizacao-beneficio" title="Beneficios disponiveis">
                        <Gift size={15} /> {beneficios}
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
                            ? `Tem ${beneficios} beneficio${beneficios > 1 ? "s" : ""} disponivel${beneficios > 1 ? "eis" : ""} para utilizar no proximo corte.`
                            : `Faltam ${Math.max(meta - marcas, 0)} marca${meta - marcas === 1 ? "" : "s"} para ganhar um corte gratuito.`
                        : "O cartao e criado automaticamente no primeiro servico elegivel para fidelizacao."}
                </p>
            )}
        </section>
    )
}

export default FidelizacaoCard
