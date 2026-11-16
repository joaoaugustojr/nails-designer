# Product and architecture decisions

Running record of decisions that are not derivable from the code. Newest entry wins when two disagree. Add a dated section for every new decision; never rewrite history, supersede it.

## 2026-11-16 — Initial decisions

### Product

- **What it is:** online booking for a nail designer. First customer: Aline Prata (Nails Designer). Clients book from their phone; the owner manages everything in a password-protected panel.
- **White label.** The business model is selling hosting + maintenance, not the code. Nothing brand-specific is hardcoded: name, logo, cover photo, accent color, address, WhatsApp, Instagram and texts are all set in the panel. One deployment per customer.
- **Client flow:** catalog → service details ("Saiba mais" modal: photo gallery, details, "what's included") → day and time → name + phone (required) + email (optional) + reminders opt-in → thank-you page → "my booking" page reached from the link in the confirmation message.
- **Bookings are auto-confirmed.** No owner approval step.
- **Available slots** = working hours of that weekday, minus time off, minus existing bookings (plus the configured gap between appointments), keeping only start times where the whole service duration fits. Re-checked inside a transaction on save, so two clients can never take the same slot.
- **Scheduling rules are settings:** gap between appointments, minimum notice, how many days ahead the agenda is open.
- **Cancellation is a setting:** "client may cancel through the link" on/off plus a deadline (hours before). Default **off**: only the owner cancels, from the agenda.
- **Panel users:** more than one user may log in; all have the same permissions for now.
- **Retention:** the thank-you page carries a personal message from the owner, add-to-calendar (.ics), directions and Instagram.

### Notifications

- **WhatsApp Cloud API (official, Meta)** for confirmation and reminders (day of, 1 h before, 30 min before). Built **last**. Unofficial libraries (Baileys, Evolution) rejected: they risk banning the owner's work number.
- Email is optional and secondary. No SMS.
- Until WhatsApp lands, a `log` channel records messages instead of sending them.

### Stack

- **Nuxt 4 full stack** (pages + Nitro server routes) in one app, one container. Next.js rejected: the team already runs Nuxt in career-talk.
- **UI:** shadcn-nuxt + Tailwind 4 (same kit as career-talk). **Validation:** zod, shared by client and server.
- **Database: SQLite** with Drizzle ORM. Postgres rejected as unnecessary for one business.
- **Auth:** nuxt-auth-utils (sealed cookie session, built-in password hashing).
- **Reminders:** Nitro scheduled tasks inside the app process. No Redis, no queue.
- **Uploads** (logo, cover, service photos): stored on the app volume next to the database.
- **Tests:** Vitest. The availability algorithm and booking rules must have tests.

### Infrastructure

- **Same ARM64 box as career-talk.** One compose project (`nails`) with a single `web` service and one volume (SQLite + uploads). Caddy (its own project) joins the `nails` network.
- **Domain:** `alineprata.careerfreetalk.com` for now (Cloudflare proxied, first-level subdomain so the universal certificate covers it).
- **No staging.** Personal use; production only.
- **Auto-deploy on push to `main`:** GitHub Actions → tests → arm64 image built on `ubuntu-24.04-arm` → GHCR → SSH deploy.
- **Public GitHub repository.** Consequences: no secret ever committed (`.env` lives only on the server, CI secrets in GitHub Secrets); deploy runs only on push to `main`; the deploy SSH key is dedicated to this project and restricted in `authorized_keys` to the deploy script.
- **Backups:** nightly copy of the SQLite file (`sqlite3 .backup`) and uploads to the existing R2 bucket under `nails/`, with a healthchecks.io ping, mirroring career-talk's `pg-backup.sh`.

### Brand (first customer)

- **Logo: option C, script "Aline Prata" + "NAILS DESIGNER"** in tracked caps. Pink variants exist because the accent color is configurable.
- Mockups of every screen and the logo: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv
