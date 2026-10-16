import Perfil from "../repository/perfil.js";
import Permissao from "../repository/permissao.js";

const getPerfis = async (req, res, next) => {
    try {
        res.status(200).json(await Perfil.findAll());
    } catch (error) {
        next(error);
    }
};

//catalogo de todas as permissoes existentes (para a matriz no frontend)
const getPermissoesCatalogo = async (req, res, next) => {
    try {
        res.status(200).json(await Permissao.findAll());
    } catch (error) {
        next(error);
    }
};

const getPerfilById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const perfil = await Perfil.findById(id);

        if (!perfil) {
            return res.status(404).json({ message: "Perfil nao encontrado" });
        }

        perfil.permissoes = await Permissao.findByPerfil(id);
        res.status(200).json(perfil);
    } catch (error) {
        next(error);
    }
};

const createPerfil = async (req, res, next) => {
    try {
        const { nome, descricao } = req.body;

        if (!nome) {
            return res.status(400).json({ message: "O campo nome e obrigatorio" });
        }

        res.status(201).json(await Perfil.create({ nome, descricao }));
    } catch (error) {
        next(error);
    }
};

const updatePerfil = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, descricao, estado } = req.body;

        if (nome === undefined && descricao === undefined && estado === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        const perfil = await Perfil.update(id, { nome, descricao, estado });

        if (!perfil) {
            return res.status(404).json({ message: "Perfil nao encontrado" });
        }

        res.status(200).json(perfil);
    } catch (error) {
        next(error);
    }
};

const updatePermissoesPerfil = async (req, res, next) => {
    try {
        const { id } = req.params;
        const perfil = await Perfil.findById(id);

        if (!perfil) {
            return res.status(404).json({ message: "Perfil nao encontrado" });
        }

        const { permissoes } = req.body;
        if (!Array.isArray(permissoes)) {
            return res.status(400).json({ message: "O campo permissoes deve ser uma lista de codigos" });
        }

        await Permissao.substituirPerfil(id, permissoes);

        res.status(200).json({
            message: "Permissoes do perfil atualizadas",
            permissoes: await Permissao.findByPerfil(id)
        });
    } catch (error) {
        next(error);
    }
};

const PerfilController = {
    getPerfis,
    getPerfilById,
    createPerfil,
    updatePerfil,
    updatePermissoesPerfil,
    getPermissoesCatalogo
};

export default PerfilController;
