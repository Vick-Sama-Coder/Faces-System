const ONLINE_ONLY = [
    /^api\/auth\/(login|register|primeiro-acesso|alterar-senha|logout)$/,
    /^api\/auth\/me$/,
    // Salarios envolvem dinheiro e aprovacoes: nunca entram na fila local.
    /^api\/salarios(?:\/|$)/,
    /^api\/usuarios(?:\/|$)/,
    // Perfis e permissoes sao configuracao de acesso: nunca ficam em fila.
    /^api\/perfis(?:\/|$)/,
    // O cartao de fidelizacao pode ser consultado offline, mas as alteracoes
    // manuais (marcas/beneficios) dependem do ciclo calculado pelo servidor.
    /^api\/clientes\/-?\d+\/fidelizacao\/(?:marcas|beneficios)(?:\/|$)/
];

let contadorTemporario = 0;

export function normalizarCaminho(url) {
    if (!url) return '';

    let caminho = String(url);
    if (/^https?:\/\//i.test(caminho)) {
        try {
            caminho = new URL(caminho).pathname;
        } catch {
            // Mantem o valor original; o pedido falhara normalmente.
        }
    }

    caminho = caminho.split('?')[0].split('#')[0].replace(/^\/+/, '').replace(/\/+$/, '');
    if (!caminho.startsWith('api/')) caminho = `api/${caminho}`;
    return caminho;
}

