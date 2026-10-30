import pool from '../config/database.js';

const METODOS_COM_ESCRITA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CHAVE_VALIDA = /^[A-Za-z0-9._:-]{8,120}$/;
const PROCESSAMENTO_EXPIRADO_MS = 90 * 1000;
const LIMPEZA_INTERVALO_MS = 60 * 60 * 1000;

let ultimaLimpeza = 0;

function caminhoDoPedido(req) {
    return String(req.originalUrl || req.url || '').split('?')[0].slice(0, 500);
}

async function limparRegistosAntigos() {
    const agora = Date.now();
    if (agora - ultimaLimpeza < LIMPEZA_INTERVALO_MS) return;
    ultimaLimpeza = agora;

    try {
        await pool.query(
            `delete from requisicao_idempotencia
             where criado_em < now() - interval '7 days'`
        );
    } catch (erro) {
        console.error('[idempotencia] Falha ao limpar registos antigos:', erro.message);
    }
}

async function guardarResposta(req, res, statusCode, corpo) {
    if (!req.idempotencyId || res.locals.__idempotenciaGuardada) return;
    res.locals.__idempotenciaGuardada = true;

    try {
        const transitorio = statusCode >= 500
            || [401, 403, 408, 425, 429].includes(statusCode);

        if (transitorio) {
            // Erros de autenticacao/servidor/rede nao sao uma resposta
            // definitiva: permite retry depois de renovar a sessao.
            await pool.query(
                'delete from requisicao_idempotencia where id = $1',
                [req.idempotencyId]
            );
            return;
        }

        await pool.query(
            `update requisicao_idempotencia
             set estado = 'concluida',
                 status_code = $2,
                 resposta = $3::jsonb,
                 id_utilizador = coalesce($4, id_utilizador),
                 atualizado_em = now()
             where id = $1`,
            [
                req.idempotencyId,
                statusCode,
                corpo === undefined ? null : JSON.stringify(corpo),
                req.user?.id ?? null
            ]
        );
    } catch (erro) {
        console.error('[idempotencia] Falha ao guardar resposta:', erro.message);
    }
}

function intercetarResposta(req, res) {
    const jsonOriginal = res.json.bind(res);
    const sendOriginal = res.send.bind(res);

    res.json = (corpo) => {
        if (res.locals.__idempotenciaGuardada) return jsonOriginal(corpo);
        guardarResposta(req, res, res.statusCode, corpo)
            .finally(() => jsonOriginal(corpo));
        return res;
    };

    res.send = (corpo) => {
        if (res.locals.__idempotenciaGuardada) return sendOriginal(corpo);

        // Express chama res.json internamente quando o corpo e um objeto.
        if (corpo !== null && typeof corpo === 'object') {
            return sendOriginal(corpo);
        }

        guardarResposta(req, res, res.statusCode, corpo)
            .finally(() => sendOriginal(corpo));
        return res;
    };
}

async function responderComRespostaGuardada(res, registo) {
    const status = registo.status_code || 200;
    const corpo = registo.resposta;

    if (corpo === null || corpo === undefined) {
        return res.status(status).send();
    }

    return res.status(status).json(corpo);
}

// Middleware global para escritas autenticadas e idempotentes.
// O frontend envia Idempotency-Key em todas as escritas; quando a rede falha,
// a fila offline reenvia exatamente o mesmo pedido e recebe a resposta original
// em vez de criar um duplicado.
export default async function idempotencia(req, res, next) {
    if (!METODOS_COM_ESCRITA.has(req.method)) return next();

    const chave = String(req.get('Idempotency-Key') || '').trim();
    if (!chave) return next();

    if (!CHAVE_VALIDA.test(chave)) {
        return res.status(400).json({
            message: 'Idempotency-Key invalida. Use entre 8 e 120 caracteres alfanumericos.'
        });
    }

    const metodo = req.method;
    const caminho = caminhoDoPedido(req);

    try {
        await limparRegistosAntigos();

        const inserido = await pool.query(
            `insert into requisicao_idempotencia (chave, metodo, caminho, estado)
             values ($1, $2, $3, 'em_processamento')
             on conflict (chave) do nothing
             returning id`,
            [chave, metodo, caminho]
        );

        if (inserido.rows.length > 0) {
            req.idempotencyId = inserido.rows[0].id;
            intercetarResposta(req, res);
            return next();
        }

        const consulta = await pool.query(
            `select id, metodo, caminho, estado, status_code, resposta, atualizado_em
             from requisicao_idempotencia
             where chave = $1`,
            [chave]
        );

        if (consulta.rows.length === 0) {
            // Corrida rara: o registo desapareceu entre o insert e o select.
            return next();
        }

        const registo = consulta.rows[0];

        if (registo.metodo !== metodo || registo.caminho !== caminho) {
            return res.status(409).json({
                message: 'Esta Idempotency-Key ja foi usada numa operacao diferente.'
            });
        }

        if (registo.estado === 'concluida') {
            return responderComRespostaGuardada(res, registo);
        }

        const expirado = Date.now() - new Date(registo.atualizado_em).getTime()
            > PROCESSAMENTO_EXPIRADO_MS;

        if (registo.estado === 'em_processamento' && !expirado) {
            res.set('Retry-After', '3');
            return res.status(409).json({
                message: 'Operacao ainda em processamento. Tente novamente.'
            });
        }

        // O pedido anterior ficou preso (processo reiniciado ou cliente
        // desligado). Volta a adquirir o registo para permitir o retry.
        await pool.query(
            `update requisicao_idempotencia
             set estado = 'em_processamento',
                 status_code = null,
                 resposta = null,
                 atualizado_em = now()
             where id = $1`,
            [registo.id]
        );

        req.idempotencyId = registo.id;
        intercetarResposta(req, res);
        return next();
    } catch (erro) {
        // A idempotencia nunca deve derrubar a operacao principal.
        console.error('[idempotencia] Erro:', erro.message);
        return next();
    }
}
