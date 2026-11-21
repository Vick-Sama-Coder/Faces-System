#!/usr/bin/env bash
set -euo pipefail

# Restaura uma copia criada por scripts/backup.sh.
# Uso: ./scripts/restore.sh backups/SalaoFaces-AAAAMMDD-HHMMSS.dump
# ATENCAO: o restauro substitui os objetos existentes na base de dados.

if [[ $# -ne 1 ]]; then
    echo "Uso: $0 <ficheiro.dump>" >&2
    exit 1
fi

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FICHEIRO="$1"

if [[ ! -f "$FICHEIRO" ]]; then
    echo "Ficheiro nao encontrado: $FICHEIRO" >&2
    exit 1
fi

if [[ -f "$RAIZ/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$RAIZ/.env"
    set +a
fi

: "${DATABASE_NAME:?DATABASE_NAME nao definido}"
: "${DATABASE_USER:?DATABASE_USER nao definido}"

export PGPASSWORD="${DATABASE_PASSWORD:-}"

pg_restore \
    --host="${DATABASE_HOST:-localhost}" \
    --port="${DATABASE_PORT:-5432}" \
    --username="$DATABASE_USER" \
    --dbname="$DATABASE_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    "$FICHEIRO"

echo "Restauro concluido a partir de: $FICHEIRO"
