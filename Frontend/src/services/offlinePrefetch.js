import {
    getAssiduidade,
    getAtendimentos,
    getAuditoria,
    getAuditoriaOpcoes,
    getCategorias,
    getCategoriasDespesa,
    getClientes,
    getDashboard,
    getDespesas,
    getFidelizacao,
    getFuncionarios,
    getHorariosFuncionario,
    getMe,
    getMovimentosEstoque,
    getPagamentoAtendimento,
    getPerfis,
    getPermissoes,
    getProcessamentos,
    getRelatorioAnulacoes,
    getRelatorioAssiduidade,
    getRelatorioCaixa,
    getRelatorioClientes,
    getRelatorioFidelizacao,
    getRelatorioFinanceiro,
    getRelatorioFuncionarios,
    getRelatorioMovimentos,
    getRelatorioResumo,
    getRelatorioServicos,
    getServicoAplicacoes,
    getServicoModalidades,
    getServicos,
    getUsuarios
} from './api.js';

const INTERVALO_PREFETCH_MS = 10 * 60 * 1000;
const PREPARACAO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CHAVE_PREPARACAO = 'faces.offline.preparado';
let ultimoPrefetch = 0;
let sessaoPrefetch = null;
let execucaoAtual = null;

function chavePreparacao(userId) {
    return `${CHAVE_PREPARACAO}:${userId}`;
}

export function lerPreparacaoOffline(userId) {
    if (!userId || typeof window === 'undefined') return null;

    try {
        const dados = JSON.parse(window.localStorage.getItem(chavePreparacao(userId)));
        const preparadoEm = Number(dados?.at);
        if (!Number.isFinite(preparadoEm)) return null;
        if (Date.now() - preparadoEm > PREPARACAO_MAX_AGE_MS) return null;
        return dados;
    } catch {
        return null;
    }
}

export function limparPreparacaoOffline(userId) {
    if (!userId || typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(chavePreparacao(userId));
    } catch {
        // Sem localStorage nao ha metadados para limpar.
    }
}

function guardarPreparacaoOffline(user, resultado) {
    if (!user?.id || typeof window === 'undefined') return;

    const preparacao = {
        userId: String(user.id),
        at: Date.now(),
        sucessos: Number(resultado.sucessos || 0),
        total: Number(resultado.total || 0)
    };

    try {
        window.localStorage.setItem(
            chavePreparacao(user.id),
            JSON.stringify(preparacao)
        );
    } catch {
        // Sem localStorage a preparacao continua valida nesta sessao.
    }

    window.dispatchEvent(new CustomEvent('faces:offline-prepared', {
        detail: preparacao
    }));
}

export function cancelarPrefetchOffline() {
    if (execucaoAtual) {
        execucaoAtual.cancelado = true;
        execucaoAtual = null;
    }

    // Ao cancelar por logout, mudanca de sessao ou perda de rede, a cache pode
    // ter sido limpa. O proximo arranque deve poder voltar a preparar os dados.
    sessaoPrefetch = null;
    ultimoPrefetch = 0;
}

function estaOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function paramsMesAtual() {
    const agora = new Date();
    return {
        de: formatarData(new Date(agora.getFullYear(), agora.getMonth(), 1)),
        ate: formatarData(new Date(agora.getFullYear(), agora.getMonth() + 1, 0))
    };
}

async function comLimite(
    tarefas,
    limite = 5,
    deveContinuar = () => true,
    aoProgresso
) {
    const resultados = [];
    let sucessos = 0;
    let concluidos = 0;
    let indice = 0;

    async function trabalhar() {
        while (indice < tarefas.length && deveContinuar()) {
            const atual = indice;
            indice += 1;

            try {
                resultados.push(await tarefas[atual]());
                sucessos += 1;
            } catch {
                resultados.push(null);
            } finally {
                concluidos += 1;
                try {
                    aoProgresso?.({ concluidos, total: tarefas.length });
                } catch {
                    // O progresso e apenas informativo.
                }
            }
        }
    }

    const trabalhadores = Array.from(
        { length: Math.min(limite, tarefas.length) },
        () => trabalhar()
    );
    await Promise.all(trabalhadores);
    return { resultados, sucessos, concluidos, total: tarefas.length };
}

function temPermissao(user, ...codigos) {
    if (!user?.permissoes) return false;
    return codigos.some((codigo) => user.permissoes.includes(codigo));
}

