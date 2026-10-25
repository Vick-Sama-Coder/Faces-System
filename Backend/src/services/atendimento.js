import db from '../db/client.js';
import Atendimento from '../repository/atendimento.js';
import Servico from '../repository/servico.js';
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

const criar = async ({ cliente_id, servicos, registado_por }) => {
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
            valor_bruto: totais.bruto,
            valor_desconto: totais.desconto,
            valor_total: totais.total,
            registado_por
        });

        const itensFidelizacao = [];

        for (let i = 0; i < servicos.length; i++) {
            const preco = precos[i];
            const gratuito = usaBeneficio(servicos[i]);
            const desconto = gratuito ? preco : Number(servicos[i].desconto || 0);

            const item_id = await Atendimento.insertServico(tx, {
                atendimento_id,
                servico_id: servicos[i].servico_id,
                funcionario_id: servicos[i].funcionario_id,
                preco_original: preco,
                tipo_preco: servicos[i].tipo_preco,
                valor_desconto: desconto,
                valor_final: preco - desconto,
                registado_por
            });

            itensFidelizacao.push({
                servico: validados[i],
                atendimento_servico_id: item_id,
                valor_final: preco - desconto,
                usar_beneficio: gratuito
            });
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

        const item_id = await Atendimento.insertServico(tx, {
            atendimento_id,
            servico_id: dados.servico_id,
            funcionario_id: dados.funcionario_id,
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

const AtendimentoService = {
    criar,
    adicionarServico,
    removerServico
};

export default AtendimentoService;
