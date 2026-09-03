import jwt from 'jsonwebtoken';

function generetedToken(){
    return jwt.sign({id}, process.env.JWT_SECRET,{expiresIn: '30d'})
}

export default generetedToken;