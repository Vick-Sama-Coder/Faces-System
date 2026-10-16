import express from 'express';
import cors from 'cors';
import dotnev from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js'
import funcionarioRoutes from './routes/funcionario.js'
import servicoRoutes from './routes/servico.js'
import categoriaRoutes from './routes/categoria.js'
import usuarioRoutes from './routes/usuario.js'
import perfilRoutes from './routes/perfil.js'
import clienteRoutes from './routes/cliente.js'



//Carregando as variaveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
dotnev.config({
  path: path.join(__dirname, '../.env')
});

const app = express();
//Normaliza a origem (o .env pode ter "/" final, senao o browser bloqueia o CORS)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
  origin: new URL(CLIENT_URL).origin,
  credentials: true,
}));

//adicionando middlewares globais
app.use(express.json()); //para ler json
app.use(cookieParser()); //transformar string cookies em objetos

app.use("/api/auth",authRoutes);
app.use("/api", funcionarioRoutes);
app.use("/api", servicoRoutes);
app.use("/api", categoriaRoutes);
app.use("/api", usuarioRoutes);
app.use("/api", perfilRoutes);
app.use("/api", clienteRoutes);

//404 em JSON (rotas de API inexistentes)
app.use((req, res) => {
  res.status(404).json({ message: "Rota nao encontrada" });
});

//traduz erros conhecidos do PostgreSQL para o status correto
const ERROS_CONHECIDOS = {
  "22P02": [400, "Valor ou identificador invalido"], // sintaxe invalida (ex.: id nao numerico)
  "23502": [400, "Campo obrigatorio em falta"],       // not null violado
  "23503": [409, "Operacao bloqueada: existem registos associados"], // foreign key
  "23505": [409, "Registo duplicado"],                // unique violado
};

//handler de erros em JSON (sem stack em producao)
app.use((err, req, res, next) => {
  const [status, message] = ERROS_CONHECIDOS[err.code] || [500, "Erro interno do servidor"];

  if (status === 500) {
    console.error("Erro no servidor:", err.message);
  }

  res.status(status).json({ message });
});

export default app;
