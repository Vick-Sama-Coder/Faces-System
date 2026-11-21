// Paginacao opcional e retrocompativel. Sem `limit`/`offset`, a resposta
// continua a ser o array completo. Com os parametros, o servidor corta a
// listagem e devolve os totais nos cabecalhos.
const LIMITE_MAXIMO = 500;
const LIMITE_PADRAO = 100;

export function lerPaginacao(query = {}) {
    const temParametros = query.limit !== undefined || query.offset !== undefined;

    if (!temParametros) {
        return null;
    }

    const limiteBruto = Number(query.limit ?? LIMITE_PADRAO);
    const offsetBruto = Number(query.offset ?? 0);

    const limit = Number.isInteger(limiteBruto) && limiteBruto > 0
        ? Math.min(limiteBruto, LIMITE_MAXIMO)
        : LIMITE_PADRAO;
    const offset = Number.isInteger(offsetBruto) && offsetBruto >= 0 ? offsetBruto : 0;

    return { limit, offset };
}

export default function paginacao(req, res, next) {
    if (req.method !== 'GET') return next();

    const parametros = lerPaginacao(req.query);

    if (!parametros) return next();

    const jsonOriginal = res.json.bind(res);

    res.json = (corpo) => {
        if (!Array.isArray(corpo)) {
            return jsonOriginal(corpo);
        }

        const total = corpo.length;
        const inicio = Math.min(parametros.offset, total);
        const fim = Math.min(inicio + parametros.limit, total);

        res.set('X-Total-Count', String(total));
        res.set('X-Page-Limit', String(parametros.limit));
        res.set('X-Page-Offset', String(parametros.offset));

        return jsonOriginal(corpo.slice(inicio, fim));
    };

    return next();
}
