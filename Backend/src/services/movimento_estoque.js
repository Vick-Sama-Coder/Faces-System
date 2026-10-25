import MovimientoEstoque from '../repository/movimento_estoque.js';
import Despesa from '../repository/despesa.js';
import { criarErro } from '../utils/erro.js';

// Registar entrada de stock (quando produtos são comprados)
// Esta função é chamada após a criação de uma despesa que inclui produtos
const registrarEntrada = async ({ produto_id, quantidade, motivo, registado_por, despesa_id }) => {
    if (!produto_id || quantidade <= 0) {
        throw criarErro(400, "Produto e quantidade válidos são obrigatórios para entrada de stock");
    }

    return MovimientoEstoque.insert(null, {
        produto_id,
        tipo: "entrada",
        quantidade,
        motivo: motivo ?? "Compra de stock",
        registado_por,
        despesa_id
    });
};

// Registrar saída de stock (consumo, perda, oferta)
// O tipo 'saida' representa consumo ou perda de stock registada
const registrarSaida = async ({ produto_id, quantidade, motivo, registado_por, despesa_id }) => {
    if (!produto_id || quantidade <= 0) {
        throw criarErro(400, "Produto e quantidade válidos são obrigatórios para saída de stock");
    }

    return MovimientoEstoque.insert(null, {
        produto_id,
        tipo: "saida",
        quantidade,
        motivo: motivo ?? "Consumo/perda de stock",
        registado_por,
        despesa_id
    });
};

// Registrar ajuste de stock (contagem física)
// O tipo 'ajuste' é usado quando a contagem física difere do stock calculado
// quantidade positiva = aumento, negativa = diminuição (não suportado diretamente, use saida/entrada)
// Para ajustes, permitimos quantidade com sinal positivo ou negativo através do motivo
const registrarAjuste = async ({ produto_id, quantidade, motivo, registado_por, despesa_id }) => {
    if (!produto_id) {
        throw criarErro(400, "Produto é obrigatório para ajuste de stock");
    }

    // Se quantidade for negativa, indicar no motivo
    const qty = Number(quantidade);

    return MovimientoEstoque.insert(null, {
        produto_id,
        tipo: "ajuste",
        quantidade: qty, // pode ser negativo para representar redução
        motivo: motivo ?? "Contagem física de stock",
        registado_por,
        despesa_id
    });
};

// Listar movimentos de stock para um produto
const listarMovimentos = async ({ produto_id, tipo, data_inicio, data_fim } = {}) => {
    return MovimientoEstoque.findAll({ produto_id, tipo, data_inicio, data_fim });
};

// Calcular stock atual para um produto
const getStockAtual = async (produtoId) => {
    const resultado = await MovimientoEstoque.calcularStockAtual(produtoId);
    return resultado;
};

const MovimentoEstoqueService = {
    registrarEntrada,
    registrarSaida,
    registrarAjuste,
    listarMovimentos,
    getStockAtual
};

export default MovimentoEstoqueService;