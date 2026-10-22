import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;
const nome = process.env.DATABASE_NAME;

if (!nome) {
    console.error('[db] DATABASE_NAME nao esta definido no .env');
    process.exit(1);
}

function ident(valor) {
    return `"${String(valor).replaceAll('"', '""')}"`;
}

const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_MAINTENANCE_DB || 'postgres'
});

try {
    await client.connect();

    // Fecha ligacoes abertas para a base alvo antes de a apagar.
    await client.query(
        `select pg_terminate_backend(pid)
           from pg_stat_activity
          where datname = $1 and pid <> pg_backend_pid()`,
        [nome]
    );

    await client.query(`drop database if exists ${ident(nome)}`);
    await client.query(`create database ${ident(nome)}`);
    console.log(`[db] Base "${nome}" recriada.`);
} finally {
    await client.end();
}

// So depois de a base existir e que carregamos a pool/migrador.
const { bootstrapDatabase } = await import('./bootstrap.js');
const { pool } = await import('./client.js');

try {
    await bootstrapDatabase();
    await pool.end();
    process.exit(0);
} catch (erro) {
    console.error('[db] Falha ao migrar a base recriada:', erro.message);
    await pool.end().catch(() => {});
    process.exit(1);
}
