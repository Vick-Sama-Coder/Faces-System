#!/usr/bin/env bash
set -euo pipefail

# Cria uma copia de seguranca comprimida (formato custom do pg_dump).
# Uso: ./scripts/backup.sh [directorio-de-destino]
# Requer pg_dump no PATH e as variaveis DATABASE_* definidas no Backend/.env.

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="${1:-$RAIZ/backups}"

if [[ -f "$RAIZ/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$RAIZ/.env"
    set +a
fi

: "${DATABASE_NAME:?DATABASE_NAME nao definido}"
: "${DATABASE_USER:?DATABASE_USER nao definido}"

mkdir -p "$DESTINO"

DATA="$(date +%Y%m%d-%H%M%S)"
FICHEIRO="$DESTINO/${DATABASE_NAME}-${DATA}.dump"

export PGPASSWORD="${DATABASE_PASSWORD:-}"

pg_dump \
    --host="${DATABASE_HOST:-localhost}" \
    --port="${DATABASE_PORT:-5432}" \
    --username="$DATABASE_USER" \
    --dbname="$DATABASE_NAME" \
    --format=custom \
    --no-owner \
    --file="$FICHEIRO"

echo "Backup criado: $FICHEIRO"
