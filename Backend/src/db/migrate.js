import { bootstrapDatabase } from './bootstrap.js';
import { pool } from './client.js';
import { logger } from '../utils/logger.js';

try {
    await bootstrapDatabase();
    await pool.end();
    process.exit(0);
} catch (erro) {
    logger.error('[db] Falha ao aplicar migracoes:', erro.message);
    await pool.end().catch(() => {});
    process.exit(1);
}
