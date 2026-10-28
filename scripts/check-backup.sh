#!/bin/sh
# Real backup + restore against disposable databases and a local encrypted repo.
set -eu
run="connectme-backup-check-$$"
work=$(mktemp -d)
cleanup() {
  docker rm -fv "$run-postgres" "$run-redis" "$run-restore" >/dev/null 2>&1 || true
  docker network rm "$run" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT INT TERM
mkdir -p "$work/repository"
docker build -q -f deploy/backup.Dockerfile -t connectme-backup:check .
docker network create "$run" >/dev/null
docker run -d --name "$run-postgres" --network "$run" --network-alias postgres -e POSTGRES_USER=check -e POSTGRES_PASSWORD=check-only -e POSTGRES_DB=check postgres:16-alpine >/dev/null
docker run -d --name "$run-restore" --network "$run" --network-alias restore-postgres -e POSTGRES_USER=restore -e POSTGRES_PASSWORD=restore-check-only -e POSTGRES_DB=restore postgres:16-alpine >/dev/null
docker run -d --name "$run-redis" --network "$run" --network-alias redis redis:7-alpine >/dev/null
for db in "$run-postgres" "$run-restore"; do
  attempt=0
  until docker exec "$db" pg_isready >/dev/null 2>&1; do
    attempt=$((attempt + 1)); test "$attempt" -lt 60; sleep 1
  done
done
docker exec "$run-postgres" psql -U check -d check -v ON_ERROR_STOP=1 -c 'CREATE TABLE backup_probe (value integer); INSERT INTO backup_probe VALUES (42);' >/dev/null
docker exec "$run-redis" redis-cli set scheduled-job backup-probe >/dev/null
for mode in once verify; do
  docker run --rm --network "$run" -v "$work/repository:/repository" \
    -e RESTIC_REPOSITORY=/repository -e RESTIC_PASSWORD=isolated-backup-check-password-32-chars \
    -e PGHOST=postgres -e PGUSER=check -e PGDATABASE=check -e PGPASSWORD=check-only \
    -e REDIS_URL=redis://redis:6379 -e ENCRYPTION_KEY=isolated-encryption-key-32-characters \
    connectme-backup:check "$mode"
done
result=$(docker exec "$run-restore" psql -U restore -d restore -Atc 'SELECT value FROM backup_probe')
test "$result" = 42
printf 'Backup drill passed: PostgreSQL data restored, encrypted repository checked, Redis snapshot loaded.\n'
