import { sql } from 'drizzle-orm';
import db from '../db/client.js';
import Atendimento from '../repository/atendimento.js';
import Cliente from '../repository/cliente.js';
import Servico from '../repository/servico.js';
import FidelizacaoService from './fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';
import { LIMITE_FIDELIZACAO, servicoContaParaFidelizacao } from '../utils/validacoes.js';

//o beneficio tem de ser pedido explicitamente e so pode ser usado uma vez por cliente
const usaBeneficio = (item) => item?.usar_beneficio_fidelizacao === true;

const tipoDoItem = (item) => (item?.tipo_servico === 'Aplicacao' ? 'Aplicacao' : 'Servico');

function validarPrecoItem(item) {
    const preco = Number(item.preco_praticado);

    // Aplicacoes podem ser gratuitas; servicos principais continuam a exigir
    // um valor positivo.
    if (!Number.isFinite(preco) || preco < 0 || (preco === 0 && tipoDoItem(item) !== 'Aplicacao')) {
        throw criarErro(400, "O preco praticado deve ser um valor maior que zero");
    }

    return preco;
}

function validarBeneficioServico(servico, item) {
    if (!usaBeneficio(item)) return;

    if (tipoDoItem(item) === 'Aplicacao') {
        throw criarErro(400, "Uma aplicacao nao pode ser usada como servico gratuito de fidelizacao");
    }

    if (!servico.elegivel_fidelizacao) {
        throw criarErro(400, `O servico "${servico.nome}" nao e elegivel para fidelizacao`);
    }

    if (!servicoContaParaFidelizacao(servico)) {
        throw criarErro(
            400,
            `O servico "${servico.nome}" nao pode ser gratuito: o beneficio so se aplica a servicos ate ${LIMITE_FIDELIZACAO} MT`
        );
    }

    const preco = Number(item.preco_praticado);

    if (!Number.isFinite(preco) || preco <= 0) {
        throw criarErro(400, "O servico gratuito tem de ter um preco praticado maior que zero");
    }

    if (preco > LIMITE_FIDELIZACAO) {
        throw criarErro(
            400,
            `O beneficio gratuito so pode ser aplicado a um servico ate ${LIMITE_FIDELIZACAO} MT`
        );
    }
}

function validarUmBeneficioPorCliente(itens) {
    const total = itens.filter(usaBeneficio).length;

    if (total > 1) {
        throw criarErro(409, "So e possivel usar um beneficio gratuito por cliente");
    }
}

function validarSelecaoFidelizacao(itens) {
    const selecionados = itens.filter((item) => item.fidelizacao_selecionada === true);

    if (selecionados.length > 1) {
        throw criarErro(409, "So e possivel escolher um servico para fidelizacao por cliente");
    }

    for (const item of selecionados) {
        if (tipoDoItem(item) === 'Aplicacao') {
            throw criarErro(400, "Uma aplicacao nao pode ser escolhida para fidelizacao");
        }
        if (usaBeneficio(item)) {
            throw criarErro(400, "O servico gratuito nao pode ser escolhido para fidelizacao");
        }
        if (!item.servico.elegivel_fidelizacao) {
            throw criarErro(
                400,
                `O servico "${item.servico.nome}" nao e elegivel para fidelizacao`
            );
        }
    }
}

//os totais derivam das linhas para o cabecalho nunca divergir dos servicos
function somar(itens) {
    return itens.reduce(
        (totais, s) => {
            const preco = Number(s.preco);
            const desconto = usaBeneficio(s) ? preco : Number(s.desconto || 0);

            return {
                bruto: totais.bruto + preco,
                desconto: totais.desconto + desconto,
                total: totais.total + preco - desconto
            };
        },
        { bruto: 0, desconto: 0, total: 0 }
    );
}

//o servico tem de existir e estar ativo para ser selecionado (RN18)
async function validarServicoAtivo(servico_id) {
    const servico = await Servico.findById(servico_id);

    if (!servico) {
        throw criarErro(400, "Servico nao encontrado");
    }
    if (servico.estado !== "Ativo") {
        throw criarErro(409, `O servico "${servico.nome}" esta inativo`);
    }

    return servico;
}

