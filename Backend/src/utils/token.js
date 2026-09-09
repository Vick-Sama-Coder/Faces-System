import jwt from 'jsonwebtoken';
<<<<<<< HEAD

function generetedToken(){
    return jwt.sign({id}, process.env.JWT_SECRET,{expiresIn: '30d'})
}

export default generetedToken;
=======
import app from '../app.js';




export default function generateToken(user_id){
    return jwt.sign({user_id}, process.env.JWT_SECRET, { expiresIn: "30d"})
}

>>>>>>> ce732c4 (Criando a funcao de geracao de token)
