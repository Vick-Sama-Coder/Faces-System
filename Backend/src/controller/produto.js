import Produto from "../repository/produto.js";
import CategoriaProduto from "../repository/categoria_produto.js";
import { codigoPostgres } from "../utils/erro.js";

const ESTADOS = ["Ativo", "Inativo"];

function texto(valor) {
    return typeof valor === "string" ? valor.trim() : "";
}

function inteiro(valor, campo, { minimo = 0 } = {}) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < minimo) {
        return { erro: { field: campo, message: `O campo ${campo} deve ser um inteiro maior ou igual a ${minimo}` } };
    }

    return { valor: numero };
}

function normalizarProduto(body, { parcial = false } = {}) {
    const dados = {};

    if (!parcial || body.nome !== undefined) {
        const nome = texto(body.nome);
        if (!nome) return { erro: { field: "nome", message: "O campo nome e obrigatorio" } };
        dados.nome = nome;
    }

    if (!parcial || body.valor !== undefined) {
        const resultado = inteiro(body.valor, "valor");
        if (resultado.erro) return resultado;
        dados.valor = resultado.valor;
    }

    if (!parcial || body.categoria_produto_id !== undefined) {
        const resultado = inteiro(body.categoria_produto_id, "categoria_produto_id", { minimo: 1 });
        if (resultado.erro) return resultado;
        dados.categoria_produto_id = resultado.valor;
    }

    if (!parcial || body.stock_minimo !== undefined) {
        const resultado = inteiro(body.stock_minimo ?? 0, "stock_minimo");
        if (resultado.erro) return resultado;
        dados.stock_minimo = resultado.valor;
    }

    if (body.unidade !== undefined) {
        const unidade = texto(body.unidade) || "un";
        dados.unidade = unidade.slice(0, 20);
    }

    if (body.estado !== undefined) {
        const estado = texto(body.estado);
        if (!ESTADOS.includes(estado)) {
            return { erro: { field: "estado", message: "O estado deve ser Ativo ou Inativo" } };
        }
        dados.estado = estado;
    }

    return { dados };
}

const getProdutos = async (req, res, next) => {
    try {
        res.status(200).json(await Produto.findAll({
            search: req.query.search,
            categoria: req.query.categoria,
            estado: req.query.estado
        }));
    } catch (error) {
        next(error);
    }
};

const getProdutoById = async (req, res, next) => {
    try {
        const produto = await Produto.findById(req.params.id);

        if (!produto) {
            return res.status(404).json({ message: "Produto nao encontrado" });
        }

        res.status(200).json(produto);
    } catch (error) {
        next(error);
    }
};

const createProduto = async (req, res, next) => {
    try {
        const { erro, dados } = normalizarProduto(req.body || {});

        if (erro) {
            return res.status(400).json(erro);
        }

        res.status(201).json(await Produto.create(dados));
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Categoria de produto nao encontrada" });
        }
        next(error);
    }
};

const updateProduto = async (req, res, next) => {
    try {
        const { erro, dados } = normalizarProduto(req.body || {}, { parcial: true });

        if (erro) {
            return res.status(400).json(erro);
        }
        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const produto = await Produto.update(req.params.id, dados);

        if (!produto) {
            return res.status(404).json({ message: "Produto nao encontrado" });
        }

        res.status(200).json(produto);
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Categoria de produto nao encontrada" });
        }
        next(error);
    }
};

const deleteProduto = async (req, res, next) => {
    try {
        const apagado = await Produto.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Produto nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(409).json({
                message: "Nao e possivel apagar: existem despesas ou movimentos de stock ligados a este produto"
            });
        }
        next(error);
    }
};

const getCategoriasProduto = async (req, res, next) => {
    try {
        res.status(200).json(await CategoriaProduto.findAll());
    } catch (error) {
        next(error);
    }
};

const createCategoriaProduto = async (req, res, next) => {
    try {
        const nome = texto(req.body?.nome);

        if (!nome) {
            return res.status(400).json({ field: "nome", message: "O campo nome e obrigatorio" });
        }

        res.status(201).json(await CategoriaProduto.create({ nome }));
    } catch (error) {
        next(error);
    }
};

const updateCategoriaProduto = async (req, res, next) => {
    try {
        const nome = texto(req.body?.nome);

        if (!nome) {
            return res.status(400).json({ field: "nome", message: "O campo nome e obrigatorio" });
        }

        const categoria = await CategoriaProduto.update(req.params.id, { nome });

        if (!categoria) {
            return res.status(404).json({ message: "Categoria de produto nao encontrada" });
        }

        res.status(200).json(categoria);
    } catch (error) {
        next(error);
    }
};

const deleteCategoriaProduto = async (req, res, next) => {
    try {
        const apagada = await CategoriaProduto.delete(req.params.id);

        if (!apagada) {
            return res.status(404).json({ message: "Categoria de produto nao encontrada" });
        }

        res.status(204).send();
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem produtos nesta categoria" });
        }
        next(error);
    }
};

const ProdutoController = {
    getProdutos,
    getProdutoById,
    createProduto,
    updateProduto,
    deleteProduto,
    getCategoriasProduto,
    createCategoriaProduto,
    updateCategoriaProduto,
    deleteCategoriaProduto
};

export default ProdutoController;
