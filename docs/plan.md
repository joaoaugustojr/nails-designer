# Development plan

Decisions behind this plan: [decisions.md](decisions.md). Screens: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv

Steps marked **(you)** are done by hand, guided step by step; the rest is code written together. Tick each box as it lands.

## Phase 0 — Setup

- [x] **(you)** Create the public GitHub repository and `git init` locally.
- [x] **(you)** Create the Nuxt 4 app with pnpm (Node 24, pnpm pinned through corepack). First commit pushed.
- [x] Tooling: ESLint, Prettier, Husky + lint-staged, commitlint, Vitest, VS Code settings, CI checks.
- [x] Tailwind 4 + shadcn-nuxt (+ `prettier-plugin-tailwindcss`), brand layer in `brand.css`.
- [x] Agent skills installed in the project.

## Phase 1 — Data and login

- [x] Drizzle + SQLite (libsql), schema and migrations: `users`, `settings` (store info, brand, scheduling and cancellation rules), `services`, `service_photos`, `working_hours`, `time_off`, `bookings`. Tests for FK, cascade and unique email.
- [x] nuxt-auth-utils: login, logout, page redirect for `/admin/**`, server guard for `/api/admin/**` (re-checks the user exists).
- [x] First panel user (role `owner`) created at boot from env vars; roles `owner` / `admin`.

## Phase 2 — Owner panel

- [x] Panel layout: bottom navigation (Agenda, Serviços, Horários, Loja), logout.
- [x] Store and brand (owner only; read-only for admins): name, logo, cover, accent color, address, WhatsApp, Instagram, about text, thank-you message.
- [x] Services: list, active toggle, create/edit (photos, details, what's included, price, duration), delete.
- [x] Hours: weekly working hours (several ranges per day), rules (gap, minimum notice, days ahead), cancellation setting, time off.
- [x] Agenda: day view with bookings and free gaps, cancel a booking, block a time.
- [x] Clients: `clients` table keyed by phone, bookings linked to a client, list with search and "Mostrar mais" pagination, metrics per card (visits, total spent, last visit, next booking, cancellations), new "Clientes" tab. Upcoming bookings first, then most recent activity.
- [x] Panel users: owner creates (name, email, password) and removes admins; the owner cannot be removed.
- [x] My account: every panel user changes her own name and password (current password required; other sessions end).
- [x] Owner resets an admin's password (no "forgot password" flow).

## Phase 3 — Client booking

- [x] Availability algorithm + unit tests (durations, gaps, time off, minimum notice, days ahead, day boundaries).
- [x] Catalog with the "Saiba mais" modal.
- [x] Day and time picker.
- [x] Booking form; saved one booking at a time (in-process queue) with an atomic batch that re-checks the slot with `availableStartMinutes` and upserts the client by phone (latest name wins). Idempotency key per form (unique column): a repeated submit returns the same booking. A database trigger rejects overlapping confirmed bookings as the last guard. Rate limit and honeypot on the public endpoint; the same rate limit on `/api/auth/login` (login throttling).
- [x] Thank-you page with .ics download and directions.
- [x] "My booking" page by unguessable token; cancellation honoring the setting.
- [x] Brand applied from settings (accent color as CSS variable, logo, cover).

## Later (not scheduled)

- Client notes by the owner; ratings (owner rates the client, client rates the service); client detail page with full history.

## Pending decisions

- [ ] Image processing on upload (strip EXIF/GPS, resize, WebP) — see decisions.md, "Services and uploads". Decide before going live.

## Phase 4 — Deploy

- [ ] Dockerfile (Node 24, multi-stage, arm64). Ship `server/db/migrations` next to `.output` (same relative path), set `NUXT_APP_SECRET`, `NUXT_DB_URL` on the volume.
- [ ] `deploy/compose.yaml` (project `nails`, one service, one volume) and `deploy/server-deploy.sh`.
- [ ] **(you)** On the box: `/srv/nails`, `.env`, dedicated deploy key restricted in `authorized_keys`, Caddy block, Cloudflare DNS record.
- [ ] GitHub Actions: test → build arm64 → push GHCR → deploy on push to `main`. **(you)** add the repository secrets.
- [ ] Nightly backup to R2 + healthchecks ping. **(you)** install the cron entry.

## Phase 5 — Notifications

- [ ] Thank-you page: add back "A confirmação foi enviada para o seu WhatsApp." once confirmations are sent.
- [ ] Notification module with one entry point and channels: `log` (default), `whatsapp`.
- [ ] Reminder task (Nitro scheduled task, every 5 min): 1 day before, day of, 1 h and 30 min before, each sent once (add `reminder_day_before_sent_at` next to the other sent-at columns).
- [ ] **(you)** Meta Business account, app, number, utility templates approved.
- [ ] WhatsApp Cloud API channel: confirmation + reminders.
