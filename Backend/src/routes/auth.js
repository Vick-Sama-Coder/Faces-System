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

    const userExists = await pool.query("select * from usuario where telefone = $1",[telefone])

    //Verificando a existencia de usuario
    if(userExists.rows.length > 0){
        return res.status(400).json({message: "O usuario ja existe"})
    }

    //Criando a senha com hash
    const senhaHash = await bcrypt.hash(senha,10);

    //criando novo usuario
    const newUser = await pool.query(
        "insert into usuario (nome, senha, telefone,id_perfil) values ($1,$2,$3,$4) returning id, nome, telefone ",
        [nome,senhaHash,telefone,1]
    )

     const userData = newUser.rows;

    //gerando o token
    const token = generetedToken(userData.id);

    // armazenando as informacoes no cookie
    res.cookie('token', token, cookieOptions)

    res.status(201).json({
        message: "usuario registrado com sucesso"
    })
})

//login
router.post('/login', async(req,res)=>{
    const {nome, senha} = req.body

    if(!nome || !senha){
        res.status(400).json({message: "nome ou senha nao foram providenciados"})
    }

    const userExists = await pool.query('select * from usuario where nome = $1',[nome])
    if(userExists.rows.length === 0){
        res.status(400).json({message: "Esse usuario nao existe"})
    }

    const userData = userExists.rows[0];
    
    const isMatch = await bcrypt.compare(senha,userData.senha)

    if(!isMatch){
        res.status(400).json({message: "A senha esta invalida"})
    }

    

    //gerando o token
    const token = generetedToken(userData.id);

    // armazenando as informacoes no cookie
    res.cookie('token', token, cookieOptions)

    res.status(201).json({message:"login feito com sucesso", user:{
        id: userData.id,
        nome: userData.nome,
        telefone: userData.telefone,

    }})

})

//logout

router.post('/logout',(req,res)=>{
    res.cookie('token','',{...cookieOptions, maxAge: 1})
    res.json({message: "logged out sucessfully"})
})

export default router;






