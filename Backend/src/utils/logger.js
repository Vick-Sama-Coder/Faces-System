// Logger central simples. Mantem o formato consistente e evita chamadas
// espalhadas a `console.*` com niveis diferentes.
function escrever(nivel, args) {
    const prefixo = `[${new Date().toISOString()}] [${nivel}]`;

    if (nivel === 'error') {
        console.error(prefixo, ...args);
    } else if (nivel === 'warn') {
        console.warn(prefixo, ...args);
    } else {
        console.log(prefixo, ...args);
    }
}

export const logger = {
    info: (...args) => escrever('info', args),
    warn: (...args) => escrever('warn', args),
    error: (...args) => escrever('error', args)
};

export default logger;
