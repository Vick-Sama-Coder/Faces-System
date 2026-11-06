import { criarErro } from './erro.js';
import { horaParaMinutos } from './validacoes.js';

// Uma falta diaria ocupa o dia inteiro e nao pode conviver com ausencias parciais.
export const TIPOS_FALTA_DIA_INTEIRO = new Set([
    'falta_justificada',
    'falta_injustificada',
    'ausencia',
    'sem_registo'
]);

const LIMITE_MOTIVO = 255;

// Normaliza a lista de ausencias parciais recebida do frontend.
// `undefined` significa "nao alterar"; `null` ou `[]` limpam as ausencias.
// Devolve os intervalos ordenados e com os minutos ja calculados.
export function normalizarAusencias(valor) {
    if (valor === undefined) return null;
    if (valor === null) return [];

    if (!Array.isArray(valor)) {
        throw criarErro(400, "ausencias deve ser uma lista");
    }

    const lista = valor.map((item, indice) => {
        const numero = indice + 1;

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw criarErro(400, `Ausencia ${numero} invalida`);
        }

        const inicioMin = horaParaMinutos(item.hora_inicio);
        const fimMin = horaParaMinutos(item.hora_fim);

        if (inicioMin === null || fimMin === null) {
            throw criarErro(400, `Ausencia ${numero}: indique horas validas (HH:MM)`);
        }
        if (fimMin <= inicioMin) {
            throw criarErro(400, `Ausencia ${numero}: a hora de fim deve ser posterior a hora de inicio`);
        }

        const motivo = item.motivo === undefined || item.motivo === null
            ? null
            : String(item.motivo).trim();

        if (motivo && motivo.length > LIMITE_MOTIVO) {
            throw criarErro(400, `Ausencia ${numero}: o motivo nao pode exceder ${LIMITE_MOTIVO} caracteres`);
        }

        return {
            hora_inicio: String(item.hora_inicio).trim().slice(0, 5),
            hora_fim: String(item.hora_fim).trim().slice(0, 5),
            motivo: motivo || null,
            inicioMin,
            fimMin
        };
    });

    lista.sort((a, b) => a.inicioMin - b.inicioMin);

    for (let indice = 1; indice < lista.length; indice += 1) {
        if (lista[indice].inicioMin < lista[indice - 1].fimMin) {
            throw criarErro(400, "As ausencias parciais nao podem sobrepor-se");
        }
    }

    return lista;
}

// Garante que as ausencias cabem no horario real do dia e que nao ha uma
// falta de dia inteiro marcada ao mesmo tempo.
export function validarAusenciasDoDia(ausencias, horaEntrada, horaSaida, tipoOcorrencia) {
    const lista = Array.isArray(ausencias) ? ausencias : [];
    if (lista.length === 0) return;

    if (TIPOS_FALTA_DIA_INTEIRO.has(tipoOcorrencia)) {
        throw criarErro(400, "Uma falta de dia inteiro nao pode ter ausencias parciais");
    }

    const entradaMin = horaParaMinutos(horaEntrada);
    const saidaMin = horaParaMinutos(horaSaida);

    if (entradaMin === null || saidaMin === null) {
        throw criarErro(400, "Registe a entrada e a saida antes de marcar ausencias");
    }
    if (saidaMin <= entradaMin) {
        throw criarErro(400, "A hora de saida deve ser posterior a hora de entrada");
    }

    lista.forEach((ausencia, indice) => {
        const inicio = ausencia.inicioMin ?? horaParaMinutos(ausencia.hora_inicio);
        const fim = ausencia.fimMin ?? horaParaMinutos(ausencia.hora_fim);

        if (inicio === null || fim === null || inicio < entradaMin || fim > saidaMin) {
            throw criarErro(
                400,
                `A ausencia ${indice + 1} tem de estar dentro do horario de trabalho`
            );
        }
    });
}