async function validarClienteAtivo(cliente_id) {
    const cliente = await Cliente.findById(cliente_id);

    if (!cliente) {
        throw criarErro(400, "Cliente nao encontrado");
    }
    if (cliente.estado !== "Ativo") {
        throw criarErro(409, `O cliente "${cliente.nome}" esta inativo`);
    }

    return cliente;
}

// Aceita o formato novo ({ clientes: [{ cliente_id, servicos }] }) e o antigo
// ({ cliente_id, servicos }) para manter compatibilidade com clientes da API.
function normalizarClientes({ cliente_id, servicos, clientes }) {
    if (Array.isArray(clientes) && clientes.length > 0) {
        return clientes.map((grupo) => ({
            cliente_id: grupo?.cliente_id,
            servicos: Array.isArray(grupo?.servicos) ? grupo.servicos : []
        }));
    }

    return [{
        cliente_id,
        servicos: Array.isArray(servicos) ? servicos : []
    }];
}

function resolverPrincipalIndex(itens, item, index) {
    if (Number.isInteger(item.servico_principal_index)) {
        if (item.servico_principal_index < 0 || item.servico_principal_index >= itens.length) {
            return null;
        }
        return item.servico_principal_index;
    }

    // Compatibilidade: versoes anteriores enviavam o servico_id do catalogo
    // em servico_principal_id. Resolvemos para a primeira linha principal
    // desse servico no mesmo cliente.
    if (item.servico_principal_id !== undefined && item.servico_principal_id !== null) {
        const encontrado = itens.findIndex((outro, i) => (
            i !== index
            && tipoDoItem(outro) === 'Servico'
            && String(outro.servico_id) === String(item.servico_principal_id)
        ));

        if (encontrado >= 0) return encontrado;
    }

    return null;
}

async function validarAplicacao(item, principal) {
    if (!principal) {
        throw criarErro(400, `A aplicacao "${item.servico.nome}" tem de indicar o servico principal`);
    }
    if (tipoDoItem(principal) !== 'Servico') {
        throw criarErro(400, "Uma aplicacao so pode estar associada a um servico principal");
    }
    if (!principal.servico.permite_aplicacoes) {
        throw criarErro(
            400,
            `O servico "${principal.servico.nome}" nao permite aplicacoes`
        );
    }
    if (item.servico.tipo_servico !== 'Aplicacao') {
        throw criarErro(400, `O servico "${item.servico.nome}" nao e uma aplicacao`);
    }

    const permitida = await Servico.aplicacaoPermitida(principal.servico_id, item.servico_id);

    if (!permitida) {
        throw criarErro(
            400,
            `A aplicacao "${item.servico.nome}" nao esta associada ao servico "${principal.servico.nome}"`
        );
    }
}

// Valida um grupo de servicos de um cliente e devolve as linhas normalizadas.
async function validarServicosDoCliente(grupo) {
    const itens = [];

    for (const raw of grupo.servicos) {
        const servico = await validarServicoAtivo(raw.servico_id);
        const tipo = servico.tipo_servico === 'Aplicacao' ? 'Aplicacao' : 'Servico';
        const item = {
            ...raw,
            tipo_servico: tipo,
            servico
        };

        validarBeneficioServico(servico, item);
        item.preco = validarPrecoItem(item);
        item.desconto = usaBeneficio(item) ? item.preco : Number(item.desconto || 0);
        itens.push(item);
    }

    for (let index = 0; index < itens.length; index++) {
        const item = itens[index];

        if (tipoDoItem(item) !== 'Aplicacao') continue;

        const principalIndex = resolverPrincipalIndex(itens, item, index);
        const principal = principalIndex === null ? null : itens[principalIndex];

        await validarAplicacao(item, principal);
        item.principal_index = principalIndex;

        if (!item.funcionario_id && principal?.funcionario_id) {
            item.funcionario_id = principal.funcionario_id;
        }
    }

    for (const item of itens) {
        if (!item.funcionario_id) {
            throw criarErro(400, `O servico "${item.servico.nome}" exige um funcionario responsavel`);
        }
    }

    validarUmBeneficioPorCliente(itens);
    validarSelecaoFidelizacao(itens);

    return itens;
}

