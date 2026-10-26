import axios from 'axios';





const DEFAULT_API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";
const BASE_API = (
    import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");


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

//actualizacao do proprio perfil (nome/telefone) — exige a senha actual
export const updateMe = (data) => {
    return server.patch("api/auth/me", data);
};

//troca de senha pelo proprio utilizador autenticado
export const alterarSenha = (data) => {
    return server.post("api/auth/alterar-senha", data);
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

export const updateAtendimento = (id, data) => {
    return server.put(`api/atendimentos/${id}`, data);
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

export const aplicarDesconto = (atendimentoId, data) => {
    return server.post(`api/atendimentos/${atendimentoId}/descontos`, data);
};

export const getFidelizacao = (clienteId) => {
    return server.get(`api/clientes/${clienteId}/fidelizacao`);
};

//fidelizacao: preenchimento manual do cartao (exclusivo do Administrador)
export const marcarFidelizacaoManual = (clienteId, data) => {
    return server.post(`api/clientes/${clienteId}/fidelizacao/marcas`, data);
};

export const removerMarcaFidelizacao = (clienteId, movimentoId) => {
    return server.delete(`api/clientes/${clienteId}/fidelizacao/marcas/${movimentoId}`);
};

export const registarBeneficioFidelizacaoManual = (clienteId, data = {}) => {
    return server.post(`api/clientes/${clienteId}/fidelizacao/beneficios/utilizar`, data);
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

//servicos: modalidades
export const getServicoModalidades = (id) => {
    return server.get(`api/servicos/${id}/modalidades`);
};

export const createServicoModalidade = (id, data) => {
    return server.post(`api/servicos/${id}/modalidades`, data);
};

export const updateServicoModalidade = (id, data) => {
    return server.put(`api/servicos/modalidades/${id}`, data);
};

export const deleteServicoModalidade = (id) => {
    return server.delete(`api/servicos/modalidades/${id}`);
};

//servicos: aplicacoes associadas
export const getServicoAplicacoes = (id) => {
    return server.get(`api/servicos/${id}/aplicacoes`);
};

export const associarAplicacao = (id, aplicacaoId) => {
    return server.post(`api/servicos/${id}/aplicacoes`, { aplicacao_id: aplicacaoId });
};

export const desassociarAplicacao = (id, aplicacaoId) => {
    return server.delete(`api/servicos/${id}/aplicacoes/${aplicacaoId}`);
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

//---- movimentos de stock ----
export const getMovimentosEstoque = (params) => {
    return server.get("api/movimentos", { params });
};

export const getStockProduto = (produtoId) => {
    return server.get(`api/stock/${produtoId}`);
};

export const registrarEntradaEstoque = (data) => {
    return server.post("api/estoque/entrada", data);
};

export const registrarSaidaEstoque = (data) => {
    return server.post("api/estoque/saida", data);
};

export const registrarAjusteEstoque = (data) => {
    return server.post("api/estoque/ajuste", data);
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

//---- horarios ----
export const getHorariosFuncionario = (funcionarioId) => {
    return server.get(`api/funcionarios/${funcionarioId}/horarios`);
};

export const createHorarioFuncionario = (funcionarioId, data) => {
    return server.post(`api/funcionarios/${funcionarioId}/horarios`, data);
};

export const substituirHorariosFuncionario = (funcionarioId, horarios) => {
    return server.put(`api/funcionarios/${funcionarioId}/horarios`, { horarios });
};

export const updateHorarioFuncionario = (horarioId, data) => {
    return server.put(`api/horarios/${horarioId}`, data);
};

export const deleteHorarioFuncionario = (horarioId) => {
    return server.delete(`api/horarios/${horarioId}`);
};

//---- assiduidade ----
export const getAssiduidade = (params) => {
    return server.get("api/assiduidade", { params });
};

export const createAssiduidade = (data) => {
    return server.post("api/assiduidade", data);
};

// Cria ou atualiza o dia (funcionario, data) sem duplicar (PUT /api/assiduidade/dia)
export const registarDiaAssiduidade = (data) => {
    return server.put("api/assiduidade/dia", data);
};

export const updateAssiduidade = (id, data) => {
    return server.put(`api/assiduidade/${id}`, data);
};

//---- relatorio financeiro ----
export const getRelatorioFinanceiro = (params) => {
    return server.get("api/relatorios/financeiro", { params });
};

//---- salarios ----
export const getProcessamentos = (params) => {
    return server.get("api/salarios/processamentos", { params });
};



export const getProcessamentosFuncionario = (funcionarioId, params) => {
    return server.get("api/salarios/processamentos", { params: { funcionario: funcionarioId, ...params } });
};

export const getProcessamentoById = (id) => {
    return server.get(`api/salarios/processamentos/${id}`);
};

export const processarSalarios = (periodo) => {
    return server.post("api/salarios/processar", { periodo });
};

export const atualizarDeducoes = (id, deducoes) => {
    return server.put(`api/salarios/processamentos/${id}/deducoes`, { deducoes });
};

export const aprovarProcessamento = (id) => {
    return server.patch(`api/salarios/processamentos/${id}/aprovar`);
};

export const pagarProcessamento = (id) => {
    return server.patch(`api/salarios/processamentos/${id}/pagar`);
};

