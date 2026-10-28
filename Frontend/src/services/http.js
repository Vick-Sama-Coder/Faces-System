import axios from 'axios';

const DEFAULT_API_URL = import.meta.env.DEV ? 'http://localhost:5000' : '';
export const BASE_API = (
    import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, '');

// Instancia normal usada por toda a aplicacao. O adapter offline e instalado
// em services/offline.js para manter as funcoes de API simples.
const server = axios.create({
    // Em producao usa "/" para que "api/..." seja sempre resolvido a partir
    // da raiz, mesmo em rotas mais profundas da SPA.
    baseURL: BASE_API || '/',
    withCredentials: true,
    timeout: 60000
});

// Instancia usada apenas pela sincronizacao da fila offline. Nao tem o adapter
// de cache/fila, para evitar que um reenvio volte a entrar na fila.
export const syncServer = axios.create({
    baseURL: BASE_API || '/',
    withCredentials: true,
    timeout: 90000
});

export default server;
