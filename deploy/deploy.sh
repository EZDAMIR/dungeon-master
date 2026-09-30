#!/usr/bin/env bash
# Runs only on the VPS. All Docker commands belong to this one Compose project.
set -euo pipefail

action=${1:?Usage: deploy.sh prepare|complete|abort BUNDLE ROOT HTTPS_ORIGIN [REGISTRY_USER]}
bundle=${2:?Missing extracted release bundle}
root=${3:?Missing application root}
origin=${4:?Missing HTTPS origin}
runtime=${RUNTIME_ENV_FILE:-/etc/dungeon-master/runtime.env}
sha=$(cat "$bundle/release.txt")
image=$(cat "$bundle/backend-image.txt")
release_id=$(basename "$bundle")
mode=web
if [[ -f "$bundle/deployment-mode.txt" ]]; then
    mode=$(cat "$bundle/deployment-mode.txt")
fi
[[ "$mode" == web || "$mode" == api ]] || exit 1
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$release_id" =~ ^[a-z0-9-]+$ ]] || exit 1
[[ "$image" =~ ^ghcr.io/[a-z0-9/_.-]+@sha256:[0-9a-f]{64}$ ]] || exit 1
[[ "$origin" =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || exit 1
[[ -r "$runtime" ]] || { echo 'Missing readable runtime environment' >&2; exit 1; }

mkdir -p "$root/backend/releases" "$root/frontend/releases" "$root/frontend/assets" "$root/backups"
chmod 700 "$root/backups"
exec 9> "$root/deploy.lock"
flock -w 600 9
metadata="$root/backend/releases/$release_id"
frontend="$root/frontend/releases/$release_id"
current="$root/frontend/current"
if [[ "$mode" == api ]]; then
    mkdir -p "$root/api/releases"
    frontend="$root/api/releases/$release_id"
    current="$root/api/current"
fi
export BACKEND_IMAGE="$image" RUNTIME_ENV_FILE="$runtime"
compose=(docker compose --project-name dungeon-master --env-file "$runtime"
    --file "$bundle/deploy/docker-compose.vps.yml")

switch_frontend() {
    ln -s "$1" "$current.next"
    mv -Tf "$current.next" "$current"
}

check_release() {
    arguments=("$origin" "$frontend" "$sha")
    if [[ "$mode" == api ]]; then arguments+=(--api-only); fi
    python3 "$bundle/deploy/check-release.py" "${arguments[@]}"
}

abort_release() {
    if [[ -L "$root/pending" && "$(readlink "$root/pending")" == "$metadata" ]]; then
        previous=$(cat "$metadata/previous-frontend.txt")
        if [[ -n "$previous" ]]; then
            switch_frontend "$previous"
        else
            rm -f "$current"
        fi
        rm "$root/pending"
        printf 'Release failed; previous frontend restored. Backend/schema require inspection.\n' >&2
    fi
}

case "$action" in
    abort)
        abort_release
        exit 0
        ;;
    complete)
        [[ -L "$root/pending" && "$(readlink "$root/pending")" == "$metadata" ]] || exit 1
        check_release
        if [[ -f "$root/deployed.json" ]]; then
            cp "$root/deployed.json" "$root/previous.json"
        fi
        python3 - "$sha" "$image" "$frontend" "$metadata" "$mode" > "$root/deployed.json.next" <<'PY'
import json
import sys
state = dict(zip(('sha', 'image', 'frontend', 'metadata', 'mode'), sys.argv[1:]))
if state['mode'] == 'api':
    state['api_release'] = state['frontend']
    state['frontend'] = None
print(json.dumps(state))
PY
        cp "$bundle/deploy/docker-compose.vps.yml" "$root/backend/compose.yml"
        cp "$bundle/deploy/Makefile" "$root/backend/Makefile"
        printf 'BACKEND_IMAGE=%s\n' "$image" > "$root/backend/image.env"
        mv "$root/deployed.json.next" "$root/deployed.json"
        rm "$root/pending"
        printf 'Release %s completed.\n' "$sha"
        exit 0
        ;;
    prepare) ;;
    *) echo 'Unknown deployment action' >&2; exit 1 ;;
esac

[[ ! -e "$root/pending" && ! -L "$root/pending" ]] || {
    echo 'An unfinished release exists. Complete or abort it before deploying.' >&2
    exit 1
}
[[ ! -e "$metadata" && ! -e "$frontend" ]] || {
    echo 'This release attempt already exists; rerun CD to get a new attempt ID.' >&2
    exit 1
}
available=$(df -Pm "$root" | awk 'NR == 2 {print $4}')
(( available >= 2048 )) || { echo 'Need at least 2 GiB free before deployment' >&2; exit 1; }
"${compose[@]}" config --quiet
mkdir "$metadata"
cp "$bundle/deploy/docker-compose.vps.yml" "$metadata/compose.yml"
cp "$bundle/backend-image.txt" "$bundle/release.txt" "$metadata/"
readlink "$current" > "$metadata/previous-frontend.txt" || true
if [[ -f "$root/deployed.json" ]]; then
    cp "$root/deployed.json" "$metadata/previous.json"
fi
ln -s "$metadata" "$root/pending"
trap 'result=$?; if [[ $result != 0 ]]; then abort_release; fi; rm -rf "$metadata/docker-auth"; exit "$result"' EXIT

# Ephemeral job token has packages:read. Delete its Docker config on every exit.
registry_user=${5:?Missing registry username}
export DOCKER_CONFIG="$metadata/docker-auth"
mkdir -m 700 "$DOCKER_CONFIG"
docker login ghcr.io --username "$registry_user" --password-stdin
"${compose[@]}" pull backend
"${compose[@]}" up -d --wait --wait-timeout 180 postgres

# Back up even on first deployment (an empty owned database), then test restore
# into an exactly named disposable database. Never restore over the live DB.
backup="$root/backups/$release_id.dump"
umask 077
"${compose[@]}" exec -T postgres sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
[[ -s "$backup" ]] || { echo 'Database backup is empty' >&2; exit 1; }
verify_db="dungeon_restore_${sha:0:12}_$$"
"${compose[@]}" exec -T postgres sh -c \
    'createdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
if ! "${compose[@]}" exec -T postgres sh -c \
    'pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error' sh "$verify_db" < "$backup"; then
    "${compose[@]}" exec -T postgres sh -c \
        'dropdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
    exit 1
fi
"${compose[@]}" exec -T postgres sh -c \
    'dropdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
umask 022

# Forward migrations precede publication; failure cannot reach frontend switch.
"${compose[@]}" run --rm --no-deps backend python -m alembic upgrade head
"${compose[@]}" run --rm --no-deps backend python -m alembic check
"${compose[@]}" up -d --wait --wait-timeout 180 backend
curl --fail --silent --show-error http://127.0.0.1:8020/api/v1/ready > /dev/null
if [[ "$mode" == api ]]; then
    mkdir "$frontend"
    cp "$bundle/release.txt" "$frontend/release.txt"
else
    cp -R "$bundle/frontend" "$frontend"
    chmod -R a+rX "$frontend"
    cp -R "$frontend/assets/." "$root/frontend/assets/"
fi
switch_frontend "$frontend"
check_release
printf 'Candidate %s (%s) passed public release checks.\n' "$sha" "$mode"
