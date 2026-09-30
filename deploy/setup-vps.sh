#!/usr/bin/env bash
# Add only Dungeon Master's directories and virtual host; preserve other projects.
set -euo pipefail
domain=${1:?Usage: sudo bash setup-vps.sh DOMAIN DEPLOY_USER}
deploy_user=${2:?Missing existing deploy user}
[[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || exit 1
[[ "$deploy_user" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
[[ "$(id -u)" == 0 ]] || { echo 'Run setup with sudo' >&2; exit 1; }
directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
for command in docker nginx certbot python3 flock; do
    command -v "$command" > /dev/null
done
docker compose version > /dev/null
id "$deploy_user" > /dev/null

site=/etc/nginx/sites-available/dungeon-master
if [[ -f "$site" ]]; then
    echo 'Dungeon Master virtual host already exists; inspect it before repeating setup.' >&2
    exit 1
fi
if ss -lntH | awk '{print $4}' | grep -Eq ':8020$'; then
    echo 'Port 8020 is already occupied; choose a free port in Compose and Nginx.' >&2
    exit 1
fi
install -d -m 755 -o "$deploy_user" -g "$deploy_user" /srv/dungeon-master
install -d -m 700 -o "$deploy_user" -g "$deploy_user" /etc/dungeon-master
install -d -m 755 /var/lib/letsencrypt
if [[ ! -e /etc/dungeon-master/runtime.env ]]; then
    python3 - "$directory/runtime.env.example" "$domain" <<'PY'
import pathlib
import secrets
import sys
source = pathlib.Path(sys.argv[1]).read_text()
source = source.replace('REPLACE_WITH_RANDOM_HEX_PASSWORD', secrets.token_hex(32))
source = source.replace('REPLACE_WITH_STABLE_RANDOM_SECRET', secrets.token_hex(48))
source = source.replace('DOMAIN', sys.argv[2])
pathlib.Path('/etc/dungeon-master/runtime.env').write_text(source)
PY
    chown "$deploy_user:$deploy_user" /etc/dungeon-master/runtime.env
    chmod 600 /etc/dungeon-master/runtime.env
fi

# Issue the new certificate with an HTTP-only host before referencing TLS files.
cat > "$site" <<EOF
server {
    listen 80;
    server_name $domain;
    location ^~ /.well-known/acme-challenge/ {
        root /var/lib/letsencrypt;
        try_files \$uri =404;
    }
    location / { return 503; }
}
EOF
ln -s "$site" /etc/nginx/sites-enabled/dungeon-master
nginx -t
systemctl reload nginx
certbot certonly --non-interactive --agree-tos --webroot \
    --webroot-path /var/lib/letsencrypt --domain "$domain" \
    --deploy-hook 'systemctl reload nginx'
sed "s/DOMAIN/$domain/g" "$directory/nginx.conf.template" > "$site"
nginx -t
systemctl reload nginx
cat > /etc/systemd/system/dungeon-master-certbot-renew.service <<EOF
[Unit]
Description=Renew Dungeon Master HTTPS certificate
[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --cert-name $domain
EOF
cat > /etc/systemd/system/dungeon-master-certbot-renew.timer <<'EOF'
[Unit]
Description=Check Dungeon Master certificate twice daily
[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=1800
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now dungeon-master-certbot-renew.timer
printf 'Prepared isolated Dungeon Master host: https://%s\n' "$domain"
