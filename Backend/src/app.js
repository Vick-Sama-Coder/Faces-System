import express from 'express';
import cors from 'cors';
import dotnev from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser'

//Carregando as variaveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
dotnev.config({
  path: path.join(__dirname, '../.env')
});

const app = express();
app.use(cors());

//adicionando middlewares globais
app.use(express.json()); //para ler json
app.use(cookieParser()); //transformar string cookies em objetos






export default app;
