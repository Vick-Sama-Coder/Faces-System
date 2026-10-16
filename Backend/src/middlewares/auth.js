import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
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

        const result = await pool.query(
            `select u.id, u.nome, u.telefone, u.id_perfil, u.estado,
                    u.alteracao_obrigatoria_senha, p.nome as perfil
             from usuario u
             join perfil p on p.id = u.id_perfil
             where u.id = $1`,
            [payload.id]
        );

        if(result.rows.length === 0){
            return res.status(401).json({message: "Nao autenticado: utilizador nao existe"});
        }

        const user = result.rows[0];

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
