import db from '../db/client.js';
import Agendamento from '../repository/agendamento.js';
import Atendimento from '../repository/atendimento.js';
import Servico from '../repository/servico.js';
import Comissao from '../repository/comissao.js';
import Caixa from '../repository/caixa.js';
import FidelizacaoService from './fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { METODOS_PAGAMENTO } from './caixa.js';
import { criarErro } from '../utils/erro.js';
import { servicoContaParaFidelizacao } from '../utils/validacoes.js';

const TIPOS_SERVICO = ['Servico', 'Aplicacao'];

function validarQuantidade(valor, campo) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < 1 || numero > 100) {
        throw criarErro(400, `${campo} deve ser um numero inteiro entre 1 e 100`);
    }

    return numero;
}

function validarPrecoUnitario(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        throw criarErro(400, 'O preco unitario deve ser um valor maior que zero');
    }
    if (!Number.isInteger(numero)) {
        throw criarErro(400, 'O preco unitario deve ser um valor inteiro em meticais');
    }

    return numero;
}

// Cria o cabecalho e as linhas do agendamento. Nao ha desconto de pacote: o
// valor total e a soma exata dos precos acordados por unidade.
const criar = async ({ cliente_id, servicos, observacoes, registado_por }) => {
    if (!cliente_id) {
        throw criarErro(400, 'O cliente e obrigatorio');
    }
    if (!Array.isArray(servicos) || servicos.length === 0) {
        throw criarErro(400, 'O agendamento exige pelo menos um servico');
    }

    const validados = [];

    for (const item of servicos) {
        if (!item.servico_id) {
            throw criarErro(400, 'Cada servico exige servico_id');
        }

        const servico = await Servico.findById(item.servico_id);
        if (!servico) {
            throw criarErro(400, 'Servico nao encontrado');
        }
        if (servico.estado !== 'Ativo') {
            throw criarErro(409, `O servico "${servico.nome}" esta inativo`);
        }

        const tipo_servico = item.tipo_servico ?? servico.tipo_servico ?? 'Servico';
        if (!TIPOS_SERVICO.includes(tipo_servico)) {
            throw criarErro(400, 'O tipo de servico deve ser Servico ou Aplicacao');
        }

        validados.push({
            servico,
            servico_id: servico.id,
            modalidade_id: item.modalidade_id ?? null,
            modalidade_nome: item.modalidade_nome ?? null,
            tipo_servico,
            preco_unitario: validarPrecoUnitario(item.preco_unitario ?? item.preco_praticado),
            quantidade: validarQuantidade(item.quantidade ?? 1, 'A quantidade')
        });
    }

    const valor_total = validados.reduce(
        (total, item) => total + item.preco_unitario * item.quantidade,
        0
    );

    const nota = observacoes ? String(observacoes).trim().slice(0, 255) : null;

    return db.transaction(async (tx) => {
        const agendamento_id = await Agendamento.insertHeader(tx, {
            cliente_id,
            valor_total,
            observacoes: nota || null,
            registado_por
        });

        for (const item of validados) {
            await Agendamento.insertServico(tx, {
                agendamento_id,
                cliente_id,
                servico_id: item.servico_id,
                modalidade_id: item.modalidade_id,
                modalidade_nome: item.modalidade_nome,
                tipo_servico: item.tipo_servico,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                registado_por
            });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: 'agendamento',
            id_registo: agendamento_id,
            operacao: 'criar',
            depois: {
                cliente_id,
                valor_total,
                servicos: validados.map((item) => ({
                    servico_id: item.servico_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario
                }))
            }
        }, tx);

        return agendamento_id;
    });
};

