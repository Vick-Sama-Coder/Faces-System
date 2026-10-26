import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import Usuario from '../repository/usuario.js';
import Permissao from '../repository/permissao.js';
import AuditoriaService from '../services/auditoria.js';
import { limparTelefone } from '../utils/validacoes.js';
import { codigoPostgres } from '../utils/erro.js';

//gera uma credencial temporaria legivel (letra + numero, minimo 8 caracteres)
function gerarSenhaTemporaria() {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let sufixo = "";
    for (let i = 0; i < 6; i++) {
        sufixo += alfabeto[crypto.randomInt(alfabeto.length)];
    }
    return `Faces-${sufixo}`;
}

const getUsuarios = async (req, res, next) => {
    try {
        res.status(200).json(await Usuario.findAll());
    } catch (error) {
        next(error);
    }
};

const getUsuarioById = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.params.id);

        if (!usuario) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
};

//cria conta; sem senha, gera uma credencial temporaria (troca obrigatoria no proximo acesso)
const createUsuario = async (req, res, next) => {
    try {
        const { nome, telefone, id_perfil, senha } = req.body;

        if (!nome || !telefone || !id_perfil) {
            return res.status(400).json({ message: "Os campos nome, telefone e id_perfil sao obrigatorios" });
        }

        const telefoneLimpo = limparTelefone(telefone);

        if (await Usuario.existeTelefone(telefoneLimpo)) {
            return res.status(409).json({ field: "telefone", message: "Ja existe um utilizador com este telefone" });
        }

        //o nome de utilizador e o identificador de acesso: tem de ser unico
        if (await Usuario.existeNome(nome)) {
            return res.status(409).json({ field: "nome", message: "Ja existe um utilizador com este nome" });
        }

        const senhaTemporaria = senha || gerarSenhaTemporaria();
        const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

        const criado = await Usuario.create({
            nome,
            telefone: telefoneLimpo,
            senhaHash,
            id_perfil,
            alteracaoObrigatoria: !senha
        });

        res.status(201).json({
            user: criado,
            //a credencial gerada so e mostrada uma vez
            ...(senha ? {} : { senha_temporaria: senhaTemporaria })
        });
    } catch (error) {
        //23503 = perfil inexistente
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Perfil nao encontrado" });
        }
        next(error);
    }
};

const updateUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, telefone, id_perfil } = req.body;

        if (nome === undefined && telefone === undefined && id_perfil === undefined) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi enviado" });
        }

        let telefoneLimpo;
        if (telefone !== undefined) {
            telefoneLimpo = limparTelefone(telefone);
            if (await Usuario.existeTelefone(telefoneLimpo, id)) {
                return res.status(409).json({ field: "telefone", message: "Ja existe um utilizador com este telefone" });
            }
        }

        if (nome !== undefined && await Usuario.existeNome(nome, id)) {
            return res.status(409).json({ field: "nome", message: "Ja existe um utilizador com este nome" });
        }

        const usuario = await Usuario.update(id, { nome, telefone: telefoneLimpo, id_perfil });

        if (!usuario) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        res.status(200).json(usuario);
    } catch (error) {
        if (codigoPostgres(error) === "23503") {
            return res.status(400).json({ message: "Perfil nao encontrado" });
        }
        next(error);
    }
};

const updateEstadoUsuario = async (req, res, next) => {
    try {
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ message: "O campo estado e obrigatorio" });
        }

        const usuario = await Usuario.updateEstado(req.params.id, estado);

        if (!usuario) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
};

//repõe a credencial com uma senha temporaria e obriga a troca no proximo acesso
const reporSenha = async (req, res, next) => {
    try {
        const { id } = req.params;
        const alvo = await Usuario.findById(id);

        if (!alvo) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        const senhaTemporaria = gerarSenhaTemporaria();
        const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
        await Usuario.updateSenha(id, senhaHash, true);

        res.status(200).json({ message: "Credencial reposta", senha_temporaria: senhaTemporaria });
    } catch (error) {
        next(error);
    }
};

const getPermissoesUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        const efetivas = await Permissao.codigosEfetivos(usuario.id, usuario.id_perfil);
        const overrides = await Permissao.overridesUsuario(usuario.id);

        res.status(200).json({ efetivas, overrides });
    } catch (error) {
        next(error);
    }
};

const updatePermissoesUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findById(id);

        if (!usuario) {
            return res.status(404).json({ message: "Utilizador nao encontrado" });
        }

        const { conceder = [], revogar = [] } = req.body;

        await Permissao.substituirUsuario(usuario.id, conceder, revogar);

        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "usuario_permissao",
            id_registo: usuario.id,
            operacao: "atualizar",
            depois: { conceder, revogar }
        });

        res.status(200).json({
            message: "Permissoes individuais atualizadas",
            efetivas: await Permissao.codigosEfetivos(usuario.id, usuario.id_perfil)
        });
    } catch (error) {
        next(error);
    }
};

const UsuarioController = {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    updateEstadoUsuario,
    reporSenha,
    getPermissoesUsuario,
    updatePermissoesUsuario
};

export default UsuarioController;
