#!/usr/bin/env bash
# Add Dungeon Master's API hostname to the already prepared VPS.
set -euo pipefail
domain=${1:?Usage: sudo bash setup-api-vps.sh API_DOMAIN}
[[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || exit 1
[[ "$(id -u)" == 0 ]] || { echo 'Run setup with sudo' >&2; exit 1; }
directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
for command in nginx certbot curl; do
    command -v "$command" > /dev/null
done
curl --fail --silent --show-error http://127.0.0.1:8020/api/v1/ready > /dev/null
site=/etc/nginx/sites-available/dungeon-master-api
if [[ -e "$site" || -e /etc/nginx/sites-enabled/dungeon-master-api ]]; then
    echo 'Dungeon Master API virtual host already exists; inspect it before repeating setup.' >&2
    exit 1
fi
install -d -m 755 /var/lib/letsencrypt

# ACME must work over HTTP before Nginx references the new certificate.
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
ln -s "$site" /etc/nginx/sites-enabled/dungeon-master-api
nginx -t
systemctl reload nginx
certbot certonly --non-interactive --agree-tos --webroot \
    --webroot-path /var/lib/letsencrypt --domain "$domain" \
    --deploy-hook 'systemctl reload nginx'
sed "s/DOMAIN/$domain/g" "$directory/nginx-api.conf.template" > "$site"
nginx -t
systemctl reload nginx
cat > /etc/systemd/system/dungeon-master-api-certbot-renew.service <<EOF
[Unit]
Description=Renew Dungeon Master API HTTPS certificate
[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --cert-name $domain
EOF
cat > /etc/systemd/system/dungeon-master-api-certbot-renew.timer <<'EOF'
[Unit]
Description=Check Dungeon Master API certificate twice daily
[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=1800
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now dungeon-master-api-certbot-renew.timer
printf 'Prepared Dungeon Master API host: https://%s/api/v1\n' "$domain"
