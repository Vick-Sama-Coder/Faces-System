// Configuracao SSL partilhada por todos os pontos que ligam ao PostgreSQL.
// Servicos geridos (Neon, Supabase, RDS...) exigem SSL; um PostgreSQL local
// normalmente nao o tem ativo e a ligacao seria recusada com "connection is
// insecure". Controla-se com DATABASE_SSL no .env.
const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '::1', ''];

// O certificado e validado por omissao. DATABASE_SSL_REJECT_UNAUTHORIZED=false
// desativa a validacao (apenas para ambientes com proxies/certificados proprios).
function opcoesSsl() {
    const rejeitar = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
    return { rejectUnauthorized: rejeitar };
}

export function sslConfig() {
    const valor = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();

    if (['true', '1', 'yes', 'require'].includes(valor)) {
        return opcoesSsl();
    }

    if (['false', '0', 'no', 'disable'].includes(valor)) {
        return false;
    }

    // Sem valor explicito: SSL em hosts remotos, desligado em localhost.
    return HOSTS_LOCAIS.includes(process.env.DATABASE_HOST) ? false : opcoesSsl();
}

export default sslConfig;