export async function prefetchOfflineData(user, { force = false, onProgress } = {}) {
    if (!user?.id) {
        return { cancelado: false, sucessos: 0, total: 0, offline: false };
    }

    if (estaOffline()) {
        return { cancelado: false, sucessos: 0, total: 0, offline: true };
    }

    if (execucaoAtual?.sessao === user.id) {
        if (!force) return { cancelado: false, sucessos: 0, total: 0, emCurso: true };
        execucaoAtual.cancelado = true;
        execucaoAtual = null;
    }

    if (!force && sessaoPrefetch === user.id && Date.now() - ultimoPrefetch < INTERVALO_PREFETCH_MS) {
        return { cancelado: false, sucessos: 0, total: 0, recente: true };
    }

    if (execucaoAtual) {
        execucaoAtual.cancelado = true;
    }

    const execucao = { sessao: user.id, cancelado: false };
    execucaoAtual = execucao;
    sessaoPrefetch = user.id;

    const mes = paramsMesAtual();
    const deveContinuar = () => !execucao.cancelado && !estaOffline();
    const reportar = (fase) => (estado) => {
        onProgress?.({ fase, ...estado });
    };
    const podeFuncionarios = temPermissao(
        user,
        'funcionarios:ler',
        'funcionarios:escrever',
        'assiduidade:gerir',
        'salarios:gerir',
        'atendimentos:escrever'
    );

    try {
        const tarefasBase = [
            () => getMe(),
            () => getCategorias(),
            () => getServicos(),
            () => getServicos({ estado: 'todos' }),
            () => getClientes(),
            () => getAtendimentos(),
            () => getDashboard()
        ];

        if (podeFuncionarios) {
            tarefasBase.push(() => getFuncionarios());
        }

        if (temPermissao(user, 'despesas:escrever', 'relatorios:ler')) {
            tarefasBase.push(() => getDespesas({}));
            tarefasBase.push(() => getDespesas({ estado: 'Ativo' }));
        }

        if (temPermissao(user, 'despesas:escrever')) {
            tarefasBase.push(() => getCategoriasDespesa());
            tarefasBase.push(() => getMovimentosEstoque({}));
        }

        if (temPermissao(user, 'contas:gerir')) {
            tarefasBase.push(() => getUsuarios());
            tarefasBase.push(() => getPerfis());
            tarefasBase.push(() => getPermissoes());
        }

        if (temPermissao(user, 'auditoria:ler')) {
            tarefasBase.push(() => getAuditoria({}));
            tarefasBase.push(() => getAuditoriaOpcoes());
        }

        if (temPermissao(user, 'salarios:gerir')) {
            tarefasBase.push(() => getProcessamentos({}));
        }

        if (temPermissao(user, 'assiduidade:gerir')) {
            tarefasBase.push(() => getAssiduidade(mes));
        }

        if (temPermissao(user, 'relatorios:ler')) {
            tarefasBase.push(() => getRelatorioResumo(mes));
            tarefasBase.push(() => getRelatorioFinanceiro(mes));
            tarefasBase.push(() => getRelatorioCaixa(mes));
            tarefasBase.push(() => getRelatorioServicos(mes));
            tarefasBase.push(() => getRelatorioFuncionarios(mes));
            tarefasBase.push(() => getRelatorioAssiduidade(mes));
            tarefasBase.push(() => getRelatorioClientes(mes));
            tarefasBase.push(() => getRelatorioFidelizacao(mes));
            tarefasBase.push(() => getRelatorioAnulacoes(mes));
            tarefasBase.push(() => getRelatorioMovimentos(mes));
        }

        const base = await comLimite(
            tarefasBase,
            4,
            deveContinuar,
            reportar('essencial')
        );

        if (!deveContinuar()) {
            return {
                cancelado: true,
                sucessos: base.sucessos,
                total: base.total
            };
        }

        if (base.sucessos === 0) {
            return {
                cancelado: false,
                sucessos: 0,
                total: base.total
            };
        }

        // Dados de detalhe usados pelos modais. Sao pedidos depois do essencial
        // para nao atrasar a abertura da app.
        const servicos = await getServicos({ estado: 'todos' }).then((res) => (
            Array.isArray(res.data) ? res.data : []
        )).catch(() => []);

        if (!deveContinuar()) {
            return {
                cancelado: true,
                sucessos: base.sucessos,
                total: base.total
            };
        }

        const funcionarios = podeFuncionarios
            ? await getFuncionarios().then((res) => (
                Array.isArray(res.data) ? res.data : []
            )).catch(() => [])
            : [];

        if (!deveContinuar()) {
            return {
                cancelado: true,
                sucessos: base.sucessos,
                total: base.total
            };
        }

        const clientes = await getClientes().then((res) => (
            Array.isArray(res.data) ? res.data : []
        )).catch(() => []);

        if (!deveContinuar()) {
            return {
                cancelado: true,
                sucessos: base.sucessos,
                total: base.total
            };
        }

        const atendimentos = await getAtendimentos().then((res) => {
            if (Array.isArray(res.data)) return res.data;
            return Array.isArray(res.data?.atendimentos) ? res.data.atendimentos : [];
        }).catch(() => []);

        if (!deveContinuar()) {
            return {
                cancelado: true,
                sucessos: base.sucessos,
                total: base.total
            };
        }

        const tarefasDetalhe = [];

        for (const servico of servicos.slice(0, 80)) {
            if (!deveContinuar()) break;
            tarefasDetalhe.push(() => getServicoModalidades(servico.id));
            tarefasDetalhe.push(() => getServicoAplicacoes(servico.id));
        }

        for (const funcionario of funcionarios.slice(0, 80)) {
            if (!deveContinuar()) break;
            tarefasDetalhe.push(() => getHorariosFuncionario(funcionario.id));
        }

        for (const cliente of clientes.slice(0, 200)) {
            if (!deveContinuar()) break;
            tarefasDetalhe.push(() => getFidelizacao(cliente.id));
        }

        for (const atendimento of atendimentos.slice(0, 40)) {
            if (!deveContinuar()) break;
            if (Number(atendimento.valor_pago || 0) > 0) {
                tarefasDetalhe.push(() => getPagamentoAtendimento(atendimento.id));
            }
        }

        const detalhe = await comLimite(
            tarefasDetalhe,
            3,
            deveContinuar,
            reportar('detalhe')
        );

        const resultado = {
            cancelado: !deveContinuar(),
            sucessos: base.sucessos + detalhe.sucessos,
            total: base.total + detalhe.total
        };

        if (!resultado.cancelado && resultado.sucessos > 0) {
            ultimoPrefetch = Date.now();
            guardarPreparacaoOffline(user, resultado);
            return { ...resultado, preparado: true };
        }

        return resultado;
    } finally {
        if (execucaoAtual === execucao) {
            execucaoAtual = null;
        }
    }
}
