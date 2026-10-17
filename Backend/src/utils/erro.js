//cria um erro de dominio com o status HTTP a devolver
export function criarErro(status, message) {
    const erro = new Error(message);
    erro.status = status;
    return erro;
}
