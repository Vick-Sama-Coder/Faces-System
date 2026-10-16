import express from 'express';
import bcrypt from 'bcrypt';
import generetedToken from '../utils/token.js';
import Usuario from '../repository/usuario.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validarNome, validarTelefone, validarSenha, limparTelefone } from '../utils/validacoes.js';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 24 * 60 * 60 * 1000 //10 dias

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

        if(await Usuario.existeTelefone(telefoneLimpo)){
            return erroCampo(res, "telefone", "O usuario ja existe");
        }

        const senhaHash = await bcrypt.hash(senha,10);

        //perfil 2 = Usuario
        const novo = await Usuario.create({
            nome,
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

//login por telefone + senha
router.post('/login', async(req,res, next)=>{
    try{
        const {telefone, senha} = req.body

        if(!telefone || !senha){
            return res.status(400).json({message: "telefone ou senha nao foram providenciados"})
        }

        const erroTel = validarTelefone(telefone);
        if(erroTel){
            return erroCampo(res, "telefone", erroTel);
        }

        const telefoneLimpo = limparTelefone(telefone);

        const userData = await Usuario.findByTelefoneComSenha(telefoneLimpo);
        if(!userData){
            return res.status(401).json({message: "Telefone ou senha invalidos"})
        }

        const isMatch = await bcrypt.compare(senha, userData.senha)

        if(!isMatch){
            return res.status(401).json({message: "Telefone ou senha invalidos"})
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

        res.status(200).json({message:"login feito com sucesso", user:{
            id: userData.id,
            nome: userData.nome,
            telefone: userData.telefone,
            perfil: userData.perfil,
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
