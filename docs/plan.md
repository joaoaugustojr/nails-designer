# Development plan

Decisions behind this plan: [decisions.md](decisions.md). Screens: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv

Steps marked **(you)** are done by hand, guided step by step; the rest is code written together. Tick each box as it lands.

## Phase 0 — Setup

- [ ] **(you)** Create the public GitHub repository and `git init` locally.
- [ ] **(you)** Create the Nuxt 4 app with pnpm in this folder (exact command given at that step, checked against the current `create nuxt` behavior so `docs/` survives).
- [ ] **(you)** Add tooling: `@nuxt/eslint`, Prettier, Vitest.
- [ ] **(you)** Add Tailwind 4 + shadcn-nuxt.
- [ ] First commit and push.

## Phase 1 — Data and login

- [ ] Drizzle + SQLite, schema and migrations: `users`, `settings` (store info, brand, scheduling and cancellation rules), `services`, `service_photos`, `working_hours`, `time_off`, `bookings`.
- [ ] nuxt-auth-utils: login, logout, route protection for `/admin/**` and `/api/admin/**`.
- [ ] CLI/seed to create the first panel user.

## Phase 2 — Owner panel

- [ ] Store and brand: name, logo, cover, accent color, address, WhatsApp, Instagram, about text, thank-you message.
- [ ] Services: list, active toggle, create/edit (photos, details, what's included, price, duration).
- [ ] Hours: weekly working hours (several ranges per day), rules (gap, minimum notice, days ahead), cancellation setting, time off.
- [ ] Agenda: day view with bookings and free gaps, cancel a booking, block a time.
- [ ] Panel users: invite and remove.

## Phase 3 — Client booking

- [ ] Availability algorithm + unit tests (durations, gaps, time off, minimum notice, days ahead, day boundaries).
- [ ] Catalog with the "Saiba mais" modal.
- [ ] Day and time picker.
- [ ] Booking form; save inside a transaction that re-checks the slot. Rate limit and honeypot on the public endpoint.
- [ ] Thank-you page with .ics download and directions.
- [ ] "My booking" page by unguessable token; cancellation honoring the setting.
- [ ] Brand applied from settings (accent color as CSS variable, logo, cover).

## Phase 4 — Deploy

- [ ] Dockerfile (Node 24, multi-stage, arm64).
- [ ] `deploy/compose.yaml` (project `nails`, one service, one volume) and `deploy/server-deploy.sh`.
- [ ] **(you)** On the box: `/srv/nails`, `.env`, dedicated deploy key restricted in `authorized_keys`, Caddy block, Cloudflare DNS record.
- [ ] GitHub Actions: test → build arm64 → push GHCR → deploy on push to `main`. **(you)** add the repository secrets.
- [ ] Nightly backup to R2 + healthchecks ping. **(you)** install the cron entry.

## Phase 5 — Notifications

- [ ] Notification module with one entry point and channels: `log` (default), `email` (optional), `whatsapp`.
- [ ] Reminder task (Nitro scheduled task, every 5 min): day of, 1 h and 30 min before, each sent once.
- [ ] **(you)** Meta Business account, app, number, utility templates approved.
- [ ] WhatsApp Cloud API channel: confirmation + reminders.
