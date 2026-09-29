import axios from 'axios';


const BASE_API = "http://localhost:5000/";

const server = axios.create({
    baseURL: BASE_API,
    withCredentials: true

});

export const loginUser = (data) =>{
    server.post("api/auth/login",data);
};

export const registerUser = (data) =>{
    server.post("api/auth/register",data);
};


 
// export default registerUser;