// A fidelizacao e registada na execucao, como nos atendimentos normais.
// Se o cartao ja tem o 6.º servico pendente, o beneficio fica intacto: nao
// faz sentido obrigar a oferecer um servico que o cliente ja pagou no pacote.
async function registarFidelizacao(tx, {
    cliente_id,
    consumos,
    agendamento_id,
    registado_por
}) {
    const { pendentes } = await FidelizacaoService.saldosCartao(tx, cliente_id);

    if (pendentes > 0) {
        return { marca: false, beneficio: false, beneficio_utilizado: false };
    }

    const elegivel = consumos.find((consumo) => servicoContaParaFidelizacao({
        elegivel_fidelizacao: consumo.elegivel_fidelizacao,
        valor: consumo.preco_unitario
    }));

    if (!elegivel) {
        return { marca: false, beneficio: false, beneficio_utilizado: false };
    }

    return FidelizacaoService.registarCorte(tx, {
        cliente_id,
        atendimento_servico_id: elegivel.atendimento_servico_id,
        valor_final: elegivel.preco_unitario,
        registado_por,
        origem: 'atendimento',
        observacao: `Servico pre-pago consumido (agendamento #${agendamento_id})`
    });
}

// Executa uma ou mais unidades do saldo. Cada unidade gera uma linha no
// atendimento com valor zero: a receita ja foi reconhecida no pagamento.
const consumir = async (id, { itens, data_hora, registado_por }) => {
    if (!Array.isArray(itens) || itens.length === 0) {
        throw criarErro(400, 'Selecione pelo menos um servico para consumir');
    }

    const pedidos = itens.map((item) => {
        if (!item.agendamento_servico_id) {
            throw criarErro(400, 'Cada linha exige agendamento_servico_id');
        }
        if (!item.funcionario_id) {
            throw criarErro(400, 'Escolha o funcionario que executou cada servico');
        }

        const tipo = item.tipo_servico;
        if (tipo !== undefined && !TIPOS_SERVICO.includes(tipo)) {
            throw criarErro(400, 'O tipo de servico deve ser Servico ou Aplicacao');
        }

        return {
            agendamento_servico_id: Number(item.agendamento_servico_id),
            quantidade: validarQuantidade(item.quantidade ?? 1, 'A quantidade a consumir'),
            funcionario_id: Number(item.funcionario_id),
            modalidade_id: item.modalidade_id ?? null,
            modalidade_nome: item.modalidade_nome ?? null,
            tipo_servico: tipo
        };
    });

    return db.transaction(async (tx) => {
        await Agendamento.findForUpdate(tx, id);

        const agendamento = await Agendamento.findById(id, tx);
        if (!agendamento) {
            throw criarErro(404, 'Agendamento nao encontrado');
        }
        if (agendamento.estado === 'Anulado') {
            throw criarErro(409, 'Um agendamento anulado nao pode ser consumido');
        }

        const devido = Number(agendamento.valor_devido);
        const pagoLiquido = Number(agendamento.valor_pago) - Number(agendamento.valor_reembolsado);

        if (devido <= 0) {
            throw criarErro(409, 'O agendamento nao tem valor a pagar');
        }
        if (pagoLiquido < devido) {
            throw criarErro(409, 'O agendamento ainda nao esta totalmente pago');
        }

        const linhas = await Agendamento.findServicos(id, tx);
        const porId = new Map(linhas.map((linha) => [String(linha.id), { ...linha }]));

        // Valida tudo antes de criar o atendimento, para uma falha nao deixar
        // linhas soltas nem consumir parcialmente o saldo. Pedidos repetidos
        // para a mesma linha contam cumulativamente.
        const consumidoNoPedido = new Map();

        for (const pedido of pedidos) {
            const chave = String(pedido.agendamento_servico_id);
            const linha = porId.get(chave);

            if (!linha) {
                throw criarErro(404, `Servico do agendamento nao encontrado (${pedido.agendamento_servico_id})`);
            }

            const acumulado = (consumidoNoPedido.get(chave) ?? 0) + pedido.quantidade;

            if (acumulado > Number(linha.quantidade_restante)) {
                throw criarErro(
                    409,
                    `O servico "${linha.servico_nome}" so tem ${linha.quantidade_restante} unidade(s) por consumir`
                );
            }

            consumidoNoPedido.set(chave, acumulado);
        }

        const atendimento_id = await Atendimento.insertHeader(tx, {
            cliente_id: agendamento.cliente_id,
            data_hora,
            valor_bruto: 0,
            valor_desconto: 0,
            valor_total: 0,
            registado_por
        });

        const consumos = [];

        for (const pedido of pedidos) {
            const linha = porId.get(String(pedido.agendamento_servico_id));

            for (let i = 0; i < pedido.quantidade; i++) {
                const atendimento_servico_id = await Atendimento.insertServico(tx, {
                    atendimento_id,
                    cliente_id: agendamento.cliente_id,
                    servico_id: linha.servico_id,
                    servico_principal_id: null,
                    agendamento_servico_id: linha.id,
                    funcionario_id: pedido.funcionario_id,
                    modalidade_id: pedido.modalidade_id ?? linha.modalidade_id,
                    modalidade_nome: pedido.modalidade_nome ?? linha.modalidade_nome,
                    tipo_servico: pedido.tipo_servico ?? linha.tipo_servico,
                    preco_original: 0,
                    tipo_preco: 'Agendamento',
                    valor_desconto: 0,
                    valor_final: 0,
                    registado_por
                });

                consumos.push({
                    atendimento_servico_id,
                    agendamento_servico_id: linha.id,
                    preco_unitario: linha.preco_unitario,
                    elegivel_fidelizacao: linha.elegivel_fidelizacao,
                    servico_nome: linha.servico_nome
                });
            }

            await Agendamento.incrementarConsumo(tx, linha.id, pedido.quantidade);
            linha.quantidade_consumida = Number(linha.quantidade_consumida) + pedido.quantidade;
            linha.quantidade_restante = Number(linha.quantidade_restante) - pedido.quantidade;
        }

        const fidelizacao = await registarFidelizacao(tx, {
            cliente_id: agendamento.cliente_id,
            consumos,
            agendamento_id: id,
            registado_por
        });

        // A comissao e gerada na execucao, usando o preco do agendamento como
        // base (as linhas do atendimento ficam a zero).
        await Comissao.gerarParaAtendimento(tx, atendimento_id);

        const restante = [...porId.values()].reduce(
            (total, linha) => total + Number(linha.quantidade_restante),
            0
        );
        const estado = restante === 0 ? 'Concluido' : 'Aberto';

        if (estado === 'Concluido') {
            await Agendamento.updateEstado(tx, id, { estado });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: 'agendamento',
            id_registo: id,
            operacao: 'consumir',
            depois: {
                atendimento_id,
                estado,
                itens: pedidos.map((pedido) => ({
                    agendamento_servico_id: pedido.agendamento_servico_id,
                    quantidade: pedido.quantidade,
                    funcionario_id: pedido.funcionario_id
                })),
                fidelizacao
            }
        }, tx);

        return {
            atendimento_id,
            agendamento_id: id,
            estado,
            fidelizacao
        };
    });
};

