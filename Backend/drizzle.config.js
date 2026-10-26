import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { sslConfig } from './src/config/pgSsl.js';


dotenv.config();

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema/index.js',
    out: './drizzle',
    dbCredentials: {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT) || 5432,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: sslConfig()
    },
    strict: true,
    verbose: true
});