const criar = async ({ cliente_id, servicos, clientes, registado_por }) => {
    const grupos = normalizarClientes({ cliente_id, servicos, clientes });
    const clientesVistos = new Set();
    const gruposValidados = [];

    for (const grupo of grupos) {
        const id = Number(grupo.cliente_id);

        if (!Number.isInteger(id) || id <= 0) {
            throw criarErro(400, "Cada cliente do atendimento exige um cliente_id valido");
        }
        if (clientesVistos.has(id)) {
            throw criarErro(409, "O mesmo cliente nao pode ser adicionado duas vezes ao atendimento");
        }
        if (!Array.isArray(grupo.servicos) || grupo.servicos.length === 0) {
            throw criarErro(400, "Cada cliente do atendimento exige pelo menos um servico");
        }

        clientesVistos.add(id);
        await validarClienteAtivo(id);
        gruposValidados.push({
            cliente_id: id,
            itens: await validarServicosDoCliente(grupo)
        });
    }

    if (gruposValidados.length === 0) {
        throw criarErro(400, "O atendimento exige pelo menos um cliente e um servico");
    }

    const todosItens = gruposValidados.flatMap((grupo) => grupo.itens);
    const totais = somar(todosItens);

    return db.transaction(async (tx) => {
        const atendimento_id = await Atendimento.insertHeader(tx, {
            cliente_id: gruposValidados[0].cliente_id,
            valor_bruto: totais.bruto,
            valor_desconto: totais.desconto,
            valor_total: totais.total,
            registado_por
        });

        for (const grupo of gruposValidados) {
            const ids = new Array(grupo.itens.length).fill(null);

            // Inserir primeiro os servicos principais para que as aplicacoes
            // possam apontar para o id real da linha (servico_principal_id).
            for (let index = 0; index < grupo.itens.length; index++) {
                const item = grupo.itens[index];
                if (tipoDoItem(item) !== 'Servico') continue;

                ids[index] = await Atendimento.insertServico(tx, {
                    atendimento_id,
                    cliente_id: grupo.cliente_id,
                    servico_id: item.servico_id,
                    servico_principal_id: null,
                    funcionario_id: item.funcionario_id,
                    modalidade_id: item.modalidade_id ?? null,
                    modalidade_nome: item.modalidade_nome ?? null,
                    tipo_servico: 'Servico',
                    preco_original: item.preco,
                    tipo_preco: item.tipo_preco,
                    valor_desconto: item.desconto,
                    valor_final: item.preco - item.desconto,
                    fidelizacao_selecionada: item.fidelizacao_selecionada === true,
                    registado_por
                });
            }

            for (let index = 0; index < grupo.itens.length; index++) {
                const item = grupo.itens[index];
                if (tipoDoItem(item) !== 'Aplicacao') continue;

                ids[index] = await Atendimento.insertServico(tx, {
                    atendimento_id,
                    cliente_id: grupo.cliente_id,
                    servico_id: item.servico_id,
                    servico_principal_id: ids[item.principal_index],
                    funcionario_id: item.funcionario_id,
                    modalidade_id: item.modalidade_id ?? null,
                    modalidade_nome: item.modalidade_nome ?? null,
                    tipo_servico: 'Aplicacao',
                    preco_original: item.preco,
                    tipo_preco: item.tipo_preco,
                    valor_desconto: 0,
                    valor_final: item.preco,
                    fidelizacao_selecionada: false,
                    registado_por
                });
            }

            const itensFidelizacao = grupo.itens.map((item, index) => ({
                servico: item.servico,
                atendimento_servico_id: ids[index],
                valor_final: item.preco - item.desconto,
                tipo_servico: tipoDoItem(item),
                usar_beneficio: usaBeneficio(item),
                fidelizacao_selecionada: item.fidelizacao_selecionada === true
            }));

            await FidelizacaoService.registarAtendimento(tx, {
                cliente_id: grupo.cliente_id,
                itens: itensFidelizacao,
                registado_por,
                // Se o pedido trouxe a propriedade, a selecao e explicita:
                // nao havendo servico escolhido, nao se cria marca.
                selecao_explicita: grupo.itens.some(
                    (item) => item.fidelizacao_selecionada !== undefined
                )
            });
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "atendimento",
            id_registo: atendimento_id,
            operacao: "criar",
            depois: {
                cliente_id: gruposValidados[0].cliente_id,
                clientes: gruposValidados.length,
                valor_bruto: totais.bruto,
                valor_desconto: totais.desconto,
                valor_total: totais.total,
                servicos: todosItens.filter((item) => tipoDoItem(item) === 'Servico').length,
                aplicacoes: todosItens.filter((item) => tipoDoItem(item) === 'Aplicacao').length,
                beneficios_fidelizacao: todosItens.filter(usaBeneficio).length
            }
        }, tx);

        return atendimento_id;
    });
};

