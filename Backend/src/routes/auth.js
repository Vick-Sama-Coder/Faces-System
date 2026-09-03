import express from 'express';
import pool from '../config/database.js'
import bcrypt from 'bcrypt';
import generetedToken from '../utils/token.js';

const cookieOptions = {
    HttpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 10 * 24 * 60 * 60 * 1000 //10 dias

}

const router = express.Router();

router.post('/register', async (req,res)=>{
    const {nome, telefone, senha} = req.body;

    if(!nome || !telefone || !senha){
        return res.status(400).json({message: "nome ou telefone ou senha nao forma providenciadas"})
    }

    const userExists = await pool.query("select * from usuario where telefone = $1"[telefone])

    //Verificando a existencia de usuario
    if(userExists.rows.length > 0){
        return res.status(400).json({message: "O usuario ja existe"})
    }

    //Criando a senha com hash
    const senhaHash = await bcrypt.hash(senha,10);

    //criando novo usuario
    const newUser = await pool.query(
        'insert into usuario (nome, senha, telefone,id_perfil) values ($1,$2,$3) returning id,nome,telefone '
        [nome,senhaHash,telefone,1]
    )

    //gerando o token
    const token = generetedToken(newUser.rows[0].id);

    // armazenando as informacoes no cookie
    res.cookie('token', token, cookieOptions)
})

//login
router.post('/login', async(req,res)=>{
    const {nome, senha} = req.body

    if(!nome || !senha){
        res.status(400).json({message: "nome ou senha nao foram providenciados"})
    }

    const userExists = await pool.query('select * from usuario where nome = $1'[nome])
    if(userExists.rows[0].length === 0){
        res.status(400).json({message: "Esse usuario nao existe"})
    }

    const isMatch = await bcrypt.compare(senha, userExists.rows[0].senha)

    if(!isMatch){
        res.status(400).json({message: "A senha esta invalida"})
    }

    //gerando o token
    const token = generetedToken(userExists.rows[0].id);

    // armazenando as informacoes no cookie
    res.cookie('token', token, cookieOptions)

    res.json({user:{
        id: userExists.rows[0].id,
        nome: userExists.rows[0].nome,
        telefone: userExists.rows[0].telefone,

    }})
})

//logout

router.post('/logout',(req,res)=>{
    res.cookie('token','',{...cookieOptions, maxAge: 1})
    res.json({message: "logged out sucessfully"})
})

export default router;

