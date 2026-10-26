//cria um erro de dominio com o status HTTP a devolver
export function criarErro(status, message) {
    const erro = new Error(message);
    erro.status = status;
    return erro;
}

// O Drizzle envolve os erros do PostgreSQL numa DrizzleQueryError; o SQLSTATE
// e a constraint originais ficam no `cause`. Percorremos a cadeia para os obter.
function percorrerCausas(error, visitar) {
    let atual = error;
    const vistos = new Set();

    while (atual && !vistos.has(atual)) {
        const resultado = visitar(atual);
        if (resultado !== undefined) return resultado;
        vistos.add(atual);
        atual = atual.cause;
    }

    return undefined;
}

export function codigoPostgres(error) {
    return percorrerCausas(error, (atual) => (
        typeof atual.code === "string" && /^[0-9A-Z]{5}$/.test(atual.code)
            ? atual.code
            : undefined
    ));
}

export function constraintPostgres(error) {
    return percorrerCausas(error, (atual) => (
        typeof atual.constraint === "string" ? atual.constraint : undefined
    ));
}
