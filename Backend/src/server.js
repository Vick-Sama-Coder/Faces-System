import dotnev from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import app from './app.js';




const PORT = process.env.PORT || 5001

app.listen(PORT, () =>{
  console.log(`Servidor esta escutando na porta: ${PORT}`);
});




