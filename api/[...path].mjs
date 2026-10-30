// Fallback para quando o projeto Vercel usa a raiz do repositorio em vez de
// definir Root Directory = Frontend. A implementacao fica num unico lugar.
export { default } from '../Frontend/api/_proxy.mjs';
