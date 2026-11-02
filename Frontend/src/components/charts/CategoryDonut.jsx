import { useState } from "react";
import { Cell, Pie, PieChart, Sector, Tooltip } from "recharts";
import {
    ChartFrame
} from "./ChartKit.jsx";
import {
    CHART_COLORS,
    formatarMoedaGrafico
} from "./chartUtils.js";

function DonutTooltip({ active, payload, total, formatoValor }) {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const item = payload[0];
    const percentual = total > 0 ? (Number(item.value) / total) * 100 : 0;
    const cor = item.payload?.__cor || item.color || "var(--primary)";

    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{item.name}</p>
            <div className="chart-tooltip-row">
                <span className="chart-tooltip-dot" style={{ background: cor }} />
                <span className="chart-tooltip-name">Valor</span>
                <strong className="chart-tooltip-value">{formatoValor(item.value)}</strong>
            </div>
            <span className="chart-tooltip-extra">{percentual.toFixed(0)}% do total</span>
        </div>
    );
}

function CategoryDonut({
    dados = [],
    total,
    altura = 210,
    formatoValor = formatarMoedaGrafico,
    ariaLabel = "Grafico circular por categoria"
}) {
    const [ativo, setAtivo] = useState(null);
    const dadosComCor = dados.map((item, indice) => ({
        ...item,
        __cor: CHART_COLORS[indice % CHART_COLORS.length]
    }));
    const totalCalculado = total ?? dados.reduce((soma, item) => soma + (Number(item.value) || 0), 0);
    const itemAtivo = ativo !== null ? dadosComCor[ativo] : null;
    const percentualAtivo = itemAtivo && totalCalculado > 0
        ? (Number(itemAtivo.value) / totalCalculado) * 100
        : 0;

    function renderSetor(props) {
        const {
            cx,
            cy,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
            fill,
            isActive,
            index
        } = props;
        const realcado = isActive || index === ativo;
        const opacidade = ativo === null || ativo === index ? 1 : 0.42;

        return (
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={realcado ? outerRadius + 5 : outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                fillOpacity={opacidade}
                cornerRadius={5}
                stroke="var(--surface)"
                strokeWidth={2}
            />
        );
    }

    if (dados.length === 0) return null;

    return (
        <div className="chart-donut">
            <div className="chart-donut-visual">
                <ChartFrame height={altura} ariaLabel={ariaLabel}>
                    <PieChart accessibilityLayer>
                        <Tooltip
                            content={(
                                <DonutTooltip
                                    total={totalCalculado}
                                    formatoValor={formatoValor}
                                />
                            )}
                        />
                        <Pie
                            data={dadosComCor}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="63%"
                            outerRadius="90%"
                            paddingAngle={2}
                            cornerRadius={5}
                            stroke="none"
                            shape={renderSetor}
                            onMouseEnter={(_, indice) => setAtivo(indice)}
                            onMouseLeave={() => setAtivo(null)}
                            animationDuration={700}
                            animationEasing="ease-out"
                        >
                            {dadosComCor.map((item) => (
                                <Cell
                                    key={item.name}
                                    fill={item.__cor}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartFrame>

                <div className="chart-donut-center">
                    <span title={itemAtivo ? itemAtivo.name : "Total"}>
                        {itemAtivo ? itemAtivo.name : "Total"}
                    </span>
                    <strong>{formatoValor(itemAtivo ? itemAtivo.value : totalCalculado)}</strong>
                    {itemAtivo && <small>{percentualAtivo.toFixed(0)}% do total</small>}
                </div>
            </div>

            <div className="chart-donut-legend">
                {dadosComCor.map((item, indice) => {
                    const percentual = totalCalculado > 0
                        ? (Number(item.value) / totalCalculado) * 100
                        : 0;

                    return (
                        <button
                            type="button"
                            key={item.name}
                            className={`chart-donut-legend-item ${ativo === indice ? "is-active" : ""}`.trim()}
                            onMouseEnter={() => setAtivo(indice)}
                            onMouseLeave={() => setAtivo(null)}
                            onFocus={() => setAtivo(indice)}
                            onBlur={() => setAtivo(null)}
                            aria-label={`${item.name}: ${formatoValor(item.value)}, ${percentual.toFixed(0)}% do total`}
                        >
                            <span
                                className="chart-donut-dot"
                                style={{ background: item.__cor }}
                                aria-hidden="true"
                            />
                            <span className="chart-donut-name">{item.name}</span>
                            <span className="chart-donut-values">
                                <strong>{formatoValor(item.value)}</strong>
                                <small>{percentual.toFixed(0)}%</small>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default CategoryDonut;
