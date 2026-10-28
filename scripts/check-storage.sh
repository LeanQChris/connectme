#!/bin/sh
# Verify real S3 signature handling with disposable local storage and fake keys.
set -eu
run="connectme-storage-check-$$"
work=$(mktemp -d)
image=ghcr.io/versity/versitygw@sha256:89cad13cc981986ee284cbafea4613f9533ce6fd5f37a2c96c4c4fb8adb3a316
cleanup() {
  docker rm -f "$run" >/dev/null 2>&1 || true
  docker volume rm "$run" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT INT TERM
docker volume create "$run" >/dev/null
docker run --rm -v "$run:/data" postgres:16-alpine mkdir -p /data/media
docker run -d --name "$run" -p 127.0.0.1::7070 -e ROOT_ACCESS_KEY_ID=readiness-access \
  -e ROOT_SECRET_ACCESS_KEY=readiness-secret-key-for-local-testing -v "$run:/data" \
  "$image" --region auto --cors-allow-origin https://app.connectme.test posix /data >/dev/null
port=$(docker port "$run" 7070/tcp | sed 's/.*://')
attempt=0
until curl --silent --output /dev/null "http://127.0.0.1:$port/"; do
  attempt=$((attempt + 1)); test "$attempt" -lt 60; sleep 1
done
cat > "$work/policy.json" <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::media/*"]}]}
JSON
curl --silent --show-error --fail --aws-sigv4 aws:amz:auto:s3 --user readiness-access:readiness-secret-key-for-local-testing \
  --request PUT -H x-amz-content-sha256:UNSIGNED-PAYLOAD --data-binary "@$work/policy.json" "http://127.0.0.1:$port/media?policy"
cd apps/api
TEST_S3_ENDPOINT="http://127.0.0.1:$port" npx tsx --test test/storage.integration.spec.ts
