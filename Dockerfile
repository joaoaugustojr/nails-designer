# Two stages: `build` has pnpm, the source and every dependency; the final image only carries
# the built server (.output, with its own traced node_modules) and the migrations.
# Native packages (sharp, libsql) are picked for the platform that runs the build, so the
# production image is built on an arm64 runner, never cross-built.

FROM node:24-slim AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable

# Dependencies first: this layer is reused while the lockfile does not change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile && pnpm build

FROM node:24-slim
# Links the GHCR package to the repository; server-deploy.sh prunes old images by it.
LABEL org.opencontainers.image.source=https://github.com/joaoaugustojr/nails-designer
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NUXT_DB_URL=file:/data/nails.db \
    NUXT_UPLOADS_DIR=/data/uploads

COPY --from=build /app/.output ./.output
# Read at boot from server/db/migrations, relative to /app.
COPY --from=build /app/server/db/migrations ./server/db/migrations

# The database and the uploads live on a volume mounted at /data.
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
