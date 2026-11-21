// A duracao da sessao e partilhada pelo JWT e pelo cookie. Manter os dois
// alinhados evita que o browser mantenha um cookie que o servidor ja rejeita
// (ou o contrario). Pode ser ajustada por ambiente, com um limite seguro.
export const DIAS_SESSAO = (() => {
    const valor = Number(process.env.SESSION_DAYS);

    if (!Number.isFinite(valor) || valor <= 0) {
        return 10;
    }

    return Math.min(Math.floor(valor), 30);
})();

export const SESSAO_MS = DIAS_SESSAO * 24 * 60 * 60 * 1000;
