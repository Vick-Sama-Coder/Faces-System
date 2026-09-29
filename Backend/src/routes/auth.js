import express from 'express';
import pool from '../config/database.js'
import bcrypt from 'bcrypt';
import generetedToken from '../utils/token.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 24 * 60 * 60 * 1000 //10 dias

}

//sanitiza o telefone: mantem apenas digitos (a coluna na BD e int)
function limparTelefone(telefone){
    return String(telefone).replace(/\D/g, '');
}

const router = express.Router();

//registo: cria sempre com perfil "Usuario" (auto-registo nunca cria Administrador)
router.post('/register', async (req,res, next)=>{
    try{
        const {nome, telefone, senha} = req.body;

        if(!nome || !telefone || !senha){
            return res.status(400).json({message: "nome ou telefone ou senha nao forma providenciadas"})
        }

        if(String(senha).length < 6){
            return res.status(400).json({message: "A senha deve ter no minimo 6 caracteres"})
        }

        const telefoneLimpo = limparTelefone(telefone);

        //a coluna na BD e int (max 2147483647) — valida faixa antes de inserir
        if(telefoneLimpo.length < 9 || Number(telefoneLimpo) > 2147483647){
            return res.status(400).json({message: "Telefone invalido"})
        }

        const userExists = await pool.query("select * from usuario where telefone = $1",[telefoneLimpo])

        //Verificando a existencia de usuario
        if(userExists.rows.length > 0){
            return res.status(400).json({message: "O usuario ja existe"})
        }

        //Criando a senha com hash
        const senhaHash = await bcrypt.hash(senha,10);

        //criando novo usuario (perfil 2 = Usuario)
        const newUser = await pool.query(
            "insert into usuario (nome, senha, telefone,id_perfil) values ($1,$2,$3,$4) returning id, nome, telefone ",
            [nome,senhaHash,telefoneLimpo,2]
        )

        const userData = newUser.rows[0];

        //gerando o token
        const token = generetedToken(userData.id);

        // armazenando as informacoes no cookie
        res.cookie('token', token, cookieOptions)

        res.status(201).json({
            message: "usuario registrado com sucesso",
            user: {
                id: userData.id,
                nome: userData.nome,
                telefone: userData.telefone,
                perfil: "Usuario"
            }
        })
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

        const telefoneLimpo = limparTelefone(telefone);

        const userExists = await pool.query(
            `select u.*, p.nome as perfil from usuario u
             join perfil p on p.id = u.id_perfil
             where u.telefone = $1`,
            [telefoneLimpo]
        )
        if(userExists.rows.length === 0){
            return res.status(401).json({message: "Telefone ou senha invalidos"})
        }

        const userData = userExists.rows[0];

        const isMatch = await bcrypt.compare(senha,userData.senha)

        if(!isMatch){
            return res.status(401).json({message: "Telefone ou senha invalidos"})
        }

        //gerando o token
        const token = generetedToken(userData.id);

        // armazenando as informacoes no cookie
        res.cookie('token', token, cookieOptions)

        res.status(200).json({message:"login feito com sucesso", user:{
            id: userData.id,
            nome: userData.nome,
            telefone: userData.telefone,
            perfil: userData.perfil

        }})

    }catch(err){
        next(err);
    }

})

//sessao actual: devolve o utilizador logado (base da autorizacao no frontend)
router.get('/me', authenticate, (req,res)=>{
    res.status(200).json({user: req.user});
})

//lista de utilizadores: apenas Administrador
router.get('/users', authenticate, authorize('Administrador'), async (req,res, next)=>{
    try{
        const result = await pool.query(
            "select id, nome, telefone, id_perfil from usuario order by id"
        );
        res.status(200).json({users: result.rows});
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






