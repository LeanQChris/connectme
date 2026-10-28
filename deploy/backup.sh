#!/bin/sh
set -eu
umask 077

require() {
  for name in "$@"; do
    value=$(printenv "$name" || true)
    if [ -z "$value" ]; then printf 'Missing backup setting: %s\n' "$name" >&2; exit 1; fi
  done
}

backup() {
  require RESTIC_REPOSITORY RESTIC_PASSWORD PGHOST PGUSER PGDATABASE PGPASSWORD REDIS_URL ENCRYPTION_KEY
  mkdir -p /snapshot
  rm -f /snapshot/postgres.dump /snapshot/redis.rdb /snapshot/encryption-key
  pg_dump --format=custom --no-owner --no-acl --file=/snapshot/postgres.dump
  pg_restore --list /snapshot/postgres.dump >/dev/null
  redis-cli -u "$REDIS_URL" --rdb /snapshot/redis.rdb
  redis-check-rdb /snapshot/redis.rdb >/dev/null
  printf '%s' "$ENCRYPTION_KEY" > /snapshot/encryption-key
  # A missing repository is initialized once; connectivity/auth errors still fail.
  restic cat config >/dev/null 2>&1 || restic init
  restic backup --host connectme --tag connectme /snapshot
  restic forget --host connectme --tag connectme --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
  rm -f /snapshot/postgres.dump /snapshot/redis.rdb /snapshot/encryption-key
  touch /tmp/last-success
}

verify() {
  require RESTIC_REPOSITORY RESTIC_PASSWORD
  # Always restore into the disposable service; callers cannot supply a live host.
  export PGHOST=restore-postgres PGUSER=restore PGDATABASE=restore PGPASSWORD=restore-check-only
  restic check --read-data
  mkdir -p /restore
  restic restore latest --host connectme --tag connectme --target /restore
  pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl --dbname=restore /restore/snapshot/postgres.dump
  redis-check-rdb /restore/snapshot/redis.rdb >/dev/null
  redis-server --dir /restore/snapshot --dbfilename redis.rdb --port 6389 --bind 127.0.0.1 --appendonly no --daemonize yes --pidfile /tmp/restore-redis.pid
  trap 'redis-cli -p 6389 shutdown nosave >/dev/null 2>&1 || true' EXIT
  test "$(redis-cli -p 6389 ping)" = PONG
  test -s /restore/snapshot/encryption-key
  printf 'Postgres restore and Redis snapshot load passed.\n'
}

case "${1:-loop}" in
  once) backup ;;
  verify) verify ;;
  health)
    test -f /tmp/last-success
    age=$(( $(date +%s) - $(stat -c %Y /tmp/last-success) ))
    test "$age" -lt 93600 ;;
  loop)
    trap 'exit 0' TERM INT
    while :; do
      if "$0" once; then sleep 86400 & wait "$!"; else printf 'Backup failed; retrying in 60 seconds.\n' >&2; sleep 60 & wait "$!"; fi
    done ;;
  *) printf 'Usage: connectme-backup {once|verify|loop|health}\n' >&2; exit 2 ;;
esac
