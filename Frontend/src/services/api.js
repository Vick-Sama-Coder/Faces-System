import axios from 'axios';


const BASE_API = "http://192.168.0.14:5000/";

const server = axios.create({
    baseURL: BASE_API,
    withCredentials: true

});

//extrai a mensagem de erro vinda do backend
export const getApiError = (err) => {
    return err?.response?.data?.message || "Erro de conexao com o servidor";
};

//extrai o campo associado ao erro (backend devolve {field, message})
export const getApiErrorField = (err) => {
    return err?.response?.data?.field || null;
};

export const loginUser = (data) => {
    return server.post("api/auth/login", data);
};

export const registerUser = (data) => {
    return server.post("api/auth/register", data);
};

export const getMe = () => {
    return server.get("api/auth/me");
};

export const logoutUser = () => {
    return server.post("api/auth/logout");
};

export const getUsers = () => {
    return server.get("api/auth/users");
};

//cria um novo atendimento (agendamento de servico)
export const createAtendimento = (data) => {
    return server.post("api/atendimentos", data);
};

//clientes: listar todos
export const getClientes = () => {
    return server.get("api/clientes");
};

//clientes: criar novo
export const createCliente = (data) => {
    return server.post("api/clientes", data);
};

//clientes: actualizar
export const updateCliente = (id, data) => {
    return server.put(`api/clientes/${id}`, data);
};

//clientes: desactivar (eliminar)
export const deleteCliente = (id) => {
    return server.delete(`api/clientes/${id}`);
};

//servicos: listar todos
export const getServicos = () => {
    return server.get("api/servicos");
};

//servicos: criar novo
export const createServico = (data) => {
    return server.post("api/servicos", data);
};

//servicos: actualizar
export const updateServico = (id, data) => {
    return server.put(`api/servicos/${id}`, data);
};

//servicos: eliminar
export const deleteServico = (id) => {
    return server.delete(`api/servicos/${id}`);
};

