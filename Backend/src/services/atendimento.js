import { sql } from 'drizzle-orm';
import db from '../db/client.js';
import Atendimento from '../repository/atendimento.js';
import Servico from '../repository/servico.js';
import Funcionario from '../repository/funcionario.js';
import Pagamento from '../repository/pagamento.js';
import Comissao from '../repository/comissao.js';
import FidelizacaoService from './fidelizacao.js';
import AuditoriaService from './auditoria.js';
import { criarErro } from '../utils/erro.js';
import { LIMITE_FIDELIZACAO, servicoContaParaFidelizacao } from '../utils/validacoes.js';

//o beneficio tem de ser pedido explicitamente e so pode ser usado uma vez por atendimento
const usaBeneficio = (item) => item?.usar_beneficio_fidelizacao === true;

function validarPrecoItem(item) {
    const preco = Number(item.preco_praticado);

    if (!Number.isFinite(preco) || preco <= 0) {
        throw criarErro(400, "O preco praticado deve ser um valor maior que zero");
    }

    return preco;
}

function validarBeneficioServico(servico, item) {
    if (!usaBeneficio(item)) return;

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

function validarUmBeneficioPorAtendimento(servicos) {
    const total = servicos.filter(usaBeneficio).length;

    if (total > 1) {
        throw criarErro(409, "So e possivel usar um beneficio gratuito por atendimento");
    }
}

//os totais derivam das linhas para o cabecalho nunca divergir dos servicos
function somar(servicos) {
    return servicos.reduce(
        (totais, s) => {
            const preco = Number(s.preco_praticado);
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

// As comissoes de linhas normais so existem com o atendimento liquidado.
// As linhas consumidas de um agendamento pre-pago ja foram pagas na compra,
// por isso mantem a comissao mesmo quando ha saldo pendente noutras linhas.
// O total nunca pode ficar abaixo do que ja foi pago: nesse caso, o
// utilizador tem de anular pagamentos antes de guardar a alteracao.
async function sincronizarComissoes(tx, atendimento_id) {
    const atendimento = await Atendimento.findById(atendimento_id, tx);
    const total = Number(atendimento?.valor_total || 0);
    const pago = Number(await Pagamento.somaParcelas(tx, atendimento_id));

    if (total < pago) {
        throw criarErro(
            409,
            `O novo total (${total} MT) nao pode ser inferior ao valor ja pago (${pago} MT). Anule pagamentos antes de guardar`
        );
    }

    await Comissao.deleteParaAtendimento(tx, atendimento_id);

    if (total > 0 && pago >= total) {
        await Comissao.gerarParaAtendimento(tx, atendimento_id);
    } else {
        await Comissao.gerarParaAtendimento(tx, atendimento_id, { apenasAgendamento: true });
    }

    return { total, pago };
}

// O formulario conhece o id do servico no catalogo (ou, na edicao, o id da
// linha do atendimento), mas a base liga a aplicacao a linha concreta do
// servico principal. Aceitamos as duas formas e devolvemos o id da linha.
function resolverServicoPrincipal(valor, linhas, { aceitarLinha = true } = {}) {
    if (valor === undefined || valor === null || valor === "") return null;

    const referencia = String(valor);

    if (aceitarLinha) {
        const porLinha = linhas.find((linha) => String(linha.id) === referencia);

        if (porLinha) {
            return porLinha.tipo_servico === "Aplicacao" ? null : Number(porLinha.id);
        }
    }

    const porServico = linhas.find((linha) => (
        linha.tipo_servico !== "Aplicacao"
        && String(linha.servico_id) === referencia
    ));

    return porServico ? Number(porServico.id) : null;
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

const criar = async ({ cliente_id, servicos, data_hora, registado_por }) => {
    validarUmBeneficioPorAtendimento(servicos);

    const validados = [];
    const precos = [];

    for (const item of servicos) {
        const servico = await validarServicoAtivo(item.servico_id);
        validarBeneficioServico(servico, item);
        validados.push(servico);
        precos.push(validarPrecoItem(item));
    }

    return db.transaction(async (tx) => {
        const totais = somar(servicos);
        const atendimento_id = await Atendimento.insertHeader(tx, {
            cliente_id,
            data_hora,
            valor_bruto: totais.bruto,
            valor_desconto: totais.desconto,
            valor_total: totais.total,
            registado_por
        });

        const itensFidelizacao = [];
        const linhasCriadas = [];

        for (let i = 0; i < servicos.length; i++) {
            const preco = precos[i];
            const gratuito = usaBeneficio(servicos[i]);
            const desconto = gratuito ? preco : Number(servicos[i].desconto || 0);

            const item_id = await Atendimento.insertServico(tx, {
                atendimento_id,
                cliente_id,
                servico_id: servicos[i].servico_id,
                servico_principal_id: null,
                funcionario_id: servicos[i].funcionario_id,
                modalidade_id: servicos[i].modalidade_id ?? null,
                modalidade_nome: servicos[i].modalidade_nome ?? null,
                tipo_servico: servicos[i].tipo_servico ?? 'Servico',
                preco_original: preco,
                tipo_preco: servicos[i].tipo_preco,
                valor_desconto: desconto,
                valor_final: preco - desconto,
                registado_por
            });

            linhasCriadas.push({
                id: item_id,
                servico_id: Number(servicos[i].servico_id),
                tipo_servico: servicos[i].tipo_servico ?? 'Servico'
            });

            itensFidelizacao.push({
                servico: validados[i],
                atendimento_servico_id: item_id,
                valor_final: preco - desconto,
                usar_beneficio: gratuito
            });
        }

        // As aplicacoes ficam ligadas ao id da linha principal, nunca ao id
        // do catalogo, para a base de dados manter a referencia correta.
        for (let i = 0; i < servicos.length; i++) {
            if ((servicos[i].tipo_servico ?? 'Servico') !== 'Aplicacao') continue;

            const principal = resolverServicoPrincipal(
                servicos[i].servico_principal_id,
                linhasCriadas,
                { aceitarLinha: false }
            );

            if (principal) {
                await Atendimento.updateServicoItem(tx, linhasCriadas[i].id, {
                    servico_principal_id: principal
                });
            }
        }

        await FidelizacaoService.registarAtendimento(tx, {
            cliente_id,
            itens: itensFidelizacao,
            registado_por
        });

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "atendimento",
            id_registo: atendimento_id,
            operacao: "criar",
            depois: {
                cliente_id,
                valor_bruto: totais.bruto,
                valor_desconto: totais.desconto,
                valor_total: totais.total,
                servicos: servicos.length,
                beneficios_fidelizacao: servicos.filter(usaBeneficio).length
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

    validarBeneficioServico(servico, dados);

    const preco = validarPrecoItem(dados);
    const gratuito = usaBeneficio(dados);
    const desconto = gratuito ? preco : Number(dados.desconto || 0);
    const valorFinal = preco - desconto;
    const elegivel = servicoContaParaFidelizacao(servico);

    return db.transaction(async (tx) => {
        if (gratuito && await Atendimento.temBeneficioFidelizacao(tx, atendimento_id)) {
            throw criarErro(409, "Este atendimento ja tem um servico gratuito de fidelizacao");
        }

        if (gratuito && await Atendimento.temMarcaFidelizacao(tx, atendimento_id)) {
            throw criarErro(
                409,
                "O 6.º servico gratuito tem de ser incluido antes de o atendimento gerar marca"
            );
        }

        const { pendentes } = elegivel
            ? await FidelizacaoService.saldosCartao(tx, atendimento.cliente_id)
            : { pendentes: 0 };
        const jaTemGratuito = elegivel
            ? await Atendimento.temBeneficioFidelizacao(tx, atendimento_id)
            : false;

        if (gratuito && pendentes <= 0) {
            throw criarErro(409, "O cliente nao tem o 6.º servico gratuito pendente");
        }

        if (elegivel && !gratuito && pendentes > 0 && !jaTemGratuito && valorFinal > 0) {
            const erro = criarErro(
                409,
                "O cartao esta completo (5/5): o proximo servico elegivel deste atendimento tem de ser gratuito"
            );
            erro.field = "servicos";
            throw erro;
        }

        const linhas = await Atendimento.findItensAtivos(tx, atendimento_id);
        const principalId = resolverServicoPrincipal(dados.servico_principal_id, linhas);

        const item_id = await Atendimento.insertServico(tx, {
            atendimento_id,
            cliente_id: atendimento.cliente_id,
            servico_id: dados.servico_id,
            servico_principal_id: principalId,
            funcionario_id: dados.funcionario_id,
            modalidade_id: dados.modalidade_id ?? null,
            modalidade_nome: dados.modalidade_nome ?? null,
            tipo_servico: dados.tipo_servico ?? 'Servico',
            preco_original: preco,
            tipo_preco: dados.tipo_preco,
            valor_desconto: desconto,
            valor_final: valorFinal,
            registado_por
        });

        if (elegivel && (gratuito || !jaTemGratuito)) {
            await FidelizacaoService.registarCorte(tx, {
                cliente_id: atendimento.cliente_id,
                atendimento_servico_id: item_id,
                valor_final: valorFinal,
                registado_por,
                usar_beneficio: gratuito,
                observacao: gratuito ? `6.º servico gratuito (fidelizacao): ${servico.nome}` : undefined
            });
        }

        await Atendimento.recalcular(tx, atendimento_id);
        await sincronizarComissoes(tx, atendimento_id);
    });
};

// Edicao completa: cabecalho, servicos, descontos e recalculo de totais.
// Pagamentos existentes nunca sao apagados; se o novo total ficar abaixo do
// valor pago, a operacao e recusada para nao criar saldo negativo.
const atualizar = async (atendimento_id, { cliente_id, data_hora, servicos }, registado_por) => {
    return db.transaction(async (tx) => {
        const bloqueio = await Atendimento.lockById(tx, atendimento_id);

        if (!bloqueio) {
            throw criarErro(404, "Atendimento nao encontrado");
        }
        if (bloqueio.estado === "Anulado") {
            throw criarErro(409, "Um atendimento anulado nao pode ser alterado");
        }

        const antes = await Atendimento.findById(atendimento_id, tx);
        const clienteFinal = cliente_id !== undefined ? Number(cliente_id) : Number(antes.cliente_id);
        const clienteAlterado = clienteFinal !== Number(antes.cliente_id);

        if (cliente_id !== undefined && (!Number.isInteger(clienteFinal) || clienteFinal <= 0)) {
            throw criarErro(400, "Cliente invalido");
        }
        if (clienteAlterado) {
            if (await Atendimento.temMovimentosFidelizacao(tx, atendimento_id)) {
                throw criarErro(
                    409,
                    "Este atendimento ja tem movimentos de fidelizacao. Corrija o cartao do cliente antes de alterar o cliente do atendimento"
                );
            }
            if (await Atendimento.temServicoAgendamento(tx, atendimento_id)) {
                throw criarErro(
                    409,
                    "Este atendimento inclui servicos consumidos de um agendamento pre-pago e nao pode mudar de cliente"
                );
            }
        }

        const camposHeader = {};
        if (cliente_id !== undefined) camposHeader.cliente_id = clienteFinal;
        if (data_hora !== undefined) camposHeader.data_hora = data_hora;

        if (Object.keys(camposHeader).length > 0) {
            await Atendimento.updateHeader(atendimento_id, camposHeader, tx);
        }

        let totalFinal = Number(antes.valor_total);
        let quantidadeServicos = null;

        if (servicos !== undefined) {
            if (!Array.isArray(servicos) || servicos.length === 0) {
                throw criarErro(400, "O atendimento tem de ter pelo menos um servico");
            }

            const existentes = await Atendimento.findItensAtivos(tx, atendimento_id);
            const porId = new Map(existentes.map((item) => [String(item.id), item]));
            const itensVistos = new Set();

            // Referencias validas para ligar aplicacoes ao servico principal.
            // Inclui as linhas existentes e as que forem criadas nesta edicao.
            const linhasAssociacao = existentes.map((linha) => ({
                id: linha.id,
                servico_id: linha.servico_id,
                tipo_servico: linha.tipo_servico
            }));
            const linhaPorChave = new Map();
            const aplicacoesPendentes = [];

            for (const item of servicos) {
                if (!item?.servico_id || !item?.funcionario_id) {
                    throw criarErro(400, "Cada servico exige servico_id e funcionario_id");
                }

                const itemAtual = item.id ? porId.get(String(item.id)) : null;

                if (item.id && !itemAtual) {
                    throw criarErro(400, "Servico do atendimento nao encontrado");
                }
                if (itemAtual) {
                    itensVistos.add(String(itemAtual.id));
                }

                // Linhas consumidas de agendamento pre-pago sao imutaveis.
                if (itemAtual?.agendamento_servico_id) {
                    const inalterado = Number(itemAtual.servico_id) === Number(item.servico_id)
                        && Number(itemAtual.funcionario_id) === Number(item.funcionario_id)
                        && Number(itemAtual.preco_original) === Number(item.preco_praticado)
                        && Number(itemAtual.valor_desconto) === Math.round(Number(item.desconto || 0))
                        && String(itemAtual.modalidade_id || "") === String(item.modalidade_id || "");

                    if (!inalterado) {
                        throw criarErro(
                            409,
                            "Os servicos consumidos de um agendamento pre-pago nao podem ser editados"
                        );
                    }
                    continue;
                }

                const preco = Number(item.preco_praticado);
                const desconto = Math.round(Number(item.desconto || 0));

                if (!Number.isInteger(preco) || preco <= 0) {
                    throw criarErro(400, "O preco praticado deve ser um valor inteiro maior que zero");
                }
                if (!Number.isInteger(desconto) || desconto < 0 || desconto > preco) {
                    throw criarErro(400, "O desconto deve ser um valor inteiro entre zero e o preco do servico");
                }

                const servico = await Servico.findById(item.servico_id);

                if (!servico) {
                    throw criarErro(400, "Servico nao encontrado");
                }

                const funcionario = await Funcionario.findById(item.funcionario_id);
                if (!funcionario) {
                    throw criarErro(400, "Funcionario nao encontrado");
                }

                const mudouServico = !itemAtual || Number(itemAtual.servico_id) !== Number(item.servico_id);

                if (mudouServico && servico.estado !== "Ativo") {
                    throw criarErro(409, `O servico "${servico.nome}" esta inativo`);
                }

                const tipoServico = item.tipo_servico || itemAtual?.tipo_servico || "Servico";
                const chave = item.chave ? String(item.chave) : null;
                const referenciaPrincipal = tipoServico === "Aplicacao"
                    ? (item.servico_principal_id ?? itemAtual?.servico_principal_id)
                    : null;
                const chavePrincipal = tipoServico === "Aplicacao" && item.servico_principal_chave
                    ? String(item.servico_principal_chave)
                    : null;

                let principalId = resolverServicoPrincipal(referenciaPrincipal, linhasAssociacao);
                if (!principalId && chavePrincipal) {
                    principalId = linhaPorChave.get(chavePrincipal) ?? null;
                }

                const valores = {
                    servico_id: Number(item.servico_id),
                    funcionario_id: Number(item.funcionario_id),
                    modalidade_id: item.modalidade_id ? Number(item.modalidade_id) : null,
                    modalidade_nome: item.modalidade_nome || null,
                    tipo_servico: tipoServico,
                    servico_principal_id: principalId,
                    preco_original: preco,
                    tipo_preco: item.tipo_preco ?? itemAtual?.tipo_preco ?? null,
                    valor_desconto: desconto,
                    valor_final: preco - desconto
                };

                if (itemAtual) {
                    await Atendimento.updateServicoItem(tx, itemAtual.id, valores);
                    if (chave) linhaPorChave.set(chave, itemAtual.id);

                    if (tipoServico === "Aplicacao") {
                        if (!principalId && (referenciaPrincipal || chavePrincipal)) {
                            aplicacoesPendentes.push({
                                id: itemAtual.id,
                                referencia: referenciaPrincipal,
                                chave: chavePrincipal
                            });
                        }
                    } else {
                        const linha = linhasAssociacao.find(
                            (associacao) => String(associacao.id) === String(itemAtual.id)
                        );
                        if (linha) {
                            linha.servico_id = Number(item.servico_id);
                            linha.tipo_servico = tipoServico;
                        }
                    }
                } else {
                    const novoId = await Atendimento.insertServico(tx, {
                        atendimento_id,
                        cliente_id: clienteFinal,
                        ...valores,
                        registado_por
                    });
                    if (chave) linhaPorChave.set(chave, novoId);

                    if (tipoServico === "Aplicacao") {
                        if (!principalId && (referenciaPrincipal || chavePrincipal)) {
                            aplicacoesPendentes.push({
                                id: novoId,
                                referencia: referenciaPrincipal,
                                chave: chavePrincipal
                            });
                        }
                    } else {
                        linhasAssociacao.push({
                            id: novoId,
                            servico_id: Number(item.servico_id),
                            tipo_servico: tipoServico
                        });
                    }
                }
            }

            // Se a aplicacao foi enviada antes do servico principal, a ligacao
            // so pode ser resolvida depois de todas as linhas estarem gravadas.
            for (const pendente of aplicacoesPendentes) {
                let principal = resolverServicoPrincipal(pendente.referencia, linhasAssociacao);

                if (!principal && pendente.chave) {
                    principal = linhaPorChave.get(pendente.chave) ?? null;
                }

                if (principal) {
                    await Atendimento.updateServicoItem(tx, pendente.id, {
                        servico_principal_id: principal
                    });
                }
            }

            // Linhas que desapareceram do formulario sao anuladas, nunca
            // apagadas: podem ter fidelizacao, comissao ou descontos ligados.
            for (const existente of existentes) {
                if (itensVistos.has(String(existente.id))) continue;

                if (existente.agendamento_servico_id) {
                    throw criarErro(
                        409,
                        "Um servico consumido de um agendamento pre-pago nao pode ser removido"
                    );
                }

                await Atendimento.anularServicoItem(tx, existente.id);
            }

            await Atendimento.recalcular(tx, atendimento_id);

            // A sincronizacao valida que o total continua a cobrir os
            // pagamentos e atualiza as comissoes das linhas.
            const sincronizado = await sincronizarComissoes(tx, atendimento_id);
            totalFinal = sincronizado.total;

            quantidadeServicos = servicos.length;
        }

        // A mudanca de cliente tem de acompanhar todas as linhas, mesmo quando
        // a edicao nao mexe nos servicos.
        if (clienteAlterado) {
            await Atendimento.updateClienteItens(tx, atendimento_id, clienteFinal);
        }

        await AuditoriaService.registar({
            id_utilizador: registado_por,
            entidade: "atendimento",
            id_registo: atendimento_id,
            operacao: "atualizar",
            antes: {
                cliente_id: antes.cliente_id,
                data_hora: antes.data_hora,
                valor_total: antes.valor_total,
                servicos: null
            },
            depois: {
                cliente_id: clienteFinal,
                data_hora: data_hora ?? antes.data_hora,
                valor_total: totalFinal,
                servicos: quantidadeServicos
            }
        }, tx);

        return atendimento_id;
    });
};

const removerServico = async (item_id) => {
    return db.transaction(async (tx) => {
        const item = await Atendimento.findServicoItem(tx, item_id);
        if (!item || item.estado !== 'Ativo') {
            throw criarErro(404, "Servico do atendimento nao encontrado");
        }
        if (item.agendamento_servico_id) {
            throw criarErro(409, "Um servico consumido de um agendamento pre-pago nao pode ser removido");
        }

        await Atendimento.anularServicoItem(tx, item_id);
        await Atendimento.recalcular(tx, item.atendimento_id);
        await sincronizarComissoes(tx, item.atendimento_id);

        return item.atendimento_id;
    });
};

// Aplicar desconto a um servico ou atendimento
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
        await sincronizarComissoes(tx, atendimento_id);

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
    atualizar,
    adicionarServico,
    removerServico,
    aplicarDesconto
};

export default AtendimentoService;