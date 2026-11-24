import CaixaService, { HORA_ABERTURA_PADRAO } from '../services/caixa.js';
import { logger } from '../utils/logger.js';

// A rotina corre em processo: verifica periodicamente se e preciso fechar a
// sessao do dia anterior (apos a meia-noite) ou abrir a sessao do dia (a partir
// das 08h). O intervalo curto mantem o comportamento previsivel mesmo quando o
// servidor arranca depois da hora marcada.
const INTERVALO_MS = Number(process.env.CAIXA_AUTOMATICO_INTERVALO_MS) || 30_000;
const HORA_ABERTURA = Number(process.env.CAIXA_HORA_ABERTURA ?? HORA_ABERTURA_PADRAO);

let timer = null;
let aExecutar = false;

async function verificar() {
    if (aExecutar) return;

    aExecutar = true;
    try {
        const acao = await CaixaService.executarRotinaAutomatica({ horaAbertura: HORA_ABERTURA });

        if (acao === 'fechar') {
            logger.info('[caixa] Sessao do dia anterior fechada automaticamente.');
        } else if (acao === 'abrir') {
            logger.info('[caixa] Sessao do dia aberta automaticamente.');
        }
    } catch (erro) {
        logger.error('[caixa] Falha na rotina automatica:', erro.message);
    } finally {
        aExecutar = false;
    }
}

export function iniciarAgendadorCaixa() {
    if (timer) return;

    verificar();
    timer = setInterval(verificar, INTERVALO_MS);
    timer.unref?.();

    logger.info(
        `[caixa] Rotina automatica ativa (abertura as ${HORA_ABERTURA}h, verificacao a cada ${INTERVALO_MS / 1000}s).`
    );
}

export function pararAgendadorCaixa() {
    if (timer) clearInterval(timer);
    timer = null;
}
