#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
project="dungeon-ci-$$-$RANDOM"
if docker compose version >/dev/null 2>&1; then
    compose=(docker compose)
else
    compose=(docker-compose)
fi
compose+=(--project-name "$project" --file "$repo_dir/backend/docker-compose.ci.yml")

cleanup() {
    result=$?
    trap - EXIT
    if [ "$result" -ne 0 ]; then
        "${compose[@]}" logs --no-color --tail=100 || true
    fi
    # Only this invocation's unique project/volume can be removed.
    "${compose[@]}" down --volumes --remove-orphans || result=1
    exit "$result"
}
trap cleanup EXIT

"${compose[@]}" up --build --detach --wait --wait-timeout 120
"${compose[@]}" exec -T backend python -m alembic upgrade head
"${compose[@]}" exec -T backend python -m alembic check
"${compose[@]}" exec -T backend python - <<'PY'
import json
import os
from urllib.error import HTTPError
from urllib.request import Request
from urllib.request import urlopen

assert os.getuid() != 0, 'Backend must run as a non-root user'
base = 'http://localhost:8000'
for path in ['/api/v1/health', '/api/v1/ready', '/docs', '/openapi.json']:
    with urlopen(base + path, timeout=10) as response:
        assert response.status == 200, path
        assert response.headers.get('X-Request-ID'), path
        if path == '/api/v1/ready':
            assert json.load(response) == {'status': 'ok', 'database': 'reachable'}
request = Request(base + '/api/v1/profile', headers={'X-Request-ID': 'docker-ci-smoke'})
try:
    urlopen(request, timeout=10)
    raise AssertionError('Protected endpoint accepted an unauthenticated request')
except HTTPError as response:
    assert response.code == 401
    assert response.headers['X-Request-ID'] == 'docker-ci-smoke'
    assert isinstance(json.load(response)['detail'], str)
print('Container startup, migrations, non-root runtime, health, docs and HTTP metadata passed.')
PY

"${compose[@]}" stop postgres
"${compose[@]}" exec -T backend python - <<'PY'
import json
from urllib.error import HTTPError
from urllib.request import urlopen

base = 'http://localhost:8000'
with urlopen(base + '/api/v1/health', timeout=10) as response:
    assert response.status == 200
try:
    urlopen(base + '/api/v1/ready', timeout=10)
    raise AssertionError('Readiness accepted an unavailable database')
except HTTPError as response:
    assert response.code == 503
    assert response.headers.get('X-Request-ID')
    assert json.load(response) == {'detail': 'Database not reachable', 'database': 'unreachable'}
print('Database failure preserves health and returns a flat readiness 503.')
PY
