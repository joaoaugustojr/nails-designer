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
- **Panel users:** more than one user may log in, with two roles: **owner** (exactly one, the store's owner, created at boot) and **admin** (invited users). Owner-only actions are decided with the panel screens (phase 2).
- **Retention:** the thank-you page carries a personal message from the owner, add-to-calendar (.ics), directions and Instagram.

### Notifications

- **WhatsApp Cloud API (official, Meta)** for confirmation and reminders (day of, 1 h before, 30 min before). Built **last**. Unofficial libraries (Baileys, Evolution) rejected: they risk banning the owner's work number.
- Email is optional and secondary. No SMS.
- Until WhatsApp lands, a `log` channel records messages instead of sending them.

### Stack

- **Nuxt 4 full stack** (pages + Nitro server routes) in one app, one container. Next.js rejected: the team already knows Nuxt.
- **UI:** shadcn-nuxt + Tailwind 4. **Validation:** zod, shared by client and server.
- **Database: SQLite** with Drizzle ORM. Postgres rejected as unnecessary for one business.
- **Auth:** nuxt-auth-utils (sealed cookie session, built-in password hashing).
- **Reminders:** Nitro scheduled tasks inside the app process. No Redis, no queue.
- **Uploads** (logo, cover, service photos): stored on the app volume next to the database.
- **Tests:** Vitest. The availability algorithm and booking rules must have tests.

### Infrastructure

- **An existing ARM64 server** that already runs Docker Compose and Caddy. One compose project (`nails`) with a single `web` service and one volume (SQLite + uploads). Caddy (its own project) joins the `nails` network.
- **Domain:** a temporary subdomain of a domain we already own, until the customer has her own. Cloudflare proxied; it must be a first-level subdomain so the universal certificate covers it. The actual hostname lives in the server config, not in this repo.
- **No staging.** Personal use; production only.
- **Auto-deploy on push to `main`:** GitHub Actions → tests → arm64 image built on `ubuntu-24.04-arm` → GHCR → SSH deploy.
- **Public GitHub repository.** Consequences: no secret ever committed (`.env` lives only on the server, CI secrets in GitHub Secrets); deploy runs only on push to `main`; the deploy SSH key is dedicated to this project and restricted in `authorized_keys` to the deploy script.
- **Backups:** nightly copy of the SQLite file (`sqlite3 .backup`) and uploads to a private Cloudflare R2 bucket under `nails/`, with a healthchecks.io ping so a missed night raises an alert.

### Tooling

- **Lint and format:** ESLint (`@nuxt/eslint`, stylistic off, `simple-import-sort`, `eslint-config-prettier`), Prettier (double quotes, semicolons, trailing commas, width 100), Husky + lint-staged on pre-commit, commitlint with Conventional Commits on commit-msg, shared VS Code settings.
- `prettier-plugin-tailwindcss` is added together with Tailwind (it needs the stylesheet path).
- **lint-staged pinned to 15:** v16+ needs git ≥ 2.32 and the dev machine runs git 2.25. Unpin after upgrading git.
- **TypeScript pinned to 5.9:** TS 7 is not supported yet by vue-tsc and typescript-eslint.
- **pnpm pinned** through `packageManager` in package.json (corepack); Node 24 LTS locally, in CI and in the image.
- **CI checks** on every push to `main` and every pull request: typecheck, lint, format check, tests.

### UI setup

- **Tailwind 4** through `@tailwindcss/vite`; **shadcn-vue** through `shadcn-nuxt`, style `reka-nova`, icons `lucide`, components in `app/components/ui`.
- **`app/assets/css/main.css` belongs to the shadcn-vue CLI** (it rewrites fonts and tokens on `init`/`add`); never edit it by hand. **Brand overrides live in `app/assets/css/brand.css`**, loaded after it: Manrope (UI) and Parisienne (logo), default rosé primary `#a8325a`, radius 0.75rem. A store's accent color will override `--primary` at runtime (white label).
- **The approved mockups are the source of truth for the UI; screens must match them.** shadcn-vue stays (behavior and accessibility of Dialog, Select, Switch…), but its components are our source code and are edited to the mockup: palette tokens in `brand.css` (background `#fbf8f7`, ink `#221b1e`, border `#eadfe2`, input `#dccdd2`, muted text `#6b5f64`, blush `#f6e7ec`); Button sizes `default` 52px / 14px radius / 16px bold, `md` 40px pill, `sm` 36px pill, plus an `ink` (dark) variant; Input 48px / 12px radius / white; labels 14px semibold. Never re-add an edited component with `--overwrite`.
- Each screen is checked against its mockup at 390×844 with a headless browser before it is called done.
- `cn()` comes from the `cn` package (by shadcn, replaces clsx + tailwind-merge), as generated by the CLI.

### Data and auth (phase 1)

- **Driver: `@libsql/client` + Drizzle 0.45 (stable).** `better-sqlite3` was dropped: its prebuilt binary needs glibc ≥ 2.33 and the dev machine (Ubuntu 20.04) has 2.31. Stable Drizzle has no `node:sqlite` driver; the 1.0 beta was not adopted. libsql enables `foreign_keys` on every connection; we set `journal_mode = WAL` at boot and a 5 s busy timeout.
- **Time convention:** instants (bookings, time off, audit columns) are stored as UTC epoch milliseconds; working hours are a weekday (0 = Sunday) plus minutes from midnight in `settings.timezone` (default `America/Sao_Paulo`). The server runs in UTC, so conversions always go through the store's timezone.
- **Money:** integer cents. **Bookings snapshot** the service name, duration and price, and keep one nullable sent-at column per reminder (day of, 1 h, 30 min).
- **Settings** is a single-row table (`CHECK id = 1`), created at boot.
- **Constraints live in the database:** foreign keys (photos cascade with their service; bookings keep their snapshot when a service is deleted), unique lowercase user email, ranges and status checks.
- **Migrations** are generated with `pnpm db:generate` into `server/db/migrations` and **applied at server boot**, before any request (every DB access awaits the same setup promise). The image must ship that folder at the same path relative to the working directory.
- **First panel user = the owner**, created at boot from `NUXT_ADMIN_NAME/EMAIL/PASSWORD`, only while the users table is empty. Further users are admins, invited from the panel (phase 2).
- **Roles** live in `users.role` (`owner` | `admin`, default `admin`); a partial unique index allows at most one owner. The role travels in the session and in the guard's user. Migration `0001_user_roles` promotes the oldest existing user to owner.
- **Review every generated migration.** drizzle-kit rebuilds SQLite tables to add constraints and, for `0001`, copied a column the old table did not have; that file is hand-edited.
- **Sessions:** nuxt-auth-utils sealed cookies (7 days), sealed with `NUXT_APP_SECRET`. Because they are stateless, the API guard re-checks that the user still exists, so removing a panel user cuts access immediately.
- **The security boundary is the server guard on `/api/admin/**`;** the page middleware only redirects. Login gives the same answer for an unknown email and a wrong password.
- **Note:** the `nuxt` / `nitro` skills describe Nuxt 5; server code here uses the Nuxt 4 auto-imported h3 helpers, as documented in nuxt-auth-utils' own README.

### Agent skills

- Installed **per project** in `.claude/skills/` (copied, versioned in the repo, pinned by commit in `skills-lock.json`): `nuxt` and `nitro` (onmax/nuxt-skills), `shadcn-vue` (official, unovue/shadcn-vue), `vitest` (antfu/skills). Reviewed before use: documentation only, no scripts.
- Not installed: Tailwind (generic or low-reputation options; shadcn-vue covers usage), Drizzle (the popular ones follow other projects' Postgres conventions), nuxt-auth-utils (none exists). WhatsApp: search again in phase 5.
- **The `nuxt` and `nitro` skills target Nuxt 5 / Nitro v3; this project runs Nuxt 4 (latest stable, 4.6).** Nuxt-5-only advice does not apply until we upgrade: importing server utils from `nuxt/server`, h3 v2 / Web `Request`-`Response` handlers, Vite 8, typed `$fetch` from generated routes. Directory layout, aliases, auto-imports and data fetching are the same.
- Update with `npx skills update -p`; restore with `npx skills install`. Vendored files are excluded from Prettier.

### Brand (first customer)

- **Logo: option C, script "Aline Prata" + "NAILS DESIGNER"** in tracked caps. Pink variants exist because the accent color is configurable.
- Mockups of every screen and the logo: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv
