import Cliente from "../repository/cliente.js";
import { limparTelefone } from "../utils/validacoes.js";

const getClientes = async (req, res, next) => {
    try {
        const search = req.query.search ? String(req.query.search).trim() : null;

        res.status(200).json(await Cliente.findAll({ search }));
    } catch (error) {
        next(error);
    }
};

const getClienteById = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        res.status(200).json(cliente);
    } catch (error) {
        next(error);
    }
};

const createCliente = async (req, res, next) => {
    try {
        const { nome, apelido, telefone, endereco, data_nascimento } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({ message: "Os campos nome e telefone sao obrigatorios" });
        }

        const telefoneLimpo = limparTelefone(telefone);

        if (await Cliente.existeTelefone(telefoneLimpo)) {
            return res.status(409).json({ field: "telefone", message: "Ja existe um cliente com este telefone" });
        }

        const cliente = await Cliente.create({ nome, apelido, telefone: telefoneLimpo, endereco, data_nascimento });

        res.status(201).json(cliente);
    } catch (error) {
        next(error);
    }
};

const updateCliente = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, apelido, telefone, endereco, data_nascimento, estado } = req.body;

        if (nome === undefined && apelido === undefined && telefone === undefined &&
            endereco === undefined && data_nascimento === undefined && estado === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        let telefoneLimpo;
        if (telefone !== undefined) {
            telefoneLimpo = limparTelefone(telefone);
            if (await Cliente.existeTelefone(telefoneLimpo, id)) {
                return res.status(409).json({ field: "telefone", message: "Ja existe um cliente com este telefone" });
            }
        }

        const cliente = await Cliente.update(id, {
            nome,
            apelido,
            telefone: telefoneLimpo,
            endereco,
            data_nascimento,
            estado
        });

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        res.status(200).json(cliente);
    } catch (error) {
        next(error);
    }
};

const updateEstadoCliente = async (req, res, next) => {
    try {
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: "O campo estado e obrigatorio" });
        }

        const cliente = await Cliente.updateEstado(req.params.id, estado);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        res.status(200).json(cliente);
    } catch (error) {
        next(error);
    }
};

const deleteCliente = async (req, res, next) => {
    try {
        const apagado = await Cliente.delete(req.params.id);

        if (!apagado) {
            return res.status(404).json({ message: "Cliente nao encontrado" });
        }

        res.status(204).send();
    } catch (error) {
        //23503 = existem atendimentos associados a este cliente
        if (error.code === "23503") {
            return res.status(409).json({ message: "Nao e possivel apagar: existem atendimentos com este cliente" });
        }
        next(error);
    }
};

const ClienteController = {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    updateEstadoCliente,
    deleteCliente
};

export default ClienteController;
