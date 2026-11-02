import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    ChartFrame,
    ChartTooltip
} from "./ChartKit.jsx";
import {
    CHART_COLORS,
    formatarMoedaGrafico,
    formatarValorCompacto,
    formatarValorEixo,
    useChartId
} from "./chartUtils.js";

function TickCategoria({ x, y, payload, limite = 19 }) {
    const texto = String(payload?.value ?? "");
    const curto = texto.length > limite ? `${texto.slice(0, limite - 1)}...` : texto;

    return (
        <text
            x={x}
            y={y}
            dy={3}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize={11}
            fontWeight={500}
        >
            <title>{texto}</title>
            {curto}
        </text>
    );
}

function RankingBarChart({
    dados = [],
    nomeChave,
    valorChave,
    nomeValor = "Valor",
    cores = CHART_COLORS,
    colorirPor,
    altura,
    limiteNome = 19,
    larguraCategoria = 132,
    formatoValor = formatarMoedaGrafico,
    ariaLabel = "Grafico de barras horizontais"
}) {
    const id = useChartId("ranking");
    const dadosComCor = dados.map((item, indice) => ({
        ...item,
        __cor: item.cor || (colorirPor ? colorirPor(item, indice) : cores[indice % cores.length])
    }));
    const alturaCalculada = altura || Math.max(210, Math.min(420, dados.length * 41 + 26));

    return (
        <ChartFrame height={alturaCalculada} ariaLabel={ariaLabel}>
            <BarChart
                data={dadosComCor}
                layout="vertical"
                margin={{ top: 2, right: 62, bottom: 2, left: 0 }}
                barCategoryGap="30%"
                accessibilityLayer
            >
                <defs>
                    {dadosComCor.map((item, indice) => (
                        <linearGradient
                            key={`${item[nomeChave]}-${indice}`}
                            id={`${id}-${indice}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                        >
                            <stop offset="0%" stopColor={item.__cor} stopOpacity={0.62} />
                            <stop offset="100%" stopColor={item.__cor} stopOpacity={1} />
                        </linearGradient>
                    ))}
                </defs>

                <CartesianGrid
                    strokeDasharray="4 7"
                    horizontal={false}
                    stroke="var(--border-subtle)"
                />
                <XAxis
                    type="number"
                    tickFormatter={formatarValorEixo}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    domain={[0, "auto"]}
                />
                <YAxis
                    type="category"
                    dataKey={nomeChave}
                    width={larguraCategoria}
                    axisLine={false}
                    tickLine={false}
                    tick={<TickCategoria limite={limiteNome} />}
                />
                <Tooltip
                    content={<ChartTooltip valueFormatter={formatoValor} mostrarTotal={false} />}
                    cursor={{ fill: "var(--surface-tint)", fillOpacity: 0.6 }}
                />

                <Bar
                    dataKey={valorChave}
                    name={nomeValor}
                    radius={[0, 7, 7, 0]}
                    maxBarSize={22}
                    animationDuration={650}
                    animationEasing="ease-out"
                >
                    {dadosComCor.map((item, indice) => (
                        <Cell
                            key={`${item[nomeChave]}-${indice}`}
                            fill={`url(#${id}-${indice})`}
                        />
                    ))}
                    <LabelList
                        dataKey={valorChave}
                        position="right"
                        formatter={formatarValorCompacto}
                        className="chart-value-label"
                        style={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                    />
                </Bar>
            </BarChart>
        </ChartFrame>
    );
}

export default RankingBarChart;
