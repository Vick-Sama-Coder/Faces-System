import dotnev from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import app from './app.js';
import { bootstrapDatabase } from './db/bootstrap.js';

//Carrega o .env antes de ler a porta (o app.js tambem o faz, mas assim a ordem e explicita)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotnev.config({
  path: path.join(__dirname, '../.env')
});

const PORT = process.env.PORT || 5001;

//Cria a base (se faltar) e aplica as migracoes antes de aceitar pedidos
try {
  await bootstrapDatabase();
} catch (erro) {
  console.error('[db] Nao foi possivel preparar a base de dados:', erro.message);
  process.exit(1);
}

app.listen(PORT, () =>{
  console.log(`Servidor esta escutando na porta: ${PORT}`);
});
