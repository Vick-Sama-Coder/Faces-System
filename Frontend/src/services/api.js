import axios from 'axios';


const BASE_API = "http://192.168.0.17:5000/";

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

//recuperacao de senha: pede o codigo (enviado por SMS ao telefone registado)
export const requestPasswordReset = (data) => {
    return server.post("api/auth/recuperar-senha", data);
};

//recuperacao de senha: valida o codigo e define a nova senha
export const resetPassword = (data) => {
    return server.post("api/auth/redefinir-senha", data);
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

//---- categorias de servico ----
export const getCategorias = () => {
    return server.get("api/categorias");
};

export const createCategoria = (data) => {
    return server.post("api/categorias", data);
};

export const updateCategoria = (id, data) => {
    return server.put(`api/categorias/${id}`, data);
};

export const deleteCategoria = (id) => {
    return server.delete(`api/categorias/${id}`);
};

//---- funcionarios ----
export const getFuncionarios = () => {
    return server.get("api/funcionarios");
};

export const createFuncionario = (data) => {
    return server.post("api/funcionarios", data);
};

export const updateFuncionario = (id, data) => {
    return server.put(`api/funcionarios/${id}`, data);
};

export const updateFuncionarioEstado = (id, estado) => {
    return server.patch(`api/funcionarios/${id}/estado`, { estado });
};

export const deleteFuncionario = (id) => {
    return server.delete(`api/funcionarios/${id}`);
};

//---- atendimentos ----
//registo imediato: { cliente_id, servicos: [{ servico_id, funcionario_id, preco_praticado, desconto }] }
export const createAtendimento = (data) => {
    return server.post("api/atendimentos", data);
};

export const getAtendimentos = (params) => {
    return server.get("api/atendimentos", { params });
};

export const getAtendimento = (id) => {
    return server.get(`api/atendimentos/${id}`);
};

export const concluirAtendimento = (id) => {
    return server.patch(`api/atendimentos/${id}/concluir`);
};

export const anularAtendimento = (id, motivo) => {
    return server.post(`api/atendimentos/${id}/anular`, { motivo });
};

export const registrarPagamento = (atendimentoId, data) => {
    return server.post(`api/atendimentos/${atendimentoId}/pagamentos`, data);
};

export const getPagamentoAtendimento = (atendimentoId) => {
    return server.get(`api/atendimentos/${atendimentoId}/pagamento`);
};

export const getFidelizacao = (clienteId) => {
    return server.get(`api/clientes/${clienteId}/fidelizacao`);
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

//clientes: activar / desactivar
export const updateClienteEstado = (id, estado) => {
    return server.patch(`api/clientes/${id}/estado`, { estado });
};

//servicos: listar todos (por omissao a API devolve apenas activos)
export const getServicos = (params) => {
    return server.get("api/servicos", { params });
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

//servicos: activar / desactivar
export const updateServicoEstado = (id, estado) => {
    return server.patch(`api/servicos/${id}/estado`, { estado });
};

//---- utilizadores (gestao de contas) ----
export const getUsuarios = () => {
    return server.get("api/usuarios");
};

export const createUsuario = (data) => {
    return server.post("api/usuarios", data);
};

export const updateUsuario = (id, data) => {
    return server.put(`api/usuarios/${id}`, data);
};

export const updateUsuarioEstado = (id, estado) => {
    return server.patch(`api/usuarios/${id}/estado`, { estado });
};

export const reporSenhaUsuario = (id) => {
    return server.post(`api/usuarios/${id}/repor-senha`);
};

export const getPermissoesUsuario = (id) => {
    return server.get(`api/usuarios/${id}/permissoes`);
};

export const updatePermissoesUsuario = (id, { conceder = [], revogar = [] }) => {
    return server.put(`api/usuarios/${id}/permissoes`, { conceder, revogar });
};

//---- perfis e catalogo de permissoes ----
export const getPerfis = () => {
    return server.get("api/perfis");
};

export const getPerfil = (id) => {
    return server.get(`api/perfis/${id}`);
};

export const createPerfil = (data) => {
    return server.post("api/perfis", data);
};

export const updatePerfil = (id, data) => {
    return server.put(`api/perfis/${id}`, data);
};

export const updatePermissoesPerfil = (id, permissoes) => {
    return server.put(`api/perfis/${id}/permissoes`, { permissoes });
};

export const getPermissoes = () => {
    return server.get("api/permissoes");
};

//---- dashboard ----
export const getDashboard = () => {
    return server.get("api/dashboard");
};

//---- relatorios ----
//todos os relatorios partilham o mesmo filtro de periodo (?de=&ate=)
export const getRelatorioResumo = (params) => {
    return server.get("api/relatorios/resumo", { params });
};

export const getRelatorioCaixa = (params) => {
    return server.get("api/relatorios/caixa", { params });
};

export const getRelatorioServicos = (params) => {
    return server.get("api/relatorios/servicos", { params });
};

export const getRelatorioFuncionarios = (params) => {
    return server.get("api/relatorios/funcionarios", { params });
};

export const getRelatorioAssiduidade = (params) => {
    return server.get("api/relatorios/assiduidade", { params });
};

export const getRelatorioClientes = (params) => {
    return server.get("api/relatorios/clientes", { params });
};

export const getRelatorioFidelizacao = (params) => {
    return server.get("api/relatorios/fidelizacao", { params });
};

export const getRelatorioAnulacoes = (params) => {
    return server.get("api/relatorios/anulacoes", { params });
};

export const getRelatorioMovimentos = (params) => {
    return server.get("api/relatorios/movimentos", { params });
};

//---- categorias de despesa ----
export const getCategoriasDespesa = () => {
    return server.get("api/categorias-despesa");
};

export const createCategoriaDespesa = (data) => {
    return server.post("api/categorias-despesa", data);
};

//---- despesas ----
export const getDespesas = (params) => {
    return server.get("api/despesas", { params });
};

export const createDespesa = (data) => {
    return server.post("api/despesas", data);
};

export const updateDespesa = (id, data) => {
    return server.put(`api/despesas/${id}`, data);
};

export const deleteDespesa = (id) => {
    return server.delete(`api/despesas/${id}`);
};

//---- auditoria / logs ----
export const getAuditoria = (params) => {
    return server.get("api/auditoria", { params });
};

export const getAuditoriaOpcoes = () => {
    return server.get("api/auditoria/opcoes");
};

export const getAuditoriaRegisto = (id) => {
    return server.get(`api/auditoria/${id}`);
};

