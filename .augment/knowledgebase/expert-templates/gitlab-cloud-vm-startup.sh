#!/bin/bash
# GitLab Cloud VM startup script.
#
# Runs on every VM boot, after Cosmos auto-installs user/tenant secrets as env
# vars. It configures HTTPS Git auth via .netrc and clones/fetches repos listed
# in $GITLAB_REPOS without ever storing the token in Git remote URLs.
set -euo pipefail

umask 077
log=/var/log/augment-gitlab-startup.log
mkdir -p "$(dirname "$log")"
: >"$log"
chmod 600 "$log"
exec >>"$log" 2>&1

echo "[$(date -Is)] GitLab startup begin"

if [ -z "${GITLAB_TOKEN:-}" ]; then
	echo "GITLAB_TOKEN is not set; skipping GitLab repo setup"
	exit 0
fi

if [ -z "${GITLAB_REPOS:-}" ]; then
	echo "GITLAB_REPOS is not set; no GitLab repos to clone"
	exit 0
fi

host="${GITLAB_HOST:-gitlab.com}"
host="${host#https://}"
host="${host#http://}"
host="${host%%/*}"

netrc="${HOME:-/root}/.netrc"
netrc_tmp="$(mktemp "${netrc}.XXXXXX")"

if [ -f "$netrc" ]; then
	awk -v host="$host" '
    /^machine[[:space:]]+/ { skip = ($2 == host) }
    !skip { print }
  ' "$netrc" >"$netrc_tmp"
fi

if [ -s "$netrc_tmp" ]; then
	printf '\n' >>"$netrc_tmp"
fi

cat >>"$netrc_tmp" <<EOF
machine ${host}
login oauth2
password ${GITLAB_TOKEN}
EOF
mv "$netrc_tmp" "$netrc"
chmod 600 "$netrc"

IFS=',' read -ra repos <<<"$GITLAB_REPOS"
for raw_repo in "${repos[@]}"; do
	repo="$(echo "$raw_repo" | xargs)"
	[ -z "$repo" ] && continue
	repo="${repo%.git}"
	dest="/workspace/$repo"
	remote="https://${host}/${repo}.git"
	mkdir -p "$(dirname "$dest")"
	if [ -d "$dest/.git" ]; then
		echo "Fetching existing GitLab repo: $dest"
		git -C "$dest" remote set-url origin "$remote"
		git -C "$dest" fetch --prune origin
	else
		echo "Cloning GitLab repo: $repo"
		git clone "$remote" "$dest"
	fi
done

echo "[$(date -Is)] GitLab startup done"
