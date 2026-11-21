import jwt from 'jsonwebtoken';
import { DIAS_SESSAO } from './sessao.js';


function generetedToken(id){
    return jwt.sign({id}, process.env.JWT_SECRET,{expiresIn: `${DIAS_SESSAO}d`})
}

export default generetedToken;




