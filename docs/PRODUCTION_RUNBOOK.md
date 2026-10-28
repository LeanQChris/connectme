# Production preparation

Development continues to use `apps/api/.env`, `apps/web/.env.local`, and the development Compose stack. Production settings and the production stack are separate. No live Clerk keys, domains, provider approvals, or storage accounts are needed to keep developing.

## Checks available now

```sh
npm ci
npx turbo run lint check-types test --force
npm run build
npm audit --omit=dev --audit-level=high
npm run check:backup
npm run check:storage
```

The backup check creates disposable PostgreSQL/Redis containers, writes sample data, creates an encrypted restic snapshot, restores it into a different database, and loads the Redis snapshot. The storage check creates an isolated S3 gateway with fake credentials, verifies a signed upload with an exact content length, checks public reads/CORS, rejects a changed upload size, and deletes the test object. Both remove their containers and data after completion. They require Docker; storage checks also require curl with AWS SigV4 support.

Database integration tests require `DATABASE_URL`. Use a disposable database; the team security tests create and remove their own schema. CI supplies Postgres and Redis. The security tests cover viewer mutations, admin escalation, last-owner races, removed memberships, invitation onboarding, and Slack signatures. No test sends Clerk invitations or calls messaging providers.

## Prepare a deployment when a domain and accounts exist

1. Copy `.env.production.example` to `.env.production` and restrict permissions with `chmod 600 .env.production`.
2. Set `APP_DOMAIN`, `ACME_EMAIL`, and the two public URLs to the same HTTPS origin. Point the domain at the server; expose ports 80 and 443 only.
3. Use live Clerk keys from the same instance. Configure its authorized sign-in/return URLs for the production origin. Keep the existing Google sign-in configuration and enable the invitation sign-up flow. Accepted application invitations carry trusted server-written workspace metadata; users are assigned at their first authenticated HTTP or socket connection.
4. Generate separate database, media encryption, OAuth state, and backup secrets with `openssl rand -hex 32`. API and worker must share the same `ENCRYPTION_KEY`; changing it prevents existing provider credentials from decrypting.
5. Configure a public S3-compatible media bucket and a **different private bucket** for backups. Give media credentials only media-bucket access, and backup credentials only backup-bucket access. `S3_PUBLIC_BASE_URL` must serve objects anonymously over HTTPS so Meta can fetch scheduled media. Keep backup objects private.
6. Configure media bucket CORS to allow the app origin, PUT/GET/HEAD, and the Content-Type header. The browser uploads to `S3_ENDPOINT` while providers read `S3_PUBLIC_BASE_URL`. These origins are included in the web image's CSP. Example CORS structure:

```json
{"CORSRules":[{"AllowedOrigins":["https://YOUR_APP_DOMAIN"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]}
```

7. Set `BACKUP_REPOSITORY=s3:https://STORAGE_ENDPOINT/PRIVATE_BACKUP_BUCKET`, its separate access credentials, and `BACKUP_PASSWORD`. Store that password outside the bucket and server. Restic encrypts the database dump, Redis snapshot, and media encryption key; losing the backup password makes them unrecoverable.
8. Set `WIDGET_ALLOWED_ORIGINS` to explicit HTTPS site origins or bare hostnames. URL entries match exactly; bare hostnames include subdomains. Production rejects missing origins, wildcards, and an empty list. Development retains its permissive default.
9. Fill Meta OAuth app ID/secret and webhook verification token if launching Meta channels. Configure the provider webhooks shown in settings, complete provider App Review/permissions, and verify an actual inbound event and permitted outbound response for every channel being launched. Slack requires a stored workspace signing secret before URL verification. Provider approval cannot be completed by a local code check.

Validate settings without printing secrets:

```sh
npm run production:check
npm run production:check -- --verify-storage
```

For a separate staging deployment with Clerk test keys, pass `--staging --env-file /path/to/staging.env`. This does not turn a test Clerk instance into a production instance. The checker does not contact Clerk or send invitations. `--verify-storage` creates and deletes one probe object and checks bucket CORS and anonymous reads.

## Deploy and verify

