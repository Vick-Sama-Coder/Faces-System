import pool from './database.js';

try {
  const result = await pool.query('SELECT NOW()');
  console.log('PostgreSQL conectado:', result.rows[0]);
} catch (error) {
  console.error('Erro completo:', error);
} finally {
  await pool.end();
}
