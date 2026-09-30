# Dungeon Master continuous deployment

The [pipeline](../.github/workflows/ci.yml) has three separate jobs:
**CI → Smoke tests → CD**. CI runs backend/frontend checks and unit tests through
[checks.yml](../.github/workflows/checks.yml). Smoke tests then verify both
frontend production builds and an isolated Docker stack. If either stage fails
or is cancelled, GitHub skips downstream jobs and CD cannot start.

On `main`, [CD](../.github/workflows/cd.yml) verifies the exact SHA and successful
CI/smoke jobs, builds both applications from that SHA, publishes the backend to
GHCR and deploys to **https://dungeon-master.helpmake-id.live**.
PR runs receive no deployment secrets and cannot deploy. The API gate checks
completed prerequisite jobs in the current pipeline; it does not wait for the
whole pipeline to finish while CD itself is still running. Manual CD requires
a completed successful pipeline for its requested SHA.

The production Environment allows only `main`. Actions are pinned to verified
commit hashes. Main pipelines and deployments queue without cancelling migrations; a VPS `flock`
and pending-release marker also protect against overlapping manual deployments.
If several releases queue, GitHub can replace an older pending run with a newer
one. In-flight deployments finish.

## GitHub configuration

The existing repository secrets **`SERVER_IP`** and **`SERVER_KEY`** supply the
SSH host and private key. GitHub secret names are case insensitive.

Repository variables configured for this VPS:

| Variable | Value |
| --- | --- |
| `SERVER_USER` | `useradmin` |
| `SERVER_PORT` | `22` |
| `SERVER_KNOWN_HOSTS` | Verified OpenSSH host-key entry from the owner's SSH configuration |
| `DEPLOY_ORIGIN` | `https://dungeon-master.helpmake-id.live` |
| `DEPLOY_ROOT` | Optional; defaults to `/srv/dungeon-master` |
| `DEPLOY_AUTOMATIC` | Optional; set `false` to disable automatic deployments |

Build uses `packages: write`; deployment uses `packages: read`. The temporary
GitHub job token is passed through SSH stdin into a private Docker configuration
and removed on exit. No registry PAT or extra secret is required. If a GHCR package
already exists, grant this repository Actions access to it. Never copy backend
environment values into `VITE_*` or the release artifact.

## Commands

```bash
make check-deploy             # Deployment regression tests, syntax and style
make vps-status               # Deployment manifest and owned container status
make vps-logs                 # Follow the owned backend logs
gh workflow run cd.yml --ref main -f sha=FULL_SUCCESSFULLY_TESTED_COMMIT_SHA
```

`make release` and `make deploy` are the same commands used by Actions. They need
the environment variables listed in their scripts and a Linux runner; `make deploy`
also needs Playwright 1.58.2 with Chromium installed separately. No app dependency
or generated lockfile was changed. Manual CD must target a commit containing this
deployment implementation, use the `main` workflow ref, and have successful CI.

On the VPS:

```bash
make -C /srv/dungeon-master/backend status
make -C /srv/dungeon-master/backend logs
make -C /srv/dungeon-master/backend backup
```

## VPS layout and first setup

Ubuntu 22.04 already has Docker Compose, Nginx and Certbot. The owner's SSH alias
is `backend-hr`. The new hostname has its own Nginx site and Let's Encrypt
certificate. A dedicated systemd timer renews this certificate with a Nginx reload
hook. Other virtual hosts and
projects retain their configurations.

For a new compatible host, copy `deploy/` privately outside the webroot, verify
DNS and port/network availability, then run:

```bash
sudo bash deploy/setup-vps.sh dungeon-master.helpmake-id.live useradmin
```

Setup adds only Dungeon Master paths and its virtual host. It generates stable
database/signing secrets only when `/etc/dungeon-master/runtime.env` is absent;
existing environments are preserved. It refuses to overwrite an existing
Dungeon Master site. Prerequisites must already be installed. If certificate
issuance fails, fix DNS/ACME delivery and complete the new site's TLS configuration;
do not overwrite other Nginx sites. For a new Certbot account, register the
owner's email before setup.

Backend binds **127.0.0.1:8020**, leaving the existing HR configuration's port 8000
untouched. PostgreSQL has no published port, uses its own fixed volume
`dungeon-master-postgres-data`, and runs on `dungeon-master-private`
(`172.30.80.0/24`, gateway `172.30.80.1`). Uvicorn trusts that gateway for host
Nginx proxy headers. Check these reservations before reusing on another VPS.

```text
/etc/dungeon-master/runtime.env             # mode 600; deploy user only
/srv/dungeon-master/backend/                # active Compose, image digest, Makefile
/srv/dungeon-master/backend/releases/<id>/   # current/previous metadata
/srv/dungeon-master/frontend/releases/<id>/  # immutable release files
/srv/dungeon-master/frontend/current        # atomically switched symlink
/srv/dungeon-master/frontend/assets/         # retained hashed assets for open tabs
/srv/dungeon-master/incoming/<id>/           # private uploaded bundle
/srv/dungeon-master/backups/<id>.dump        # mode 600, outside webroot
/srv/dungeon-master/deployed.json            # written only after all checks pass
/srv/dungeon-master/previous.json            # previous successful target
```

IDs include the commit SHA, Actions run ID and attempt. Deploy uses an immutable
backend registry digest, rebuilds frontend with `BASE_URL=/` and
`VITE_API_BASE_URL=/api/v1`, and ships all model/WASM/design assets. It backs up the
owned database, verifies restore into an isolated temporary database, then runs
`alembic upgrade head`, `alembic check` and container readiness. Frontend is
published only after those succeed.

Public checks verify HTTPS, exact release SHA, API 401/404 JSON, every asset's
bytes, WASM MIME, missing-asset 404 and SPA deep links. Chromium checks real
rendering/reloads, session guards, no unhandled exceptions and no implicit camera
request on planning pages. The server records success only after browser checks.

## Failed releases and rollback

Failures restore the previous frontend and fail the Actions job. They do **not**
automatically run the old backend after a forward migration. Inspect schema
compatibility before restoring a previous backend digest. Migrations have no
downgrade. Backend replacement can briefly interrupt requests.

If a runner loses its connection, inspect `/srv/dungeon-master/pending` and the
corresponding incoming bundle. After diagnosing the failure, clear this attempt
and restore its previous frontend with:

```bash
bash /srv/dungeon-master/incoming/RELEASE_ID/deploy/deploy.sh abort \
  /srv/dungeon-master/incoming/RELEASE_ID /srv/dungeon-master \
  https://dungeon-master.helpmake-id.live
```

For a compatible backend rollback, obtain `image` and `metadata` from
`previous.json`, set `BACKEND_IMAGE` to that exact digest, and run the previous
metadata's `compose.yml` with project `dungeon-master` and the runtime env file.
Switch `frontend/current` to the recorded previous path by atomic symlink rename,
then repeat public/browser smoke before updating the manifest. Never restore a
backup over the live database merely to test it.

Releases, incoming bundles, retained assets and backups are intentionally kept.
They need an owner-selected retention policy and off-VPS backup copies. The
deployment refuses to proceed below 2 GiB free space. Actual webcam behavior,
phone compatibility and physical-distance readability require manual checks.
