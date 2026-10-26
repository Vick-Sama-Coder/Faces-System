import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path'
import { fileURLToPath } from 'url';
import net from 'node:net';
import { sslConfig } from './pgSsl.js';

// Servicos geridos (ex.: Neon) expoem varios IPs. O tempo de tentativa por
// endereco do Node (250 ms) e curto para redes lentas e provoca ETIMEDOUT.
net.setDefaultAutoSelectFamilyAttemptTimeout?.(2000);


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
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: sslConfig(),
  connectionTimeoutMillis: 15000,
  // Ajuda com bases geridas (Neon/Supabase), que podem ter ligacoes idle
  // fechadas pelo servidor. A pool volta a abrir ligacoes quando necessario.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pool.on("connect", () => {
  console.log("Database conectada ")
});

// Um erro numa ligacao idle nao deve derrubar o backend. A pool remove a
// ligacao invalida e cria outra no proximo pedido.
pool.on("error", (err) => {
  console.error("[db] Erro numa ligacao inativa da pool:", err.code || "", err.message);
})

export default pool;



