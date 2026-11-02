import {
    Area,
    AreaChart,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    ChartFrame,
    ChartTooltip
} from "./ChartKit.jsx";
import { formatarValorEixo, useChartId } from "./chartUtils.js";

function dataDoMes(mes) {
    if (!mes) return null;
    const [ano, numero] = String(mes).split("-").map(Number);
    if (!ano || !numero) return null;
    return new Date(ano, numero - 1, 1);
}

function rotuloMesCurto(mes) {
    const data = dataDoMes(mes);
    if (!data) return mes;
    const rotulo = data.toLocaleDateString("pt-MZ", { month: "short" }).replace(".", "");
    return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function rotuloMesCompleto(mes) {
    const data = dataDoMes(mes);
    if (!data) return mes;
    const rotulo = data.toLocaleDateString("pt-MZ", { month: "long", year: "numeric" });
    return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function FinanceAreaChart({ dados = [], seriesVisiveis = ["receita", "despesas"], altura = 250 }) {
    const id = useChartId("financeiro");
    const mostrarReceita = seriesVisiveis.includes("receita");
    const mostrarDespesas = seriesVisiveis.includes("despesas");

    return (
        <ChartFrame
            height={altura}
            ariaLabel="Grafico de evolucao da receita e das despesas nos ultimos seis meses"
        >
            <AreaChart
                data={dados}
                margin={{ top: 12, right: 14, left: 0, bottom: 0 }}
                accessibilityLayer
            >
                <defs>
                    <linearGradient id={`${id}-receita`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                        <stop offset="92%" stopColor="var(--chart-1)" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id={`${id}-despesas`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.22} />
                        <stop offset="92%" stopColor="var(--danger)" stopOpacity={0.01} />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    strokeDasharray="4 7"
                    vertical={false}
                    stroke="var(--border-subtle)"
                />
                <XAxis
                    dataKey="mes"
                    tickFormatter={rotuloMesCurto}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                    minTickGap={8}
                />
                <YAxis
                    tickFormatter={formatarValorEixo}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                />
                <Tooltip
                    content={(
                        <ChartTooltip
                            labelFormatter={rotuloMesCompleto}
                            mostrarTotal={false}
                        />
                    )}
                    cursor={{
                        stroke: "var(--border-strong)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4"
                    }}
                />

                {mostrarReceita && (
                    <Area
                        type="monotone"
                        dataKey="receita"
                        name="Receita"
                        stroke="var(--chart-1)"
                        strokeWidth={2.5}
                        fill={`url(#${id}-receita)`}
                        fillOpacity={1}
                        dot={false}
                        activeDot={{
                            r: 4,
                            stroke: "var(--surface)",
                            strokeWidth: 2,
                            fill: "var(--chart-1)"
                        }}
                        animationDuration={700}
                        animationEasing="ease-out"
                    />
                )}
                {mostrarDespesas && (
                    <Area
                        type="monotone"
                        dataKey="despesas"
                        name="Despesas"
                        stroke="var(--danger)"
                        strokeWidth={2.5}
                        fill={`url(#${id}-despesas)`}
                        fillOpacity={1}
                        dot={false}
                        activeDot={{
                            r: 4,
                            stroke: "var(--surface)",
                            strokeWidth: 2,
                            fill: "var(--danger)"
                        }}
                        animationDuration={700}
                        animationEasing="ease-out"
                    />
                )}
            </AreaChart>
        </ChartFrame>
    );
}

export default FinanceAreaChart;
