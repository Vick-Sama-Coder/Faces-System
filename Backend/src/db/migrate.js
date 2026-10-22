import { bootstrapDatabase } from './bootstrap.js';
import { pool } from './client.js';

try {
    await bootstrapDatabase();
    await pool.end();
    process.exit(0);
} catch (erro) {
    console.error('[db] Falha ao aplicar migracoes:', erro.message);
    await pool.end().catch(() => {});
    process.exit(1);
}
