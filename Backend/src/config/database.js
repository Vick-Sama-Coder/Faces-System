import pg, { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path'
import { fileURLToPath } from 'url';
import { error } from 'console';


//Caminho do ficheiro atual
const __filename = fileURLToPath(import.meta.url) //variavel que contem o caminho atual do ficheiro
const __dirname = path.dirname(__filename) // converte o caminho para o caminho o nome da pasta

//configurando o caminho do .env
dotenv.config({
  path: path.join(__dirname, '../../.env')
});
const { Pool } = pg;

//criando a ponte de conxecao na base de dados SalaoFaces
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD
});

pool.on("connect", () => {
  console.log("Database conectada ")
});

pool.on("error" , (err) => {
  console.error("A conexao falhou com a base de dados: ", err)
  process.exit(-1);
})

export default pool;