const adicionarServico = async (atendimento_id, dados, registado_por) => {
    const [atendimento, servico] = await Promise.all([
        Atendimento.findById(atendimento_id),
        validarServicoAtivo(dados.servico_id)
    ]);

    if (!atendimento) {
        throw criarErro(404, "Atendimento nao encontrado");
    }
    if (atendimento.estado === "Anulado") {
        throw criarErro(409, "Um atendimento anulado nao pode ser alterado");
    }

    const cliente_id = Number(dados.cliente_id ?? atendimento.cliente_id);
    await validarClienteAtivo(cliente_id);

    const tipo = servico.tipo_servico === 'Aplicacao' ? 'Aplicacao' : 'Servico';
    const item = {
        ...dados,
        cliente_id,
        tipo_servico: tipo,
        servico
    };

    let principal = null;

    if (tipo === 'Aplicacao') {
        const itensAtendimento = await Atendimento.findServicos(atendimento_id);
        principal = itensAtendimento.find((linha) => (
            Number(linha.cliente_id) === cliente_id
            && linha.tipo_servico === 'Servico'
            && (
                String(linha.id) === String(dados.servico_principal_id)
                || String(linha.servico_id) === String(dados.servico_principal_id)
            )
        )) || null;

        const servicoPrincipal = principal
            ? await Servico.findById(principal.servico_id)
            : null;

        await validarAplicacao(item, servicoPrincipal ? {
            ...principal,
            servico: servicoPrincipal
        } : null);

        if (!item.funcionario_id && principal?.funcionario_id) {
            item.funcionario_id = principal.funcionario_id;
        }
    }

    if (!item.funcionario_id) {
        throw criarErro(400, `O servico "${servico.nome}" exige um funcionario responsavel`);
    }

    validarBeneficioServico(servico, item);

    const preco = validarPrecoItem(item);
    const gratuito = usaBeneficio(item);
    const desconto = gratuito ? preco : Number(item.desconto || 0);
    const valorFinal = preco - desconto;
    const elegivel = tipo === 'Servico' && servicoContaParaFidelizacao(servico);
    const selecionado = item.fidelizacao_selecionada === true;
    const selecaoExplicita = item.fidelizacao_selecionada !== undefined;

    if (selecionado && tipo === 'Aplicacao') {
        throw criarErro(400, "Uma aplicacao nao pode ser escolhida para fidelizacao");
    }
    if (selecionado && gratuito) {
        throw criarErro(400, "O servico gratuito nao pode ser escolhido para fidelizacao");
    }
    if (selecionado && !servico.elegivel_fidelizacao) {
        throw criarErro(400, `O servico "${servico.nome}" nao e elegivel para fidelizacao`);
    }

    return db.transaction(async (tx) => {
        if (gratuito && await Atendimento.temBeneficioFidelizacao(tx, atendimento_id, cliente_id)) {
            throw criarErro(409, "Este cliente ja tem um servico gratuito de fidelizacao neste atendimento");
        }

        if (gratuito && await Atendimento.temMarcaFidelizacao(tx, atendimento_id, cliente_id)) {
            throw criarErro(
                409,
                "O 6.º servico gratuito tem de ser incluido antes de o atendimento gerar marca"
            );
        }

        const { pendentes } = elegivel
            ? await FidelizacaoService.saldosCartao(tx, cliente_id)
            : { pendentes: 0 };
        const jaTemGratuito = elegivel
            ? await Atendimento.temBeneficioFidelizacao(tx, atendimento_id, cliente_id)
            : false;

        if (gratuito && pendentes <= 0) {
            throw criarErro(409, "O cliente nao tem o 6.º servico gratuito pendente");
        }

        if (elegivel && !gratuito && pendentes > 0 && !jaTemGratuito && valorFinal > 0) {
            const erro = criarErro(
                409,
                "O cartao esta completo (5/5): o proximo servico elegivel deste cliente tem de ser gratuito"
            );
            erro.field = "servicos";
            throw erro;
        }

        if (selecionado) {
            await Atendimento.limparSelecaoFidelizacao(tx, atendimento_id, cliente_id);
        }

        const item_id = await Atendimento.insertServico(tx, {
            atendimento_id,
            cliente_id,
            servico_id: dados.servico_id,
            servico_principal_id: principal?.id ?? null,
            funcionario_id: item.funcionario_id,
            modalidade_id: dados.modalidade_id ?? null,
            modalidade_nome: dados.modalidade_nome ?? null,
            tipo_servico: tipo,
            preco_original: preco,
            tipo_preco: dados.tipo_preco,
            valor_desconto: desconto,
            valor_final: valorFinal,
            fidelizacao_selecionada: selecionado,
            registado_por
        });

        const deveRegistarMarca = elegivel
            && !gratuito
            && !jaTemGratuito
            && valorFinal > 0
            && (selecaoExplicita ? selecionado : true);

        if (gratuito || deveRegistarMarca) {
            await FidelizacaoService.registarCorte(tx, {
                cliente_id,
                atendimento_servico_id: item_id,
                valor_final: valorFinal,
                registado_por,
                usar_beneficio: gratuito,
                observacao: gratuito ? `6.º servico gratuito (fidelizacao): ${servico.nome}` : undefined
            });
        }

        await Atendimento.recalcular(tx, atendimento_id);
    });
};

