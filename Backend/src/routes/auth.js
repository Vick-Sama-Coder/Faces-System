import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import generetedToken from '../utils/token.js';
import Usuario from '../repository/usuario.js';
import Permissao from '../repository/permissao.js';
import RecuperacaoSenha from '../repository/recuperacaoSenha.js';
import AuditoriaService from '../services/auditoria.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validarNome, validarTelefone, validarSenha, validarCodigo, limparTelefone } from '../utils/validacoes.js';
import { enviarSms } from '../utils/sms.js';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 24 * 60 * 60 * 1000 //10 dias

}

//validacao do codigo de recuperacao de senha
const CODIGO_VALIDADE_MINUTOS = 10;
const CODIGO_MAX_TENTATIVAS = 5;

//gera um codigo numerico de 6 digitos (criptograficamente seguro)
function gerarCodigo(){
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

//resposta de validacao com campo especifico: {field, message}
function erroCampo(res, field, message){
    return res.status(400).json({ field, message });
}

const router = express.Router();

//registo: cria sempre com perfil "Usuario" e NAO inicia sessao
//(a autenticacao acontece apenas no /login)
router.post('/register', async (req,res, next)=>{
    try{
        const {nome, telefone, senha} = req.body;

        if(!nome || !telefone || !senha){
            return res.status(400).json({message: "nome ou telefone ou senha nao forma providenciadas"})
        }

        const erroNome = validarNome(nome);
        if(erroNome){
            return erroCampo(res, "nome", erroNome);
        }

        const erroTel = validarTelefone(telefone);
        if(erroTel){
            return erroCampo(res, "telefone", erroTel);
        }

        const erroSenha = validarSenha(senha);
        if(erroSenha){
            return erroCampo(res, "senha", erroSenha);
        }

        const telefoneLimpo = limparTelefone(telefone);
        const nomeLimpo = String(nome).trim();

        if(await Usuario.existeTelefone(telefoneLimpo)){
            return erroCampo(res, "telefone", "O usuario ja existe");
        }

        //o nome de utilizador serve de identificador de acesso: tem de ser unico
        if(await Usuario.existeNome(nomeLimpo)){
            return erroCampo(res, "nome", "O nome de utilizador ja existe");
        }

        const senhaHash = await bcrypt.hash(senha,10);

        //perfil 2 = Usuario
        const novo = await Usuario.create({
            nome: nomeLimpo,
            telefone: telefoneLimpo,
            senhaHash,
            id_perfil: 2
        });

        //sem cookie/token: o cliente autentica-se depois no /login
        res.status(201).json({
            message: "usuario registrado com sucesso",
            user: {
                id: novo.id,
                nome: novo.nome,
                telefone: novo.telefone,
                perfil: "Usuario"
            }
        });
    }catch(err){
        next(err);
    }
})

//login por nome de utilizador + senha
router.post('/login', async(req,res, next)=>{
    try{
        const {nome, senha} = req.body

        if(!nome || !senha){
            return res.status(400).json({message: "nome ou senha nao foram providenciados"})
        }

        const nomeLimpo = String(nome).trim();

        const userData = await Usuario.findByNomeComSenha(nomeLimpo);
        if(!userData){
            return res.status(401).json({message: "Nome ou senha invalidos"})
        }

        const isMatch = await bcrypt.compare(senha, userData.senha)

        if(!isMatch){
            return res.status(401).json({message: "Nome ou senha invalidos"})
        }

        //contas inativas nao iniciam sessao
        if(userData.estado !== "Ativo"){
            return res.status(403).json({message: "Conta inativa: contacte o administrador"})
        }

        //gerando o token
        const token = generetedToken(userData.id);

        // armazenando as informacoes no cookie
        res.cookie('token', token, cookieOptions)

        await Usuario.registarAcesso(userData.id);

        //permissoes efetivas: perfil + excecoes individuais
        const permissoes = await Permissao.codigosEfetivos(userData.id, userData.id_perfil);

        res.status(200).json({message:"login feito com sucesso", user:{
            id: userData.id,
            nome: userData.nome,
            telefone: userData.telefone,
            perfil: userData.perfil,
            permissoes,
            deve_alterar_senha: userData.alteracao_obrigatoria_senha
        }})

    }catch(err){
        next(err);
    }

})

//recuperacao de senha (passo 1): pede o codigo, enviado por SMS ao telefone registado
router.post('/recuperar-senha', async (req,res, next)=>{
    try{
        const {telefone} = req.body;

        const erroTel = validarTelefone(telefone);
        if(erroTel){
            return erroCampo(res, "telefone", erroTel);
        }

        const telefoneLimpo = limparTelefone(telefone);
        const utilizador = await Usuario.findByTelefone(telefoneLimpo);

        //resposta generica: nao revela se o numero existe (evita enumeracao de contas)
        const resposta = { message: "Se o numero estiver registado, enviaremos um codigo de redefinicao." };

        if(utilizador){
            const codigo = gerarCodigo();
            const codigoHash = await bcrypt.hash(codigo, 10);
            const expiraEm = new Date(Date.now() + CODIGO_VALIDADE_MINUTOS * 60 * 1000);

            //um novo pedido invalida os codigos anteriores ainda pendentes
            await RecuperacaoSenha.invalidarPendentes(utilizador.id);
            await RecuperacaoSenha.create({ idUsuario: utilizador.id, codigoHash, expiraEm });

            await enviarSms(
                utilizador.telefone,
                `Faces: o seu codigo de redefinicao e ${codigo}. Valido por ${CODIGO_VALIDADE_MINUTOS} minutos.`
            );

            //em desenvolvimento devolvemos o codigo no corpo para permitir testar sem SMS real
            if(process.env.NODE_ENV !== 'production'){
                resposta.codigo = codigo;
            }
        }

        res.status(200).json(resposta);
    }catch(err){
        next(err);
    }
})

//recuperacao de senha (passo 2): valida o codigo e define a nova senha
router.post('/redefinir-senha', async (req,res, next)=>{
    try{
        const {telefone, codigo, senha_nova} = req.body;

        if(!telefone || !codigo || !senha_nova){
            return res.status(400).json({message: "telefone, codigo e senha_nova sao obrigatorios"})
        }

        const erroTel = validarTelefone(telefone);
        if(erroTel){
            return erroCampo(res, "telefone", erroTel);
        }

        const erroCodigo = validarCodigo(codigo);
        if(erroCodigo){
            return erroCampo(res, "codigo", erroCodigo);
        }

        const erroSenha = validarSenha(senha_nova);
        if(erroSenha){
            return erroCampo(res, "senha_nova", erroSenha);
        }

        const telefoneLimpo = limparTelefone(telefone);
        const utilizador = await Usuario.findByTelefone(telefoneLimpo);
        if(!utilizador){
            return erroCampo(res, "codigo", "Codigo invalido ou expirado");
        }

        const registo = await RecuperacaoSenha.findAtivo(utilizador.id);
        if(!registo){
            return erroCampo(res, "codigo", "Codigo invalido ou expirado");
        }

        if(registo.tentativas >= CODIGO_MAX_TENTATIVAS){
            return erroCampo(res, "codigo", "Demasiadas tentativas: peca um novo codigo");
        }

        const valido = await bcrypt.compare(String(codigo), registo.codigo_hash);
        if(!valido){
            await RecuperacaoSenha.incrementarTentativas(registo.id);
            return erroCampo(res, "codigo", "Codigo invalido ou expirado");
        }

        //codigo de uso unico: marca como usado e aplica a nova senha
        await RecuperacaoSenha.marcarUsado(registo.id);
        const senhaHash = await bcrypt.hash(senha_nova, 10);
        await Usuario.updateSenha(utilizador.id, senhaHash, false);

        res.status(200).json({message: "Senha redefinida com sucesso"});
    }catch(err){
        next(err);
    }
})

//sessao actual: devolve o utilizador logado (inclui permissoes efetivas)
router.get('/me', authenticate, (req,res)=>{
    res.status(200).json({user: req.user});
})

//actualizacao do proprio perfil: o id vem sempre da sessao autenticada.
//nome e telefone sao dados sensiveis (login e recuperacao de senha), por isso
//a alteracao exige a confirmação da senha actual.
router.patch('/me', authenticate, async (req,res, next)=>{
    try{
        const {nome, telefone, senha_atual} = req.body || {};

        const querNome = nome !== undefined;
        const querTelefone = telefone !== undefined;

        if(!querNome && !querTelefone){
            return res.status(400).json({message: "Nenhum campo para atualizar foi enviado"});
        }

        if(!senha_atual || typeof senha_atual !== "string"){
            return erroCampo(res, "senha_atual", "Confirme com a sua senha atual");
        }

        let nomeLimpo;
        if(querNome){
            if(typeof nome !== "string"){
                return erroCampo(res, "nome", "Nome invalido");
            }
            nomeLimpo = nome.trim();
            const erroNome = validarNome(nomeLimpo);
            if(erroNome){
                return erroCampo(res, "nome", erroNome);
            }
        }

        let telefoneLimpo;
        if(querTelefone){
            const erroTel = validarTelefone(telefone);
            if(erroTel){
                return erroCampo(res, "telefone", erroTel);
            }
            telefoneLimpo = limparTelefone(telefone);
        }

        const atual = await Usuario.findByIdComSenha(req.user.id);
        if(!atual){
            return res.status(404).json({message: "Utilizador nao encontrado"});
        }

        const isMatch = await bcrypt.compare(String(senha_atual), atual.senha);
        if(!isMatch){
            return res.status(401).json({ field: "senha_atual", message: "Senha atual invalida" });
        }

        const nomeFinal = querNome ? nomeLimpo : req.user.nome;
        const telefoneFinal = querTelefone ? String(telefoneLimpo) : String(req.user.telefone);

        if(nomeFinal === req.user.nome && telefoneFinal === String(req.user.telefone)){
            return res.status(400).json({message: "Nenhuma alteracao foi detectada"});
        }

        if(querNome && await Usuario.existeNome(nomeLimpo, req.user.id)){
            return res.status(409).json({ field: "nome", message: "Ja existe um utilizador com este nome" });
        }

        if(querTelefone && await Usuario.existeTelefone(telefoneLimpo, req.user.id)){
            return res.status(409).json({ field: "telefone", message: "Ja existe um utilizador com este telefone" });
        }

        const alteracoes = {};
        if(querNome) alteracoes.nome = nomeLimpo;
        if(querTelefone) alteracoes.telefone = telefoneLimpo;

        const atualizado = await Usuario.update(req.user.id, alteracoes);
        if(!atualizado){
            return res.status(404).json({message: "Utilizador nao encontrado"});
        }

        const perfilAtualizado = await Usuario.findById(req.user.id);
        if(!perfilAtualizado){
            return res.status(404).json({message: "Utilizador nao encontrado"});
        }

        //auditoria sem credenciais: apenas os dados de contacto alterados
        await AuditoriaService.registar({
            id_utilizador: req.user.id,
            entidade: "usuario",
            id_registo: req.user.id,
            operacao: "atualizar",
            antes: { nome: req.user.nome, telefone: req.user.telefone },
            depois: { nome: perfilAtualizado.nome, telefone: perfilAtualizado.telefone }
        });

        res.status(200).json({
            message: "Perfil atualizado com sucesso",
            user: perfilAtualizado
        });
    }catch(err){
        if(err.code === "23505"){
            const field = String(err.constraint || "").includes("nome") ? "nome" : "telefone";
            const message = field === "nome"
                ? "Ja existe um utilizador com este nome"
                : "Ja existe um utilizador com este telefone";
            return res.status(409).json({ field, message });
        }
        next(err);
    }
})

//troca de senha pelo proprio utilizador (primeiro acesso ou alteracao normal)
router.post('/alterar-senha', authenticate, async (req,res, next)=>{
    try{
        const {senha_atual, senha_nova} = req.body;

        if(!senha_atual || !senha_nova){
            return res.status(400).json({message: "senha_atual e senha_nova sao obrigatorias"})
        }

        const erroSenha = validarSenha(senha_nova);
        if(erroSenha){
            return erroCampo(res, "senha_nova", erroSenha);
        }

        const atual = await Usuario.findByIdComSenha(req.user.id);
        if(!atual){
            return res.status(404).json({message: "Utilizador nao encontrado"})
        }

        const isMatch = await bcrypt.compare(senha_atual, atual.senha);
        if(!isMatch){
            return res.status(401).json({ field: "senha_atual", message: "Senha atual invalida" })
        }

        const senhaHash = await bcrypt.hash(senha_nova, 10);
        await Usuario.updateSenha(req.user.id, senhaHash, false);

        res.status(200).json({message: "Senha alterada com sucesso"})
    }catch(err){
        next(err);
    }
})

//lista de utilizadores: apenas Administrador (mantido por compatibilidade)
router.get('/users', authenticate, authorize('Administrador'), async (req,res, next)=>{
    try{
        res.status(200).json({ users: await Usuario.findAll() });
    }catch(err){
        next(err);
    }
})

//logout
router.post('/logout',(req,res)=>{
    res.cookie('token','',{...cookieOptions, maxAge: 1})
    res.json({message: "logged out sucessfully"})
})

export default router;
