import express from 'express';
import bcrypt from 'bcrypt';
import generetedToken from '../utils/token.js';
import Usuario from '../repository/usuario.js';
import Permissao from '../repository/permissao.js';
import AuditoriaService from '../services/auditoria.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validarNome, validarTelefone, validarSenha, limparTelefone } from '../utils/validacoes.js';

const PRODUCAO = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    secure: PRODUCAO,
    // SameSite=None exige Secure; em desenvolvimento (HTTP) usamos Lax para
    // que o browser nao rejeite o cookie. Em producao mantem-se first-party
    // atraves do proxy /api do frontend.
    sameSite: PRODUCAO ? 'none' : 'lax',
    ...(PRODUCAO ? { partitioned: true } : {}),
    maxAge: 10 * 24 * 60 * 60 * 1000 //10 dias

}

//senha inicial de quem se regista: tem de ser mostrada e trocada no primeiro acesso
const SENHA_PADRAO_REGISTO = "12345";

//resposta de validacao com campo especifico: {field, message}
function erroCampo(res, field, message){
    return res.status(400).json({ field, message });
}

const router = express.Router();

//registo: cria sempre com perfil "Usuario" e com a senha padrao 12345.
//A conta entra em "primeiro acesso": o login funciona, mas o sistema obriga
//a definir uma nova senha antes de permitir o uso normal.
router.post('/register', async (req,res, next)=>{
    try{
        const {nome, telefone} = req.body;

        if(!nome || !telefone){
            return res.status(400).json({message: "nome e telefone sao obrigatorios"})
        }

        const erroNome = validarNome(nome);
        if(erroNome){
            return erroCampo(res, "nome", erroNome);
        }

        const erroTel = validarTelefone(telefone);
        if(erroTel){
            return erroCampo(res, "telefone", erroTel);
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

        //a senha padrao e pequena de proposito: obriga a troca no primeiro acesso
        const senhaHash = await bcrypt.hash(SENHA_PADRAO_REGISTO,10);

        //perfil 2 = Usuario
        const novo = await Usuario.create({
            nome: nomeLimpo,
            telefone: telefoneLimpo,
            senhaHash,
            id_perfil: 2,
            alteracaoObrigatoria: true
        });

        //sem cookie/token: o utilizador autentica-se no login normal
        res.status(201).json({
            message: "conta criada com sucesso",
            senha_padrao: SENHA_PADRAO_REGISTO,
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

//sessao actual: devolve o utilizador logado (inclui permissoes efetivas)
router.get('/me', authenticate, (req,res)=>{
    res.status(200).json({user: req.user});
})

//primeiro acesso: a conta autenticou-se com a senha padrao e tem de definir
//uma nova senha antes de poder usar o sistema
router.post('/primeiro-acesso', authenticate, async (req,res, next)=>{
    try{
        const {senha_nova} = req.body;

        if(!senha_nova){
            return res.status(400).json({message: "senha_nova e obrigatoria"})
        }

        const erroSenha = validarSenha(senha_nova);
        if(erroSenha){
            return erroCampo(res, "senha_nova", erroSenha);
        }

        if(!req.user.alteracao_obrigatoria_senha){
            return res.status(400).json({message: "Esta conta ja tem uma senha definida"});
        }

        const senhaHash = await bcrypt.hash(senha_nova, 10);
        await Usuario.updateSenha(req.user.id, senhaHash, false);

        const perfilAtualizado = await Usuario.findById(req.user.id);
        const permissoes = await Permissao.codigosEfetivos(req.user.id, req.user.id_perfil);

        res.status(200).json({
            message: "Senha definida com sucesso",
            user: {
                id: perfilAtualizado.id,
                nome: perfilAtualizado.nome,
                telefone: perfilAtualizado.telefone,
                perfil: perfilAtualizado.perfil,
                permissoes,
                deve_alterar_senha: false,
                alteracao_obrigatoria_senha: false
            }
        });
    }catch(err){
        next(err);
    }
})

//actualizacao do proprio perfil: o id vem sempre da sessao autenticada.
//nome e telefone sao dados sensiveis de acesso, por isso a alteracao
//exige a confirmação da senha actual.
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
        if(codigoPostgres(err) === "23505"){
            const field = String(constraintPostgres(err) || "").includes("nome") ? "nome" : "telefone";
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
