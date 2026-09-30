#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_SHA:?Set the tested commit SHA}"
: "${GITHUB_REPOSITORY:?Set owner/repository}"
: "${GITHUB_ACTOR:?Set the registry username}"
: "${GH_TOKEN:?Set a packages-write token}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$RELEASE_SHA" ]]

# The frontend and vision assets run locally; only the API goes to the VPS.
image="ghcr.io/${GITHUB_REPOSITORY,,}-backend"
printf '%s' "$GH_TOKEN" | docker login ghcr.io --username "$GITHUB_ACTOR" --password-stdin
trap 'docker logout ghcr.io >/dev/null' EXIT
docker build --platform linux/amd64 \
    --label "org.opencontainers.image.source=https://github.com/$GITHUB_REPOSITORY" \
    --label "org.opencontainers.image.revision=$RELEASE_SHA" \
    --tag "$image:$RELEASE_SHA" backend
docker push "$image:$RELEASE_SHA"
docker pull "$image:$RELEASE_SHA"
digest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$image:$RELEASE_SHA")
[[ "$digest" =~ @sha256:[0-9a-f]{64}$ ]]

mkdir -p build
stage=$(mktemp -d)
trap 'rm -rf "$stage"; docker logout ghcr.io >/dev/null' EXIT
cp -R deploy "$stage/deploy"
printf '%s\n' "$RELEASE_SHA" > "$stage/release.txt"
printf 'api\n' > "$stage/deployment-mode.txt"
printf '%s\n' "$digest" > "$stage/backend-image.txt"
tar -czf build/release.tar.gz -C "$stage" .
