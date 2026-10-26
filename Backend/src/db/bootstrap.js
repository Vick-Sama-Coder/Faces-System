import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import db, { pool } from './client.js';
import { sslConfig } from '../config/pgSsl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(BACKEND_DIR, 'drizzle');

const { Client } = pg;

// Identificador seguro para CREATE/DROP DATABASE (nao pode ser parametrizado).
function ident(nome) {
    return `"${String(nome).replaceAll('"', '""')}"`;
}

function configBase(database) {
    return {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT) || 5432,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database,
        ssl: sslConfig(),
        connectionTimeoutMillis: 15000
    };
}

// Cria a base de dados se nao existir, ligando a base de manutencao.
// Substitui o antigo 000_create_database_SalaoFaces.sql, mas sem apagar dados.
export async function ensureDatabaseExists() {
    const nome = process.env.DATABASE_NAME;

    if (!nome) {
        throw new Error('DATABASE_NAME nao esta definido no .env');
    }

    const client = new Client(configBase(process.env.DATABASE_MAINTENANCE_DB || 'postgres'));

    try {
        await client.connect();

        const { rows } = await client.query(
            'select 1 from pg_database where datname = $1',
            [nome]
        );

        if (rows.length === 0) {
            await client.query(`create database ${ident(nome)}`);
            console.log(`[db] Base de dados "${nome}" criada.`);
        }
    } finally {
        await client.end();
    }
}

function pastaTemMigracoes() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        return false;
    }

    return fs.readdirSync(MIGRATIONS_DIR).some((ficheiro) => ficheiro.endsWith('.sql'));
}

// Fallback de desenvolvimento: se o projeto nao tiver nenhuma migracao,
// gera a migracao inicial a partir do schema Drizzle.
function gerarMigracoesIniciais() {
    const binario = path.join(
        BACKEND_DIR,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'drizzle-kit.cmd' : 'drizzle-kit'
    );

    console.log('[db] Nenhuma migracao encontrada; a gerar a migracao inicial...');

    const resultado = spawnSync(binario, ['generate', '--name=init'], {
        cwd: BACKEND_DIR,
        stdio: 'inherit'
    });

    if (resultado.error) {
        throw resultado.error;
    }
    if (resultado.status !== 0) {
        throw new Error('Falha ao gerar as migracoes com drizzle-kit');
    }
}

export async function ensureMigrationsExist() {
    if (pastaTemMigracoes()) {
        return;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Nao existem migracoes em drizzle/. Gera-as em desenvolvimento com "npm run db:generate" e faz deploy da pasta drizzle/.'
        );
    }

    gerarMigracoesIniciais();

    if (!pastaTemMigracoes()) {
        throw new Error('O drizzle-kit nao criou nenhuma migracao');
    }
}

// Verifica se a base ja tem tabelas e/ou o historico de migracoes do Drizzle.
async function estadoBase() {
    const { rows } = await pool.query(`
        select
            (select count(*)::int
               from information_schema.tables
              where table_schema = 'public') as tabelas,
            to_regclass('drizzle.__drizzle_migrations') is not null as historico
    `);

    return rows[0];
}

// Fluxo chamado no arranque da aplicacao (e pelo script db:migrate).
export async function bootstrapDatabase() {
    await ensureDatabaseExists();
    await ensureMigrationsExist();

    const { tabelas, historico } = await estadoBase();

    // Base antiga (scripts SQL manuais): tem tabelas mas nao tem historico do
    // Drizzle, pelo que o migrate falharia ao tentar recria-las.
    if (tabelas > 0 && !historico) {
        console.log('[db] Base de dados existente (schema manual detectado); pulando migracao.');
        return;
    }

    // Base vazia (nova) ou ja gerida pelo Drizzle: o migrate e idempotente.
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log('[db] Migracoes aplicadas.');
}

export { MIGRATIONS_DIR };
