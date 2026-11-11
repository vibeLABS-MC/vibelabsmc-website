#!/usr/bin/env bash
# One-time set-up (safe to run again) of the vibeLABS website on the team server. It only ever
# adds things of its own: a system user without a login shell, its folders, Bun (checksum-
# verified, for this app only), a Postgres role and database (peer authentication, no password),
# the env file with a fresh APP_SECRET, the systemd units and two helper scripts. It changes no
# other service's files and doesn't touch nginx: deploy/preview.sh switches the site over.
#
#   bash deploy/provision.sh        (from the repository root, with SSH access as root)
set -euo pipefail

HOST="${VPS:-root@173.249.34.231}"
BUN_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Your GitHub account becomes admin on first sign-in (its public numeric ID).
ADMIN_IDS="${ADMIN_GITHUB_IDS:-$(gh api users/Jiyath5516F --jq .id)}"

scp -q deploy/server/vibelabs-web.service deploy/server/vibelabs-web-backup.service \
	deploy/server/vibelabs-web-backup.timer deploy/server/set-env deploy/server/backup \
	"$HOST:/tmp/"

ssh "$HOST" "BUN_VERSION=$BUN_VERSION ADMIN_IDS=$ADMIN_IDS bash -s" <<'REMOTE'
set -euo pipefail

id vibelabs-web >/dev/null 2>&1 ||
	useradd --system --user-group --home-dir /var/lib/vibelabs-web --shell /usr/sbin/nologin vibelabs-web

install -d -o root -g root -m 0755 /opt/vibelabs-web /opt/vibelabs-web/releases /opt/vibelabs-web/bin /opt/vibelabs-web/bun
# nginx (www-data) reads files and images straight from disk; new files inherit the group.
install -d -o vibelabs-web -g www-data -m 2750 /var/lib/vibelabs-web /var/lib/vibelabs-web/files /var/lib/vibelabs-web/images
install -d -o vibelabs-web -g vibelabs-web -m 0700 /var/lib/vibelabs-web/tmp /var/backups/vibelabs-web
install -d -o root -g vibelabs-web -m 0750 /etc/vibelabs-web

if ! /opt/vibelabs-web/bun/bun --version 2>/dev/null | grep -qx "$BUN_VERSION"; then
	work=$(mktemp -d)
	cd "$work"
	curl -fsSLO "https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION/bun-linux-x64.zip"
	curl -fsSLO "https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION/SHASUMS256.txt"
	grep ' bun-linux-x64.zip$' SHASUMS256.txt | sha256sum -c -
	unzip -q bun-linux-x64.zip
	install -m 0755 bun-linux-x64/bun /opt/vibelabs-web/bun/bun
	cd / && rm -rf "$work"
fi
echo "bun $(/opt/vibelabs-web/bun/bun --version)"

# Postgres: a role named like the system user, so it signs in over the socket by peer auth.
runuser -u postgres -- psql -tAc "select 1 from pg_roles where rolname = 'vibelabs-web'" | grep -q 1 ||
	runuser -u postgres -- psql -qc 'create role "vibelabs-web" login'
runuser -u postgres -- psql -tAc "select 1 from pg_database where datname = 'vibelabs_web'" | grep -q 1 ||
	runuser -u postgres -- createdb --owner=vibelabs-web vibelabs_web

if [ ! -f /etc/vibelabs-web/web.env ]; then
	umask 027
	cat > /etc/vibelabs-web/web.env <<ENV
NODE_ENV=production
ORIGIN=https://develop.vibelabsmc.org
HOST=127.0.0.1
PORT=3040
ADDRESS_HEADER=x-real-ip
BODY_SIZE_LIMIT=110M
DATABASE_URL=postgres://vibelabs-web@localhost/vibelabs_web?host=/var/run/postgresql
APP_SECRET=$(openssl rand -hex 32)
STORAGE_DIR=/var/lib/vibelabs-web
CLAMD=/var/run/clamav/clamd.ctl
FILE_DELIVERY=x-accel
ACCOUNT_ORIGINS=https://docs.vibelabsmc.org
ADMIN_GITHUB_IDS=$ADMIN_IDS
MAIL_FROM=vibeLABS <no-reply@vibelabsmc.org>
NOINDEX=1
ENV
	chown root:vibelabs-web /etc/vibelabs-web/web.env
	chmod 0640 /etc/vibelabs-web/web.env
	echo "env file written (APP_SECRET generated on the server, never printed)"
fi

install -m 0644 /tmp/vibelabs-web.service /tmp/vibelabs-web-backup.service /tmp/vibelabs-web-backup.timer /etc/systemd/system/
install -m 0755 /tmp/set-env /tmp/backup /opt/vibelabs-web/bin/
rm -f /tmp/vibelabs-web.service /tmp/vibelabs-web-backup.service /tmp/vibelabs-web-backup.timer /tmp/set-env /tmp/backup

# Cloudflare's address ranges, for nginx to trust CF-Connecting-IP only from Cloudflare.
{
	echo "# Cloudflare's address ranges (from cloudflare.com/ips), written by vibelabs-web provision."
	curl -fsS https://www.cloudflare.com/ips-v4 | sed 's/.*/set_real_ip_from &;/'
	echo
	curl -fsS https://www.cloudflare.com/ips-v6 | sed 's/.*/set_real_ip_from &;/'
	echo
} > /etc/nginx/snippets/vibelabs-cloudflare-ips.conf
grep -c set_real_ip_from /etc/nginx/snippets/vibelabs-cloudflare-ips.conf | sed 's/^/cloudflare ranges: /'

systemctl daemon-reload
systemctl enable --now vibelabs-web-backup.timer >/dev/null
echo "provisioned"
REMOTE