export function metodoComEscrita(method) {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

export function parseCorpo(data) {
    if (data === null || data === undefined || data === '') return null;
    if (typeof data !== 'string') return data;

    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
}

export function gerarChaveIdempotencia() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `faces-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function gerarIdTemporario() {
    contadorTemporario = (contadorTemporario + 1) % 1000;
    return -(Math.floor(Date.now() * 1000) + contadorTemporario);
}

export function endpointSomenteOnline(caminho, corpo) {
    const path = normalizarCaminho(caminho);
    if (ONLINE_ONLY.some((regex) => regex.test(path))) return true;

    // Criar/alterar utilizadores pode transportar senhas em texto simples.
    // Nunca colocamos esses dados numa fila local.
    if (path.startsWith('api/usuarios') && corpo && typeof corpo === 'object' && corpo.senha) {
        return true;
    }

    return false;
}

export function obterOperacao(method, caminho) {
    const verbo = String(method || '').toUpperCase();
    const path = normalizarCaminho(caminho);

    if (verbo === 'DELETE') return 'delete';
    if (verbo === 'PUT' || verbo === 'PATCH') {
        return /(?:estado|concluir|aprovar|pagar|dia)$/.test(path) ? 'action' : 'update';
    }
    if (verbo === 'POST') {
        if (/^api\/atendimentos\/-?\d+\/(?:servicos|pagamentos|descontos|anular)$/.test(path)) return 'action';
        if (/\/(?:marcas|beneficios\/utilizar)$/.test(path)) return 'action';
        return 'create';
    }
    return 'update';
}

export function obterIdAlvo(caminho) {
    const partes = normalizarCaminho(caminho).split('/');
    for (let i = partes.length - 1; i >= 0; i -= 1) {
        if (/^-?\d+$/.test(partes[i])) return Number(partes[i]);
    }
    return null;
}

export function obterPaiId(caminho) {
    const partes = normalizarCaminho(caminho).split('/');
    for (let i = 0; i < partes.length; i += 1) {
        if (/^-?\d+$/.test(partes[i])) return Number(partes[i]);
    }
    return null;
}

export function obterRecurso(caminho) {
    const partes = normalizarCaminho(caminho).split('/').filter(Boolean);
    if (partes[0] !== 'api') return 'api';

    const recurso = partes[1] || '';
    if (recurso === 'public') return 'public';
    if (recurso === 'auth') return 'auth';
    if (recurso === 'categorias-despesa') return 'categorias-despesa';
    if (recurso === 'salarios') return 'salarios';
    if (['stock', 'estoque', 'movimentos', 'entrada', 'saida', 'ajuste'].includes(recurso)) return 'estoque';
    if (recurso === 'clientes' && partes.includes('fidelizacao')) return 'fidelizacao';
    if (recurso === 'horarios') return 'horarios';
    if (recurso === 'assiduidade') return 'assiduidade';
    if (recurso === 'relatorios') return 'relatorios';
    if (recurso === 'dashboard') return 'dashboard';
    if (recurso === 'caixa') return 'caixa';
    if (recurso === 'auditoria') return 'auditoria';
    if (recurso === 'usuarios') return 'usuarios';
    if (recurso === 'perfis' || recurso === 'permissoes') return 'perfis';
    return recurso;
}

export function recursosParaInvalidar(recurso) {
    const agregados = new Set();

    if (['atendimentos', 'pagamentos', 'despesas', 'estoque', 'caixa', 'salarios', 'fidelizacao'].includes(recurso)) {
        agregados.add('dashboard');
        agregados.add('relatorios');
        agregados.add('caixa');
    }

    if (recurso === 'clientes' || recurso === 'servicos' || recurso === 'funcionarios') {
        agregados.add('dashboard');
    }

    return agregados;
}

export function entidadeOtimista(config, tempId) {
    const corpo = parseCorpo(config.data) || {};
    const caminho = normalizarCaminho(config.url);
    const paiId = obterPaiId(caminho);
    const base = {
        ...corpo,
        id: tempId,
        __offline: true
    };

    if (caminho === 'api/atendimentos') {
        const servicos = Array.isArray(corpo.servicos)
            ? corpo.servicos.map((servico) => {
                const preco = Number(servico.preco_praticado) || 0;
                // O servidor converte o beneficio de fidelizacao em desconto
                // igual ao preco da linha (valor final 0). O otimista tem de
                // fazer o mesmo para o total offline nao ficar inflacionado.
                const desconto = servico.usar_beneficio_fidelizacao
                    ? preco
                    : Number(servico.desconto || 0);

                return {
                    ...servico,
                    id: gerarIdTemporario(),
                    atendimento_id: tempId,
                    preco_original: preco,
                    valor_desconto: desconto,
                    valor_final: Math.max(preco - desconto, 0),
                    estado: 'Ativo',
                    tipo_servico: servico.tipo_servico || 'Servico'
                };
            })
            : [];
        const valorTotal = servicos.reduce((total, servico) => total + Number(servico.valor_final || 0), 0);

        return {
            ...base,
            servicos,
            valor_total: valorTotal,
            valor_pago: 0,
            estado: 'Em andamento',
            data_hora: new Date().toISOString(),
            metodos_pagamento: null
        };
    }

    if (caminho === 'api/clientes') {
        return { ...base, estado: 'Ativo', saldo: 0 };
    }

    if (caminho === 'api/servicos') {
        return {
            ...base,
            estado: 'Ativo',
            tipo_servico: corpo.tipo_servico || 'Servico',
            faixa_etaria: corpo.faixa_etaria || 'Geral',
            elegivel_fidelizacao: true
        };
    }

    if (caminho === 'api/funcionarios') {
        return { ...base, estado: 'Ativo' };
    }

    if (caminho === 'api/despesas') {
        return { ...base, estado: 'Pendente' };
    }

    if (caminho === 'api/categorias' || caminho === 'api/categorias-despesa') {
        return base;
    }

    if (/^api\/servicos\/-?\d+\/modalidades$/.test(caminho)) {
        return { ...base, servico_id: paiId };
    }

    if (/^api\/servicos\/-?\d+\/aplicacoes$/.test(caminho)) {
        return { ...base, servico_id: paiId, aplicacao_id: corpo.aplicacao_id };
    }

    if (/^api\/funcionarios\/-?\d+\/horarios$/.test(caminho)) {
        return { ...base, funcionario_id: paiId };
    }

    if (/^api\/(?:estoque\/)?(?:entrada|saida|ajuste)$/.test(caminho)) {
        const tipo = caminho.endsWith('/entrada')
            ? 'Entrada'
            : caminho.endsWith('/saida')
                ? 'Saida'
                : 'Ajuste';

        return {
            ...base,
            tipo,
            tipo_movimento: tipo,
            data_movimento: new Date().toISOString().slice(0, 10)
        };
    }

    return base;
}

export function respostaOtimista(config, tempId, operacao) {
    const caminho = normalizarCaminho(config.url);
    const idAlvo = obterIdAlvo(caminho);

    if (operacao === 'create') {
        return entidadeOtimista(config, tempId);
    }

    if (operacao === 'delete') {
        return {
            id: idAlvo,
            message: 'Eliminado localmente. A alteracao sera sincronizada.',
            __offline: true
        };
    }

    const corpo = parseCorpo(config.data) || {};

    if (/^api\/atendimentos\/-?\d+\/concluir$/.test(caminho)) {
        return {
            ...corpo,
            id: idAlvo,
            estado: 'Concluido',
            __offline: true
        };
    }

    if (/^api\/atendimentos\/-?\d+\/anular$/.test(caminho)) {
        return {
            ...corpo,
            id: idAlvo,
            estado: 'Anulado',
            __offline: true
        };
    }

    if (/\/pagamentos$/.test(caminho)) {
        const parcelas = Array.isArray(corpo.parcelas) ? corpo.parcelas : [];
        const valor = parcelas.reduce((total, parcela) => total + Number(parcela.valor || 0), 0);

        return {
            ...corpo,
            id: idAlvo,
            valor,
            metodo_pagamento: parcelas[0]?.metodo_pagamento || corpo.metodo_pagamento,
            __offline: true
        };
    }

    if (/^api\/salarios\/processamentos\/-?\d+\/aprovar$/.test(caminho)) {
        return {
            ...corpo,
            id: idAlvo,
            estado: 'Aprovado',
            __offline: true
        };
    }

    if (/^api\/salarios\/processamentos\/-?\d+\/pagar$/.test(caminho)) {
        return {
            ...corpo,
            id: idAlvo,
            estado: 'Pago',
            __offline: true
        };
    }

    return {
        ...corpo,
        id: idAlvo,
        __offline: true
    };
}

function escaparRegex(valor) {
    return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function substituirIds(valor, mapa) {
    if (valor === null || valor === undefined || !mapa) return valor;

    if (typeof valor === 'string') {
        let resultado = valor;

        for (const [antigo, novo] of Object.entries(mapa)) {
            if (resultado === antigo) return novo;
            resultado = resultado.replace(
                new RegExp(`(^|[/?&=:])${escaparRegex(antigo)}(?=$|[/?&=:])`, 'g'),
                `$1${novo}`
            );
        }

        return resultado;
    }

    if (typeof valor === 'number') {
        const substituto = mapa[String(valor)];
        return substituto === undefined ? valor : Number(substituto);
    }

    if (Array.isArray(valor)) {
        return valor.map((item) => substituirIds(item, mapa));
    }

    // Datas e outros objetos nao-plain nao devem ser convertidos em {}.
    if (valor instanceof Date) return valor;

    if (typeof valor === 'object') {
        const resultado = {};
        for (const [chave, conteudo] of Object.entries(valor)) {
            resultado[chave] = substituirIds(conteudo, mapa);
        }
        return resultado;
    }

    return valor;
}

export function aplicarMapaNaConfig(config, mapa) {
    if (!mapa || Object.keys(mapa).length === 0) return;

    if (config.url) config.url = substituirIds(config.url, mapa);
    if (config.params) config.params = substituirIds(config.params, mapa);

    if (typeof config.data === 'string') {
        const corpo = parseCorpo(config.data);
        config.data = typeof corpo === 'object'
            ? JSON.stringify(substituirIds(corpo, mapa))
            : substituirIds(config.data, mapa);
    } else if (config.data && typeof config.data === 'object') {
        config.data = substituirIds(config.data, mapa);
    }
}
