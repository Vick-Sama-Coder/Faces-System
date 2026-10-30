// Proxy same-origin para a API no Render.
//
// O frontend chama /api/* no dominio do Vercel. Esta funcao reencaminha o
// pedido, incluindo cookies, e devolve todos os Set-Cookie ao browser. Assim a
// sessao continua first-party e nao depende de CORS nem de rewrites externos.

const ALVO = (
    process.env.API_PROXY_TARGET || 'https://faces-system.onrender.com'
).replace(/\/+$/, '');

const TIMEOUT_MS = 115000;

const HEADERS_PEDIDO_IGNORADOS = new Set([
    'connection',
    'content-length',
    'host',
    'transfer-encoding'
]);

const HEADERS_RESPOSTA_IGNORADOS = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'keep-alive',
    'set-cookie',
    'transfer-encoding'
]);

function caminhoDoPedido(req) {
    const url = req.url || '/';
    if (url.startsWith('/api')) return url;
    return `/api${url.startsWith('/') ? '' : '/'}${url}`;
}

async function lerCorpo(req) {
    const metodo = String(req.method || 'GET').toUpperCase();
    if (metodo === 'GET' || metodo === 'HEAD') return undefined;

    const corpo = req.body;
    if (corpo !== undefined) {
        if (Buffer.isBuffer(corpo)) return corpo;
        if (corpo instanceof Uint8Array) return Buffer.from(corpo);
        if (corpo instanceof ArrayBuffer) return Buffer.from(corpo);
        if (typeof corpo === 'string') return Buffer.from(corpo);
        return Buffer.from(JSON.stringify(corpo));
    }

    const partes = [];
    for await (const parte of req) {
        partes.push(Buffer.isBuffer(parte) ? parte : Buffer.from(parte));
    }
    return partes.length ? Buffer.concat(partes) : undefined;
}

function copiarHeadersPedido(req) {
    const headers = {};

    for (const [chave, valor] of Object.entries(req.headers || {})) {
        if (valor === undefined || HEADERS_PEDIDO_IGNORADOS.has(chave)) continue;
        headers[chave] = Array.isArray(valor) ? valor.join(', ') : valor;
    }

    return headers;
}

async function encaminhar(req, res) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const metodo = String(req.method || 'GET').toUpperCase();
        const corpo = await lerCorpo(req);
        const headers = copiarHeadersPedido(req);

        // O fetch negocia e descomprime a resposta; enviamos o corpo em bruto
        // ao browser sem o Content-Encoding original.
        delete headers['accept-encoding'];

        const resposta = await fetch(`${ALVO}${caminhoDoPedido(req)}`, {
            method: metodo,
            headers,
            body: corpo,
            redirect: 'manual',
            signal: controller.signal
        });

        res.statusCode = resposta.status;

        for (const [chave, valor] of resposta.headers) {
            if (HEADERS_RESPOSTA_IGNORADOS.has(chave)) continue;
            try {
                res.setHeader(chave, valor);
            } catch {
                // Cabecalhos nao representaveis sao simplesmente omitidos.
            }
        }

        const cookies = typeof resposta.headers.getSetCookie === 'function'
            ? resposta.headers.getSetCookie()
            : [];

        if (cookies.length > 0) {
            res.setHeader('set-cookie', cookies);
        }

        res.setHeader('Cache-Control', 'no-store');

        if (metodo === 'HEAD' || resposta.status === 204 || resposta.status === 304) {
            res.end();
            return;
        }

        const dados = Buffer.from(await resposta.arrayBuffer());
        res.end(dados.length ? dados : undefined);
    } finally {
        clearTimeout(temporizador);
    }
}

export default async function handler(req, res) {
    try {
        await encaminhar(req, res);
    } catch (erro) {
        console.error('[api-proxy] Falha ao contactar a API:', erro?.message || erro);

        if (res.headersSent) {
            res.end();
            return;
        }

        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
            message: 'O servidor esta temporariamente indisponivel. Tente novamente.'
        }));
    }
}
