import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import db, { pool } from './client.js';
import { hostLocal, sslConfig } from '../config/pgSsl.js';

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

function baseManutencao() {
    if (process.env.DATABASE_MAINTENANCE_DB) {
        return process.env.DATABASE_MAINTENANCE_DB;
    }

    // Em localhost usamos "postgres" por omissao. Num host remoto (Neon,
    // Supabase, RDS...) nao assumimos que essa base exista nem que o role
    // tenha permissao para CREATE DATABASE.
    return hostLocal() ? 'postgres' : null;
}

function erroLigacao(erro) {
    const host = process.env.DATABASE_HOST || '(host nao definido)';
    const porta = process.env.DATABASE_PORT || 5432;
    const base = process.env.DATABASE_NAME || '(base nao definida)';

    if (erro?.code === '28P01') {
        return new Error(
            `Falha de autenticacao na base de dados ${host}:${porta}/${base}. ` +
            'Confirma DATABASE_USER e DATABASE_PASSWORD no Backend/.env. ' +
            'Devem ser exatamente os valores da connection string do provedor.',
            { cause: erro }
        );
    }

    if (erro?.code === '3D000') {
        return new Error(
            `A base de dados "${base}" nao existe em ${host}. ` +
            'Cria-a no painel do provedor ou define DATABASE_MAINTENANCE_DB para uma base existente.',
            { cause: erro }
        );
    }

    if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(erro?.code)) {
        return new Error(
            `Nao foi possivel ligar a base de dados em ${host}:${porta}. ` +
            'Verifica o host, a porta, a rede e a configuracao SSL.',
            { cause: erro }
        );
    }

    return erro;
}

// Cria a base de dados se nao existir, ligando a base de manutencao.
// Substitui o antigo 000_create_database_SalaoFaces.sql, mas sem apagar dados.
export async function ensureDatabaseExists() {
    const nome = process.env.DATABASE_NAME;

    if (!process.env.DATABASE_HOST) {
        throw new Error('DATABASE_HOST nao esta definido no .env');
    }

    if (!nome) {
        throw new Error('DATABASE_NAME nao esta definido no .env');
    }

    const manutencao = baseManutencao();

    if (!manutencao) {
        console.log('[db] Host remoto sem DATABASE_MAINTENANCE_DB; criacao automatica de base desativada.');
        return;
    }

    const client = new Client(configBase(manutencao));

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

// Verifica se a base tem as tabelas principais e/ou o historico do Drizzle.
async function estadoDaBase() {
    const { rows } = await pool.query(`
        select
            to_regclass('public.usuario') as tabela_principal,
            to_regclass('drizzle.__drizzle_migrations') as historico
    `);

    return rows[0];
}

// Fluxo chamado no arranque da aplicacao (e pelo script db:migrate).
// As migracoes sao sempre aplicadas, mesmo quando a base ja tem dados.
// O erro anterior era saltar o migrate quando existiam linhas em perfil/usuario,
// deixando a base presa num schema antigo.
export async function bootstrapDatabase() {
    try {
        await ensureDatabaseExists();
    } catch (erro) {
        throw erroLigacao(erro);
    }

    await ensureMigrationsExist();

    let estado;
    try {
        estado = await estadoDaBase();
    } catch (erro) {
        throw erroLigacao(erro);
    }

    const { tabela_principal: tabelaPrincipal, historico } = estado;

    if (tabelaPrincipal && !historico) {
        throw new Error(
            'A base de dados tem tabelas mas nao tem historico de migracoes Drizzle. ' +
            'Faz backup e reconcilia o schema antes de arrancar a aplicacao.'
        );
    }

    try {
        await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    } catch (erro) {
        throw erroLigacao(erro);
    }

    if (tabelaPrincipal) {
        console.log('[db] Migracoes pendentes aplicadas.');
    } else {
        console.log('[db] Base de dados criada e migracoes aplicadas.');
    }
}

export { MIGRATIONS_DIR };