```sh
# For upgrades, take a fresh snapshot before running new migrations:
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup once
# On an initial install, start the full stack directly:
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Migrations run before the API and worker start. Schema synchronization is disabled. The new membership migration preserves users removed from a workspace as disabled records and makes the oldest existing admin the owner only where the workspace has no owner. Legacy fake invitation records are disabled. New workspace creators are owners.

Caddy routes authenticated `/api/*` requests through Next's Clerk proxy, which injects the verified session token and rewrites to `http://api:8081`. Public webhook/widget/health endpoints go directly to Nest; sockets authenticate with their Clerk token. The API independently verifies tokens and resolves current membership from the database. The web image must be rebuilt when public URLs, the Clerk public key, or media origins change.

Check `/api/health/ready` for both database and Redis `up`, `/api/health/live` for process liveness, and worker container health. Then verify:

- Google sign-in and sign-out; an unauthenticated private API request returns 401.
- Invitation received, accepted at `/sign-up`, and joined to the invited workspace; a revoked invitation cannot be accepted.
- Viewer reads succeed and writes return 403; admins cannot grant/demote owners or manage other admins; owners can manage roles while at least one owner remains.
- Removing a member disconnects their sockets and prevents further requests/reconnection.
- A real webhook, reply, media upload, and scheduled send using each provider being enabled.
- Backup container becomes healthy after its first successful offsite snapshot; alert on unhealthy status and on API/worker health failures.

## Backup retention and restore drills

The backup service runs immediately and daily, retaining 7 daily, 4 weekly, and 6 monthly snapshots. It retries failed backups after 60 seconds and becomes unhealthy if no successful backup exists within 26 hours. Logs never print credentials. `restic check` validates encryption and pack integrity during a restore drill.

Run a restore drill after initial deployment and regularly afterward:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml --profile restore run --rm restore-check
docker compose --env-file .env.production -f docker-compose.prod.yml rm -sfv restore-postgres
```

The restore job always targets `restore-postgres`, which has disposable credentials and no production volume or published port. It validates and loads Redis on its own loopback interface. It never restores over the live database. Do not use `down -v` on the production stack.

For disaster recovery, restore a chosen restic snapshot into a separate environment first. Recover the encryption key from the encrypted snapshot, use `pg_restore --no-owner --no-acl` into a clean PostgreSQL 16 database, and start Redis 7 with the saved `redis.rdb` in its data directory. Keep workers stopped while reconciling scheduled jobs and recent provider deliveries; database and Redis snapshots are taken close together but are not a distributed transaction. Verify restored data and queue state before directing traffic or starting workers. Keep the previous live volumes until recovery has been accepted.

## Current external launch tasks

Supply the production domain, live Clerk keys, storage accounts, private backup repository, provider credentials, and provider approvals when deploying. All remain account/deployment tasks while this app is in development; the repository contains the checks and tooling to validate them then.

## WhatsApp template workflow

The template approval migration adds a separate WhatsApp Business Account ID and demotes local samples/drafts that had no Meta template ID. Configure the WABA ID in WhatsApp settings alongside the phone ID and a token with `whatsapp_business_management` and `whatsapp_business_messaging` permissions, then sync existing templates.

Admins and owners can create/edit text drafts with numbered variable examples and submit them to Meta. Submission is reserved durably before the provider request. Confirmed validation failures return to draft; timeouts remain unconfirmed to prevent duplicate submission. Sync retrieves all provider pages and confirms approval. Sending verifies the current approval, account, name, language and required variables again. A provider outage blocks sending rather than guessing approval.

Manage rejected templates and advanced authentication/media/dynamic-button templates in Meta WhatsApp Manager. The composer only offers approved supported text templates. After an unconfirmed submission, sync and check Meta Manager before creating another draft; do not repeatedly submit the same template. Validate a real review, sync and permitted delivery using a test recipient before launch; automated checks mock Meta and never send a message.

## AI automatic replies

AI settings now save through the same shared validator as the API contract. Owners/admins can opt into automatic replies and set dedicated instructions. The default stays off; enabling requires an AI key. Automatic replies use the primary provider, skip assigned/closed conversations, and recheck the switch and human replies after generation. Automated Meta replies cannot use the HUMAN_AGENT tag outside the 24-hour window. Validate with a test recipient before enabling for a real workspace.

## Background browser alerts

Browser push uses encrypted, tenant/member-scoped device subscriptions and a BullMQ delivery queue. Provider outages retry; 404/410 endpoints are removed, removed members are excluded at send time, and duplicate realtime events share a queue job ID. Alerts contain generic text, with no customer name or message content on the lock screen. Devices can opt out in Settings → Notifications; signing out or changing accounts unsubscribes the browser. Delivery remains subject to browser/OS support and notification permissions. iOS requires a Home Screen installation.

For development, `npm run push:keys -- --write-dev` generates a shared local key pair in API/worker `.env.local` files without printing secrets. Restart API and worker after changing environment settings. This command refuses production/live Clerk environments and preserves existing VAPID configuration. The development pair has been generated locally; do not reuse it for production.

For deployment, generate a separate pair with `npm run push:keys`, store the private key in your deployment secret store, and set the same `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT=mailto:admin@YOUR_DOMAIN` in API and worker. The production Compose stack passes these through its environment file. Partial/mismatched pairs fail startup; leaving all three unset disables background push. Run migrations to create `browser_push_subscriptions` before starting the worker. Key rotation requires devices to register again (the app does this on its next visit).

Enable notifications on a signed-in test device, send the queued test alert from settings, then close the tab and validate an inbound test message. Check the worker `/metrics` entry for `browser-push` failures. Automated checks validate subscription isolation, encryption, endpoint restrictions, duplicate queueing, membership removal, delivery retries and expired-device cleanup without sending real browser/provider messages.
