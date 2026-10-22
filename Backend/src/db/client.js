import { drizzle } from 'drizzle-orm/node-postgres';
import pool from '../config/database.js';
import * as schema from './schema/index.js';

// Reutiliza o Pool pg existente: o codigo antigo e o Drizzle partilham a
// mesma pool, evitando ligacoes duplicadas.
export const db = drizzle(pool, { schema });

export { pool };
export default db;
