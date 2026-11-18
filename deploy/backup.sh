#!/usr/bin/env bash
# Nightly backup to R2, run by cron: ./backup.sh. Settings and R2 keys come from backup.env
# (kept apart from .env so the app never sees the R2 keys).
# Nothing is installed on the host: the snapshot runs in the app container and the upload in a
# throwaway rclone container that mounts the data volume read-only.
set -euo pipefail
cd "$(dirname "$0")"
set -a
source backup.env
set +a

# healthchecks.io takes the exit code: 0 marks the run as good, anything else alerts.
curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL/start" > /dev/null || true
trap 'curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL/$?" > /dev/null || true' EXIT

# VACUUM INTO gives a consistent copy while the app keeps writing. The image has no sqlite3
# binary, so Node's built-in SQLite does it.
# SQLite creates a missing file instead of failing, which would back up an empty database.
docker compose exec -T web node --no-warnings -e '
  const { DatabaseSync } = require("node:sqlite");
  const fs = require("node:fs");
  if (!fs.existsSync("/data/nails.db")) throw new Error("/data/nails.db not found");
  fs.rmSync("/data/backup.db", { force: true });
  new DatabaseSync("/data/nails.db").exec("VACUUM INTO '\''/data/backup.db'\''");
'

rclone() {
  docker run --rm --env-file backup.env -v nails_data:/data:ro rclone/rclone:1.69.1 "$@"
}
# One file per day; an R2 lifecycle rule on nails/db/ deletes the old ones.
rclone copyto /data/backup.db "r2:$R2_BUCKET/nails/db/nails-$(date -u +%F).db"
# copy never deletes, so a photo removed by mistake is still in the bucket.
rclone copy /data/uploads "r2:$R2_BUCKET/nails/uploads"
