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
let prefetchEmCurso = false;
let ultimoPrefetch = 0;
let sessaoPrefetch = null;

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

async function comLimite(tarefas, limite = 5) {
    const resultados = [];
    let indice = 0;

    async function trabalhar() {
        while (indice < tarefas.length) {
            const atual = indice;
            indice += 1;
            resultados.push(await tarefas[atual]().catch(() => null));
        }
    }

    const trabalhadores = Array.from(
        { length: Math.min(limite, tarefas.length) },
        () => trabalhar()
    );
    await Promise.all(trabalhadores);
    return resultados;
}

function temPermissao(user, ...codigos) {
    if (!user?.permissoes) return false;
    return codigos.some((codigo) => user.permissoes.includes(codigo));
}

export async function prefetchOfflineData(user) {
    if (!user?.id || estaOffline() || prefetchEmCurso) return;
    if (sessaoPrefetch === user.id && Date.now() - ultimoPrefetch < INTERVALO_PREFETCH_MS) return;

    prefetchEmCurso = true;
    sessaoPrefetch = user.id;
    ultimoPrefetch = Date.now();

    const mes = paramsMesAtual();

    try {
        const tarefasBase = [
            () => getMe(),
            () => getCategorias(),
            () => getServicos(),
            () => getServicos({ estado: 'todos' }),
            () => getClientes(),
            () => getFuncionarios(),
            () => getCategoriasDespesa(),
            () => getDespesas({}),
            () => getDespesas({ estado: 'Ativo' }),
            () => getAtendimentos(),
            () => getDashboard(),
            () => getMovimentosEstoque({})
        ];

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

        await comLimite(tarefasBase, 4);

        // Dados de detalhe usados pelos modais. Sao pedidos depois do essencial
        // para nao atrasar a abertura da app.
        const servicos = await getServicos({ estado: 'todos' }).then((res) => (
            Array.isArray(res.data) ? res.data : []
        )).catch(() => []);

        const funcionarios = await getFuncionarios().then((res) => (
            Array.isArray(res.data) ? res.data : []
        )).catch(() => []);

        const clientes = await getClientes().then((res) => (
            Array.isArray(res.data) ? res.data : []
        )).catch(() => []);

        const atendimentos = await getAtendimentos().then((res) => {
            if (Array.isArray(res.data)) return res.data;
            return Array.isArray(res.data?.atendimentos) ? res.data.atendimentos : [];
        }).catch(() => []);

        const tarefasDetalhe = [];

        for (const servico of servicos.slice(0, 80)) {
            tarefasDetalhe.push(() => getServicoModalidades(servico.id));
            tarefasDetalhe.push(() => getServicoAplicacoes(servico.id));
        }

        for (const funcionario of funcionarios.slice(0, 80)) {
            tarefasDetalhe.push(() => getHorariosFuncionario(funcionario.id));
        }

        for (const cliente of clientes.slice(0, 200)) {
            tarefasDetalhe.push(() => getFidelizacao(cliente.id));
        }

        for (const atendimento of atendimentos.slice(0, 40)) {
            if (Number(atendimento.valor_pago || 0) > 0) {
                tarefasDetalhe.push(() => getPagamentoAtendimento(atendimento.id));
            }
        }

        await comLimite(tarefasDetalhe, 3);
    } finally {
        prefetchEmCurso = false;
    }
}
