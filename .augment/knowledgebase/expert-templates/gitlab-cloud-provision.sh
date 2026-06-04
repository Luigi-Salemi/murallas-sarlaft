#!/bin/bash
# GitLab Cloud environment provisioning script.
#
# Installs the glab CLI. It intentionally does not read $GITLAB_TOKEN or clone
# repos: provision scripts are baked into the shared environment snapshot, while
# GitLab credentials are per-user/per-session secrets. Repo auth and clone happen
# in gitlab-cloud-vm-startup.sh at VM boot.
set -euo pipefail

# --- Install glab CLI ---------------------------------------------------------
if command -v glab >/dev/null 2>&1; then
	glab --version
	exit 0
fi

arch="$(dpkg --print-architecture)"
version="$(curl -fsSL 'https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/releases?per_page=1' | sed -n 's/.*"tag_name":"v\([^"]*\)".*/\1/p' | head -n1)"
if [ -z "$version" ]; then
	echo "ERROR: unable to determine latest glab release version" >&2
	exit 1
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL -o "$tmp/glab.deb" "https://gitlab.com/gitlab-org/cli/-/releases/v${version}/downloads/glab_${version}_linux_${arch}.deb"
apt-get update
apt-get install -y "$tmp/glab.deb"
glab --version
