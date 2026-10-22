import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import db from '../db/client.js';
import { perfil, usuario } from '../db/schema/index.js';
import Permissao from '../repository/permissao.js';

//Verifica o token no cookie, carrega o utilizador + perfil + permissoes para req.user
export async function authenticate(req, res, next){
    try{
        const token = req.cookies?.token;

        if(!token){
            return res.status(401).json({message: "Nao autenticado: token em falta"});
        }

        let payload;
        try{
            payload = jwt.verify(token, process.env.JWT_SECRET);
        }catch(err){
            return res.status(401).json({message: "Nao autenticado: token invalido ou expirado"});
        }

        const [user] = await db.select({
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            id_perfil: usuario.id_perfil,
            estado: usuario.estado,
            alteracao_obrigatoria_senha: usuario.alteracao_obrigatoria_senha,
            perfil: perfil.nome
        })
            .from(usuario)
            .innerJoin(perfil, eq(perfil.id, usuario.id_perfil))
            .where(eq(usuario.id, payload.id))
            .limit(1);

        if(!user){
            return res.status(401).json({message: "Nao autenticado: utilizador nao existe"});
        }

        //contas inativas perdem o acesso, mesmo com token valido
        if(user.estado !== "Ativo"){
            return res.status(403).json({message: "Conta inativa: contacte o administrador"});
        }

        const permissoes = await Permissao.codigosEfetivos(user.id, user.id_perfil);

        req.user = {
            id: user.id,
            nome: user.nome,
            telefone: user.telefone,
            id_perfil: user.id_perfil,
            perfil: user.perfil,
            estado: user.estado,
            alteracao_obrigatoria_senha: user.alteracao_obrigatoria_senha,
            permissoes
        };

        return next();
    }catch(err){
        return next(err);
    }
}

//Autorizacao por perfil (nome): authorize('Administrador')
export function authorize(...perfis){
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({message: "Nao autenticado"});
        }

        if(!perfis.includes(req.user.perfil)){
            return res.status(403).json({message: "Acesso negado: perfil sem autorizacao"});
        }

        return next();
    };
}

//Autorizacao fina por permissao: authorizePermission('clientes:escrever')
//Basta possuir UMA das permissoes indicadas.
export function authorizePermission(...codigos){
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({message: "Nao autenticado"});
        }

        const permissoes = req.user.permissoes || [];
        const autorizado = codigos.some((codigo) => permissoes.includes(codigo));

        if(!autorizado){
            return res.status(403).json({message: "Acesso negado: permissao insuficiente"});
        }

        return next();
    };
}
