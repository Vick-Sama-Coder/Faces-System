import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    ChartFrame,
    ChartLegend,
    ChartTooltip
} from "./ChartKit.jsx";
import { formatarValorEixo, useChartId } from "./chartUtils.js";

const SERIES = [
    { key: "entradas", label: "Entradas", cor: "var(--success)" },
    { key: "saidas", label: "Saidas", cor: "var(--danger)" },
    { key: "levantamentos", label: "Levantamentos", cor: "var(--warning)" }
];

function CashFlowChart({ dados = [], altura = 320, ariaLabel = "Grafico de fluxo de caixa" }) {
    const id = useChartId("caixa");
    const [ativos, setAtivos] = useState(SERIES.map((serie) => serie.key));

    function alternarSerie(chave) {
        setAtivos((atuais) => {
            if (!atuais.includes(chave)) return [...atuais, chave];
            return atuais.length === 1 ? atuais : atuais.filter((item) => item !== chave);
        });
    }

    return (
        <div className="chart-with-legend">
            <ChartFrame height={altura} ariaLabel={ariaLabel}>
                <BarChart
                    data={dados}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                    barGap={4}
                    barCategoryGap="24%"
                    accessibilityLayer
                >
                    <defs>
                        {SERIES.map((serie) => (
                            <linearGradient
                                key={serie.key}
                                id={`${id}-${serie.key}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={serie.cor} stopOpacity={0.98} />
                                <stop offset="100%" stopColor={serie.cor} stopOpacity={0.58} />
                            </linearGradient>
                        ))}
                    </defs>

                    <CartesianGrid
                        strokeDasharray="4 7"
                        vertical={false}
                        stroke="var(--border-subtle)"
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={11}
                        minTickGap={18}
                    />
                    <YAxis
                        tickFormatter={formatarValorEixo}
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                    />
                    <Tooltip
                        content={(
                            <ChartTooltip
                                cores={{
                                    entradas: "var(--success)",
                                    saidas: "var(--danger)",
                                    levantamentos: "var(--warning)"
                                }}
                                mostrarTotal={false}
                            />
                        )}
                        cursor={{ fill: "var(--surface-tint)", fillOpacity: 0.6 }}
                    />

                    {SERIES.filter((serie) => ativos.includes(serie.key)).map((serie) => (
                        <Bar
                            key={serie.key}
                            dataKey={serie.key}
                            name={serie.label}
                            fill={`url(#${id}-${serie.key})`}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={26}
                            animationDuration={650}
                            animationEasing="ease-out"
                        />
                    ))}
                </BarChart>
            </ChartFrame>

            <ChartLegend
                items={SERIES.map((serie) => ({
                    key: serie.key,
                    label: serie.label,
                    color: serie.cor
                }))}
                ativos={ativos}
                onToggle={alternarSerie}
            />
        </div>
    );
}

export default CashFlowChart;
