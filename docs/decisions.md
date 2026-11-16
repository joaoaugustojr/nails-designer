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
- `cn()` comes from the `cn` package (by shadcn, replaces clsx + tailwind-merge), as generated by the CLI.

### Agent skills

- Installed **per project** in `.claude/skills/` (copied, versioned in the repo, pinned by commit in `skills-lock.json`): `nuxt` and `nitro` (onmax/nuxt-skills), `shadcn-vue` (official, unovue/shadcn-vue), `vitest` (antfu/skills). Reviewed before use: documentation only, no scripts.
- Not installed: Tailwind (generic or low-reputation options; shadcn-vue covers usage), Drizzle (the popular ones follow other projects' Postgres conventions), nuxt-auth-utils (none exists). WhatsApp: search again in phase 5.
- **The `nuxt` and `nitro` skills target Nuxt 5 / Nitro v3; this project runs Nuxt 4 (latest stable, 4.6).** Nuxt-5-only advice does not apply until we upgrade: importing server utils from `nuxt/server`, h3 v2 / Web `Request`-`Response` handlers, Vite 8, typed `$fetch` from generated routes. Directory layout, aliases, auto-imports and data fetching are the same.
- Update with `npx skills update -p`; restore with `npx skills install`. Vendored files are excluded from Prettier.

### Brand (first customer)

- **Logo: option C, script "Aline Prata" + "NAILS DESIGNER"** in tracked caps. Pink variants exist because the accent color is configurable.
- Mockups of every screen and the logo: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv
