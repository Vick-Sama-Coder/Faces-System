import { ResponsiveContainer } from "recharts";
import { formatarMoedaGrafico } from "./chartUtils.js";
import "./charts.css";

export function ChartFrame({ children, height = 320, className = "", ariaLabel }) {
    return (
        <div
            className={`chart-frame ${className}`.trim()}
            style={{ "--chart-height": `${height}px` }}
            role="img"
            aria-label={ariaLabel}
        >
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    );
}

export function ChartTooltip({
    active,
    payload,
    label,
    labelFormatter,
    valueFormatter = formatarMoedaGrafico,
    cores,
    mostrarTotal = false,
    totalLabel = "Total"
}) {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const itens = payload.filter((item) => item && item.value !== undefined && item.value !== null);
    if (itens.length === 0) return null;

    const total = itens.reduce((soma, item) => soma + (Number(item.value) || 0), 0);
    const rotulo = labelFormatter ? labelFormatter(label) : label;

    return (
        <div className="chart-tooltip">
            {rotulo !== undefined && rotulo !== null && rotulo !== "" && (
                <p className="chart-tooltip-label">{rotulo}</p>
            )}
            <div className="chart-tooltip-list">
                {itens.map((item, indice) => {
                    const cor = item.payload?.__cor
                        || cores?.[item.dataKey]
                        || item.color
                        || item.stroke
                        || "var(--primary)";
                    return (
                        <div className="chart-tooltip-row" key={`${item.dataKey || item.name || "item"}-${indice}`}>
                            <span className="chart-tooltip-dot" style={{ background: cor }} />
                            <span className="chart-tooltip-name">{item.name}</span>
                            <strong className="chart-tooltip-value">{valueFormatter(item.value)}</strong>
                        </div>
                    );
                })}
            </div>
            {mostrarTotal && itens.length > 1 && (
                <div className="chart-tooltip-total">
                    <span>{totalLabel}</span>
                    <strong>{valueFormatter(total)}</strong>
                </div>
            )}
        </div>
    );
}

export function ChartLegend({ items, ativos, onToggle, className = "" }) {
    return (
        <div className={`chart-legend ${className}`.trim()} role="group" aria-label="Legenda do grafico">
            {items.map((item) => {
                const ativo = !ativos || ativos.includes(item.key);
                const ultimoAtivo = Boolean(ativos && ativos.length === 1 && ativos.includes(item.key));
                const conteudo = (
                    <>
                        <i style={{ background: item.color }} aria-hidden="true" />
                        {item.label}
                    </>
                );

                if (!onToggle) {
                    return (
                        <span className={`chart-legend-item ${ativo ? "" : "is-off"}`.trim()} key={item.key}>
                            {conteudo}
                        </span>
                    );
                }

                return (
                    <button
                        type="button"
                        key={item.key}
                        className={`chart-legend-item ${ativo ? "" : "is-off"}`.trim()}
                        onClick={() => onToggle(item.key)}
                        aria-pressed={ativo}
                        aria-disabled={ultimoAtivo}
                        title={
                            ultimoAtivo
                                ? "Mantenha pelo menos uma serie visivel"
                                : ativo
                                    ? `Ocultar ${item.label}`
                                    : `Mostrar ${item.label}`
                        }
                    >
                        {conteudo}
                    </button>
                );
            })}
        </div>
    );
}
