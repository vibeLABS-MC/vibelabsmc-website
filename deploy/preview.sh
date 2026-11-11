#!/usr/bin/env bash
# Deploys the current checkout to develop.vibelabsmc.org. Builds here, uploads a release,
# installs its runtime dependencies on the server, switches to it and restarts only the
# website's own service. If the new release doesn't answer within 60 seconds it switches back.
# Every other running service is listed before and after, and any difference is shown.
#
#   bash deploy/preview.sh          (from the repository root; run deploy/provision.sh once first)
set -euo pipefail

HOST="${VPS:-root@173.249.34.231}"
RELEASE="$(git rev-parse --short HEAD)$(git diff --quiet && git diff --cached --quiet || echo -dirty)-$(date +%Y%m%d%H%M%S)"
ARCHIVE="/tmp/vibelabs-web-$RELEASE.tgz"

bun run build
tar -czf "$ARCHIVE" build drizzle package.json bun.lock
scp -q "$ARCHIVE" deploy/server/nginx-develop.conf "$HOST:/tmp/"
rm -f "$ARCHIVE"
# The server's own pieces (services, timer, helper scripts) travel with the code.
ssh "$HOST" 'rm -rf /tmp/vibelabs-web-deploy && install -d -m 0700 /tmp/vibelabs-web-deploy'
scp -q deploy/server/vibelabs-web.service deploy/server/vibelabs-web-backup.service \
	deploy/server/vibelabs-web-backup.timer deploy/server/backup deploy/server/set-env \
	"$HOST:/tmp/vibelabs-web-deploy/"

ssh "$HOST" "RELEASE=$RELEASE bash -s" <<'REMOTE'
set -euo pipefail
snapshot() {
	systemctl list-units --type=service --state=running --no-legend --plain | awk '{print $1}' | sort |
		while read -r unit; do echo "$unit $(systemctl show -p MainPID --value "$unit")"; done
}
snapshot > /tmp/vibelabs-web.before

DIR="/opt/vibelabs-web/releases/$RELEASE"
PREVIOUS="$(readlink -f /opt/vibelabs-web/current 2>/dev/null || true)"
mkdir -p "$DIR"
tar -xzf "/tmp/vibelabs-web-$RELEASE.tgz" -C "$DIR"
rm -f "/tmp/vibelabs-web-$RELEASE.tgz"
cd "$DIR"
HOME=/root BUN_INSTALL_CACHE_DIR=/var/cache/vibelabs-web-bun /opt/vibelabs-web/bun/bun install --production --frozen-lockfile --silent
chown -R root:root "$DIR"
chmod -R go-w "$DIR"

# Install each of the server's own pieces that changed (only ours: vibelabs-web*).
install_changed() { # name target mode
	if cmp -s "/tmp/vibelabs-web-deploy/$1" "$2"; then return 1; fi
	install -m "$3" "/tmp/vibelabs-web-deploy/$1" "$2"
	echo "updated $2"
}
units_changed=no
for unit in vibelabs-web.service vibelabs-web-backup.service vibelabs-web-backup.timer; do
	if install_changed "$unit" "/etc/systemd/system/$unit" 0644; then units_changed=yes; fi
done
for helper in backup set-env; do install_changed "$helper" "/opt/vibelabs-web/bin/$helper" 0755 || true; done
if [ "$units_changed" = yes ]; then
	systemctl daemon-reload
	systemctl try-restart vibelabs-web-backup.timer
fi
rm -rf /tmp/vibelabs-web-deploy

ln -sfn "$DIR" /opt/vibelabs-web/current.new
mv -T /opt/vibelabs-web/current.new /opt/vibelabs-web/current
systemctl enable vibelabs-web >/dev/null 2>&1
systemctl restart vibelabs-web

healthy=no
for _ in $(seq 1 60); do
	if curl -fsS -o /dev/null -H 'X-Real-IP: 127.0.0.1' http://127.0.0.1:3040/; then healthy=yes; break; fi
	sleep 1
done
if [ "$healthy" != yes ]; then
	echo "!! the new release did not start; recent log:" >&2
	journalctl -u vibelabs-web -n 40 --no-pager >&2 || true
	if [ -n "$PREVIOUS" ]; then
		ln -sfn "$PREVIOUS" /opt/vibelabs-web/current.new && mv -T /opt/vibelabs-web/current.new /opt/vibelabs-web/current
		systemctl restart vibelabs-web
		echo "!! switched back to $(basename "$PREVIOUS")" >&2
	fi
	exit 1
fi
echo "release $RELEASE is running"

# nginx: only our own site file, checked before a graceful reload, restored if the check fails.
SITE=/etc/nginx/sites-available/develop.vibelabsmc.org
if ! cmp -s /tmp/nginx-develop.conf "$SITE"; then
	mkdir -p /root/backups
	cp -p "$SITE" "/root/backups/develop.vibelabsmc.org.$(date +%Y%m%d%H%M%S).conf"
	cp "$SITE" /tmp/nginx-develop.previous
	install -m 0644 /tmp/nginx-develop.conf "$SITE"
	if nginx -t 2>/tmp/nginx-test.log; then
		systemctl reload nginx
		echo "nginx site updated and reloaded"
	else
		cat /tmp/nginx-test.log >&2
		install -m 0644 /tmp/nginx-develop.previous "$SITE"
		echo "!! nginx rejected the new site file; the old one is back" >&2
		exit 1
	fi
fi
rm -f /tmp/nginx-develop.conf /tmp/nginx-develop.previous

# Keep the five newest releases.
ls -1dt /opt/vibelabs-web/releases/*/ | tail -n +6 | xargs -r rm -rf

snapshot > /tmp/vibelabs-web.after
echo "-- other services, before -> after (no lines means nothing else changed):"
diff /tmp/vibelabs-web.before /tmp/vibelabs-web.after | grep -v 'vibelabs-web.service' | grep -E '^[<>]' || true
REMOTE
