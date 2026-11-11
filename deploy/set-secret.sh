#!/usr/bin/env bash
# Sets one secret on the server without it ever appearing on screen, in shell history or in a
# process list: you type it (hidden), it travels over SSH on standard input, and the server's
# set-env helper writes it into /etc/vibelabs-web/web.env and restarts the website.
#
#   bash deploy/set-secret.sh GITHUB_CLIENT_ID
#   bash deploy/set-secret.sh GITHUB_CLIENT_SECRET
#   bash deploy/set-secret.sh DISCORD_CLIENT_ID
#   bash deploy/set-secret.sh DISCORD_CLIENT_SECRET
#   bash deploy/set-secret.sh SMTP_URL          (e.g. smtps://user:password@smtp.example.com:465)
#
# Leave the value empty to remove the setting.
set -euo pipefail

NAME="${1:?usage: bash deploy/set-secret.sh NAME}"
HOST="${VPS:-root@173.249.34.231}"
read -rsp "Value for $NAME (input hidden): " VALUE
echo
printf '%s\n' "$VALUE" | ssh "$HOST" "/opt/vibelabs-web/bin/set-env $NAME"
unset VALUE
