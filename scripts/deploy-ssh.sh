#!/usr/bin/env bash
set -euo pipefail

for variable in SERVER_IP SERVER_KEY SERVER_USER SERVER_KNOWN_HOSTS DEPLOY_ORIGIN RELEASE_SHA GH_TOKEN GITHUB_ACTOR; do
    [[ -n "${!variable:-}" ]] || { echo "Missing deployment setting: $variable" >&2; exit 1; }
done
[[ "$SERVER_IP" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ "$SERVER_USER" =~ ^[a-z_][a-z0-9_-]*$ ]]
[[ "${SERVER_PORT:-22}" =~ ^[0-9]+$ ]]
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$DEPLOY_ORIGIN" =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
root=${DEPLOY_ROOT:-/srv/dungeon-master}
[[ "$root" =~ ^/[a-zA-Z0-9/_-]+$ && "$root" != / ]]
release_id="$RELEASE_SHA-${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-1}"
[[ "$release_id" =~ ^[a-z0-9-]+$ ]]
remote="$root/incoming/$release_id"
temporary=$(mktemp -d)
chmod 700 "$temporary"
cleanup() { rm -rf "$temporary"; }
trap cleanup EXIT
printf '%s\n' "$SERVER_KEY" > "$temporary/key"
printf '%s\n' "$SERVER_KNOWN_HOSTS" > "$temporary/known_hosts"
chmod 600 "$temporary/key" "$temporary/known_hosts"
ssh_options=(-i "$temporary/key" -p "${SERVER_PORT:-22}"
    -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes
    -o "UserKnownHostsFile=$temporary/known_hosts" -o ConnectTimeout=15
    -o ServerAliveInterval=15 -o ServerAliveCountMax=8)
server="$SERVER_USER@$SERVER_IP"

# Paths and identifiers above exclude shell metacharacters. No secrets in argv.
ssh "${ssh_options[@]}" "$server" "mkdir -p '$remote'; chmod 700 '$remote'"
ssh "${ssh_options[@]}" "$server" "cat > '$remote/release.tar.gz'" < build/release.tar.gz
ssh "${ssh_options[@]}" "$server" "tar -xzf '$remote/release.tar.gz' -C '$remote'"
ssh "${ssh_options[@]}" "$server" "test \"\$(cat '$remote/release.txt')\" = '$RELEASE_SHA'"

abort_release() {
    ssh "${ssh_options[@]}" "$server" \
        "bash '$remote/deploy/deploy.sh' abort '$remote' '$root' '$DEPLOY_ORIGIN'" || true
}
trap 'result=$?; if [[ $result != 0 ]]; then abort_release; fi; cleanup; exit "$result"' EXIT
printf '%s\n' "$GH_TOKEN" | ssh "${ssh_options[@]}" "$server" \
    "bash '$remote/deploy/deploy.sh' prepare '$remote' '$root' '$DEPLOY_ORIGIN' '$GITHUB_ACTOR'"
# API releases have no public browser application to smoke-test.
mode=$(tar -xOf build/release.tar.gz ./deployment-mode.txt 2>/dev/null || printf 'web')
if [[ "$mode" != api ]]; then
    node scripts/check_deployed_browser.cjs "$DEPLOY_ORIGIN"
fi
ssh "${ssh_options[@]}" "$server" \
    "bash '$remote/deploy/deploy.sh' complete '$remote' '$root' '$DEPLOY_ORIGIN'"
printf 'Deployed %s to %s\n' "$RELEASE_SHA" "$DEPLOY_ORIGIN"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf 'Deployed `%s` to %s (%s). Release checks passed.\n' \
        "$RELEASE_SHA" "$DEPLOY_ORIGIN" "$mode" >> "$GITHUB_STEP_SUMMARY"
fi