const removerServico = async (item_id) => {
    return db.transaction(async (tx) => {
        const item = await Atendimento.findServicoItem(tx, item_id);
        if (!item) {
            throw criarErro(404, "Servico do atendimento nao encontrado");
        }

        await Atendimento.deleteServicoItem(tx, item_id);
        await Atendimento.recalcular(tx, item.atendimento_id);

        return item.atendimento_id;
    });
};

// Aplicar desconto a um servico ou atendimento (rota legada; o fluxo de
// atendimento actual nao disponibiliza descontos).
const aplicarDesconto = async (atendimento_id, dados, registado_por) => {
    const atendimento = await Atendimento.findById(atendimento_id);

    if (!atendimento) {
        throw criarErro(404, "Atendimento nao encontrado");
    }
    if (atendimento.estado === "Anulado") {
        throw criarErro(409, "Um atendimento anulado nao pode receber desconto");
    }

    const { atendimento_servico_id, escopo, tipo, percentagem, valor_bruto, valor_desconto, valor_final } = dados;

    // Validacoes
    if (valor_desconto < 0) {
        throw criarErro(400, "O valor do desconto nao pode ser negativo");
    }
    if (valor_desconto > valor_bruto) {
        throw criarErro(400, "O desconto nao pode exceder o valor elegivel");
    }
    if (tipo === 'Percentagem' && (percentagem === undefined || percentagem < 0 || percentagem > 100)) {
        throw criarErro(400, "Percentagem invalida: deve estar entre 0 e 100");
    }

    return db.transaction(async (tx) => {
        // Registar o desconto no historico
        await Atendimento.insertDesconto(tx, {
            atendimento_id,
            atendimento_servico_id,
            escopo,
            tipo,
            percentagem: percentagem ?? null,
            valor_bruto,
            valor_desconto,
            valor_final,
            aplicado_por: registado_por
        });

        // Aplicar o desconto na linha do servico correspondente
        await tx.execute(sql`
            update atendimento_servico
               set valor_desconto = valor_desconto + ${valor_desconto},
                   valor_final = valor_final - ${valor_desconto}
             where id = ${atendimento_servico_id}
        `);

        // Recalcular totais do atendimento
        await Atendimento.recalcular(tx, atendimento_id);

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "desconto",
            id_registo: atendimento_id,
            operacao: "aplicar",
            depois: { atendimento_servico_id, escopo, tipo, percentagem, valor_bruto, valor_desconto, valor_final }
        }, tx);
    });
};

const AtendimentoService = {
    criar,
    adicionarServico,
    removerServico,
    aplicarDesconto
};

export default AtendimentoService;
