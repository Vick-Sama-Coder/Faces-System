import express from 'express';
import cors from 'cors';
import dotnev from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js'



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

app.use("/api/auth",authRoutes)

//404 em JSON (rotas de API inexistentes)
app.use((req, res) => {
  res.status(404).json({ message: "Rota nao encontrada" });
});

//handler de erros em JSON (sem stack em producao)
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err.message);
  res.status(err.status || 500).json({
    message: err.status ? err.message : "Erro interno do servidor",
  });
});

export default app;
