import jwt from 'jsonwebtoken';
import app from '../app.js'

function generetedToken(id){
    return jwt.sign({id}, process.env.JWT_SECRET,{expiresIn: '30d'})
}

export default generetedToken;




