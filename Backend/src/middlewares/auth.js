import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

//Verifica o token no cookie e carrega o utilizador + perfil para req.user
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
            `select u.id, u.nome, u.telefone, u.id_perfil, p.nome as perfil
             from usuario u
             join perfil p on p.id = u.id_perfil
             where u.id = $1`,
            [payload.id]
        );

        if(result.rows.length === 0){
            return res.status(401).json({message: "Nao autenticado: utilizador nao existe"});
        }

        req.user = result.rows[0];
        return next();
    }catch(err){
        return next(err);
    }
}

//Autorizacao por perfil: authorize('Administrador')
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
