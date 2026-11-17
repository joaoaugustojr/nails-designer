#!/usr/bin/env bash
# Runs the given version of the app: ./server-deploy.sh <commit sha>.
# The CI's deploy key may run nothing else: authorized_keys forces this script, and the commit
# the CI asks for arrives in SSH_ORIGINAL_COMMAND. Rolling back is the same call with an older
# commit from deploys.log.
set -euo pipefail
cd "$(dirname "$0")"

tag="${SSH_ORIGINAL_COMMAND:-${1:-}}"
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: server-deploy.sh <40-character commit sha>" >&2
  exit 2
fi
image="ghcr.io/joaoaugustojr/nails-designer:$tag"

docker pull "$image"
docker tag "$image" nails:current
# --wait returns only when the healthcheck passes, so a version that fails to boot fails the deploy.
docker compose up -d --wait web
echo "$(date -u +%FT%TZ) $tag" >> deploys.log

# Keeps disk use flat: images of older versions can be pulled again for a rollback.
docker image prune -af --filter "label=org.opencontainers.image.source=https://github.com/joaoaugustojr/nails-designer" --filter "until=168h"
