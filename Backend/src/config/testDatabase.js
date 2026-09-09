import pool from './database.js';

(async () => {
  try {
    const result = await pool.query('SELECT CURRENT_USER');
    console.log('PostgreSQL conectado:', result.rows[0]);
  } catch (error) {
    console.error('Erro completo:', error);
  } finally {
    await pool.end();
  }

})()
