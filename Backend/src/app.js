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
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

//adicionando middlewares globais
app.use(express.json()); //para ler json
app.use(cookieParser()); //transformar string cookies em objetos

app.use("/api/auth",authRoutes)






export default app;
