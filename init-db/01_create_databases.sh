#!/bin/bash
set -e

# Buat database tambahan secara fisik di Postgres
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE english_ai;
    CREATE DATABASE n8n_internal;
EOSQL