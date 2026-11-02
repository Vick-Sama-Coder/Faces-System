import { useId } from "react";

export const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--chart-7)"
];

export function useChartId(prefixo = "chart") {
    return `${prefixo}-${useId().replace(/:/g, "")}`;
}

export function formatarMoedaGrafico(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ", { maximumFractionDigits: 0 })} MT`;
}

export function formatarValorEixo(valor) {
    const numero = Number(valor) || 0;
    const absoluto = Math.abs(numero);

    if (absoluto >= 1000000) {
        return `${(numero / 1000000).toLocaleString("pt-MZ", { maximumFractionDigits: 1 })}M`;
    }

    if (absoluto >= 1000) {
        return `${(numero / 1000).toLocaleString("pt-MZ", { maximumFractionDigits: 0 })}k`;
    }

    return numero.toLocaleString("pt-MZ", { maximumFractionDigits: 0 });
}

export function formatarValorCompacto(valor) {
    const numero = Number(valor) || 0;
    const absoluto = Math.abs(numero);

    if (absoluto >= 1000000) {
        return `${(numero / 1000000).toLocaleString("pt-MZ", { maximumFractionDigits: 1 })}M MT`;
    }

    if (absoluto >= 1000) {
        return `${(numero / 1000).toLocaleString("pt-MZ", { maximumFractionDigits: 0 })}k MT`;
    }

    return `${numero.toLocaleString("pt-MZ")} MT`;
}
