import axios from 'axios';
import { useEffect } from 'react';


const BASE_API = "http://localhost:5000/";

const server = axios.create({
    baseURL: BASE_API,

});

const loginUser = (data) =>{
    server.post("api/auth/login",data);
};

const registerUser = (data) =>{
    server.post("api/auth/register",data);
};


export default loginUser registerUser;