// Cancela unidades ainda por consumir e devolve o valor efetivamente pago por
// elas. O reembolso nunca excede o dinheiro que entrou e ainda nao foi devolvido.
const cancelar = async (id, { itens, motivo, metodo_pagamento, registado_por }) => {
    if (!motivo || !String(motivo).trim()) {
        throw criarErro(400, 'O motivo do cancelamento e obrigatorio');
    }

    const motivoLimpo = String(motivo).trim().slice(0, 255);

    return db.transaction(async (tx) => {
        await Agendamento.findForUpdate(tx, id);

        const agendamento = await Agendamento.findById(id, tx);
        if (!agendamento) {
            throw criarErro(404, 'Agendamento nao encontrado');
        }
        if (agendamento.estado === 'Anulado') {
            throw criarErro(409, 'Este agendamento ja esta anulado');
        }

        const linhas = await Agendamento.findServicos(id, tx);
        const porId = new Map(linhas.map((linha) => [String(linha.id), { ...linha }]));

        // Sem lista explicita, cancela todo o saldo restante.
        const pedidos = (Array.isArray(itens) && itens.length > 0)
            ? itens
            : linhas
                .filter((linha) => Number(linha.quantidade_restante) > 0)
                .map((linha) => ({
                    agendamento_servico_id: linha.id,
                    quantidade: linha.quantidade_restante
                }));

        if (pedidos.length === 0) {
            throw criarErro(409, 'O agendamento nao tem servicos por consumir');
        }

        const agregados = new Map();

        for (const item of pedidos) {
            const chave = String(item.agendamento_servico_id);
            const linha = porId.get(chave);

            if (!linha) {
                throw criarErro(404, `Servico do agendamento nao encontrado (${item.agendamento_servico_id})`);
            }

            const quantidade = validarQuantidade(item.quantidade ?? 1, 'A quantidade a cancelar');
            const acumulada = (agregados.get(chave)?.quantidade ?? 0) + quantidade;

            if (acumulada > Number(linha.quantidade_restante)) {
                throw criarErro(
                    409,
                    `O servico "${linha.servico_nome}" so tem ${linha.quantidade_restante} unidade(s) por cancelar`
                );
            }

            agregados.set(chave, { linha, quantidade: acumulada });
        }

        const valor_cancelado = [...agregados.values()].reduce(
            (total, alvo) => total + alvo.quantidade * Number(alvo.linha.preco_unitario),
            0
        );

        const valorPago = Number(agendamento.valor_pago);
        const valorReembolsado = Number(agendamento.valor_reembolsado);
        const disponivel = Math.max(valorPago - valorReembolsado, 0);
        const valor_reembolsado = Math.min(valor_cancelado, disponivel);

        if (valor_reembolsado > 0) {
            if (!METODOS_PAGAMENTO.includes(metodo_pagamento)) {
                throw criarErro(400, 'Escolha um metodo de pagamento valido para o reembolso');
            }

            const sessao = await Caixa.findSessaoAberta(tx);
            if (!sessao) {
                throw criarErro(409, 'Abra uma sessao de Caixa antes de registar o reembolso');
            }

            const reembolso_id = await Agendamento.insertReembolso(tx, {
                agendamento_id: id,
                valor: valor_reembolsado,
                metodo_pagamento,
                motivo: motivoLimpo,
                registado_por
            });

            await Caixa.inserirMovimento(tx, {
                id_sessao: sessao.id,
                tipo_movimento: 'Saida',
                metodo_pagamento,
                valor: valor_reembolsado,
                descricao: `Reembolso #${reembolso_id} - Agendamento #${id}`,
                origem: 'Reembolso',
                referencia_id: reembolso_id,
                registado_por
            });
        }

        for (const { linha, quantidade } of agregados.values()) {
            await Agendamento.incrementarCancelamento(tx, linha.id, quantidade);
            linha.quantidade_cancelada = Number(linha.quantidade_cancelada) + quantidade;
            linha.quantidade_restante = Number(linha.quantidade_restante) - quantidade;
        }

        const restante = [...porId.values()].reduce(
            (total, linha) => total + Number(linha.quantidade_restante),
            0
        );
        const consumido = [...porId.values()].reduce(
            (total, linha) => total + Number(linha.quantidade_consumida),
            0
        );
        const estado = restante > 0 ? 'Aberto' : consumido > 0 ? 'Concluido' : 'Anulado';

        if (estado === 'Anulado') {
            await Agendamento.updateEstado(tx, id, { estado, motivo_anulacao: motivoLimpo });
        } else {
            await Agendamento.updateEstado(tx, id, { estado });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: 'agendamento',
            id_registo: id,
            operacao: 'cancelar',
            depois: {
                estado,
                motivo: motivoLimpo,
                valor_cancelado,
                valor_reembolsado,
                metodo_pagamento: valor_reembolsado > 0 ? metodo_pagamento : null,
                itens: [...agregados.values()].map(({ linha, quantidade }) => ({
                    agendamento_servico_id: linha.id,
                    quantidade
                }))
            }
        }, tx);

        return {
            agendamento_id: id,
            estado,
            valor_cancelado,
            valor_reembolsado
        };
    });
};

const AgendamentoService = {
    criar,
    consumir,
    cancelar
};

export default AgendamentoService;
