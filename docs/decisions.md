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
- **Panel users:** more than one user may log in, with two roles: **owner** (exactly one, the store's owner, created at boot) and **admin** (created by the owner). **No invitations:** the owner registers a user with name, email and password, and that user can log in right away.
- **Owner only:** create and remove panel users; edit store and brand (name, logo, cover, accent color, contacts, texts). **Owner and admin:** services, hours, rules, time off and the agenda. Admins see the Loja tab read-only. Enforced on the server, mirrored in the UI.
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
- **The approved mockups are the source of truth for the UI; screens must match them.** shadcn-vue stays (behavior and accessibility of Dialog, Select, Switch…), but its components are our source code and are edited to the mockup: palette tokens in `brand.css` (background `#fbf8f7`, ink `#221b1e`, border `#eadfe2`, input `#dccdd2`, muted text `#6b5f64`, blush `#f6e7ec`); Button sizes `default` 52px / 14px radius / 16px bold, `md` 40px pill, `sm` 36px pill; Input 48px / 12px radius / white; labels 14px semibold. Never re-add an edited component with `--overwrite`.
- Each screen is checked against its mockup at 390×844 with a headless browser before it is called done.
- `cn()` comes from the `cn` package (by shadcn, replaces clsx + tailwind-merge), as generated by the CLI.

### Data and auth (phase 1)

- **Driver: `@libsql/client` + Drizzle 0.45 (stable).** `better-sqlite3` was dropped: its prebuilt binary needs glibc ≥ 2.33 and the dev machine (Ubuntu 20.04) has 2.31. Stable Drizzle has no `node:sqlite` driver; the 1.0 beta was not adopted. libsql enables `foreign_keys` on every connection; we set `journal_mode = WAL` at boot and a 5 s busy timeout.
- **Time convention:** instants (bookings, time off, audit columns) are stored as UTC epoch milliseconds; working hours are a weekday (0 = Sunday) plus minutes from midnight in `settings.timezone` (default `America/Sao_Paulo`). The server runs in UTC, so conversions always go through the store's timezone.
- **Money:** integer cents. **Bookings snapshot** the service name, duration and price, and keep one nullable sent-at column per reminder (day of, 1 h, 30 min).
- **Settings** is a single-row table (`CHECK id = 1`), created at boot.
- **Constraints live in the database:** foreign keys (photos cascade with their service; bookings keep their snapshot when a service is deleted), unique lowercase user email, ranges and status checks.
- **Migrations** are generated with `pnpm db:generate` into `server/db/migrations` and **applied at server boot**, before any request (every DB access awaits the same setup promise). The image must ship that folder at the same path relative to the working directory.
- **First panel user = the owner**, created at boot from `NUXT_ADMIN_NAME/EMAIL/PASSWORD`, only while the users table is empty. Further users are admins, created by the owner in the panel (phase 2).
- **Roles** live in `users.role` (`owner` | `admin`, default `admin`); a partial unique index allows at most one owner. The role travels in the session and in the guard's user. Migration `0001_user_roles` promotes the oldest existing user to owner.
- **Review every generated migration.** drizzle-kit rebuilds SQLite tables to add constraints and, for `0001`, copied a column the old table did not have; that file is hand-edited.
- **Sessions:** nuxt-auth-utils sealed cookies (7 days), sealed with `NUXT_APP_SECRET`. Because they are stateless, the API guard re-checks that the user still exists, so removing a panel user cuts access immediately.
- **The security boundary is the server guard on `/api/admin/**`;** the page middleware only redirects. Login gives the same answer for an unknown email and a wrong password.
- **Note:** the `nuxt` / `nitro` skills describe Nuxt 5; server code here uses the Nuxt 4 auto-imported h3 helpers, as documented in nuxt-auth-utils' own README.

### Services and uploads (phase 2)

- **Uploads** (service photos now; logo and cover next) are stored in `NUXT_UPLOADS_DIR` (default `.data/uploads`, the app volume in production) under random UUID names, and served by `/uploads/<name>` with a one-year immutable cache. Only names matching the UUID pattern are served, so the route cannot reach any other file.
- **An image is accepted by its bytes, not by its name or Content-Type:** JPEG, PNG and WebP signatures only (no SVG, which can carry scripts), up to 8 MB, at most 10 photos per service. All images of a request are validated before any is written. Deleting a photo or a service deletes its files. Images are stored as uploaded (no resizing yet).
- **Pending decision — image processing:** phone photos carry EXIF metadata, including the GPS position where they were taken, and uploads keep it today. Proposal: re-encode every upload with `sharp` (strips all metadata, resizes to ≤ 1600 px, converts to WebP, ~200–300 KB instead of 4–8 MB). Postponed by the owner on 2026-11-16; check sharp's native binary on the dev machine (glibc 2.31) and on the ARM image before adopting it. Must be decided before real customer photos go live.
- **The first photo is the cover.** Reordering photos is not built yet.
- **Prices** are typed the Brazilian way ("45", "45,50", "1.234,56") and stored in cents; durations go in 15-minute steps up to 8 h. The service form schema (`shared/schemas/service.ts`) is shared by the form and the API.
- New photos are uploaded when the form is saved; removing an existing photo is immediate (after a confirm). Deleting a service keeps its bookings, thanks to the snapshot columns.
- Confirmations use the app's async dialog (see Conventions); the browser's `confirm()` is no longer used.

### Hours, rules and time off (phase 2)

- **Working hours:** up to 4 ranges per weekday, edited per day and saved as a whole (the day's ranges are replaced in one transaction). Ranges are sorted and must not overlap — checked by the shared schema on both sides. Turning a day on starts it at 09:00–18:00; turning it off deletes its ranges.
- **Rules save on change** (no Save button): gap between appointments (0–30 min), minimum notice (none to 1 day), agenda open for 7–90 days, client cancellation on/off and its deadline (1 h to 1 day). The slot step stays at 30 min and is not exposed yet.
- **Time off** is entered as dates (whole days) or a date range with times, in the store's timezone, and stored as UTC instants; whole days run until midnight after the last day. Only upcoming entries are listed. The same table will hold the "block a time" from the agenda.
- **Timezone conversion** (`shared/utils/time.ts`) uses `Intl` only, no library, and is tested across a UTC day boundary and daylight-saving changes; the booking engine (phase 3) will use it.
- Admins and the owner can both edit hours, rules and time off.
- **Selects use the shadcn Select (Reka UI), not the native `<select>`**: the native dropdown cannot be styled and looked out of place. `OptionSelect` wraps it for numeric options (rules, cancel deadline, service duration); sizes `default` (48px, forms) and `sm` (34px, settings rows). The `native-select` component was removed.
- New shadcn components are registered only when the dev server starts: restart `pnpm dev` after `shadcn-vue add`.

### Store and brand (phase 2)

- **Switches follow the store's accent too** (the mockup's green was dropped); the thumb uses the primary foreground when on, so it stays visible in both themes.
- **Panel buttons follow the store's accent** (primary variant), by the owner's choice: the dark `ink` buttons of the mockup were removed, so a store's brand color shows across the panel too.
- **Owner-only on the server** (`requireOwner`, 403 for admins); admins see the Loja tab read-only (disabled fieldset, no upload or save). The theme is a personal, per-device preference (stored in the browser), so it sits at the top of the Loja tab, outside the owner-only form, with a note that it does not change the clients' site — each client picks their own theme there.
- **Accent color: 5 curated options** (Rosé, Vinho, Nude, Lavanda, Grafite), each with a light value (stored, white text passes contrast) and a dark-theme counterpart. A free color picker was not offered: arbitrary colors break contrast.
- **The accent applies everywhere at runtime** (`app/plugins/brand.ts` injects `--primary`/`--ring`; `html:root` outranks `brand.css`). The blush tints derive from it with `color-mix` (12% of the accent on white matches the mockup's `#f6e7ec`), so every accent gets matching tones without a rebuild.
- **Logo and cover** upload immediately (same image validation as service photos); replacing one deletes the previous file. The logo replaces the initials in `StoreMark`.
- **Feedback:** saving shows only in the button ("Salvando…" with a spinner, disabled to prevent double submits), via `SubmitButton`; there are no "saved" messages — only errors are shown.
- WhatsApp is stored as digits and shown as `(11) 91234-5678`; Instagram is stored without `@`. Empty optional fields are stored as NULL.
- The store's public identity (`/api/store`) is fetched once per page load and shared (`useStoreInfo`), refreshed after saving.

### Agenda (phase 2)

- **One day at a time**, in the store's timezone, navigated with previous/next (`/admin?date=YYYY-MM-DD`; no date = today in the store's timezone, not the server's).
- **The timeline is computed** (`buildDayTimeline`, pure and tested): confirmed bookings and time-off blocks as they are, free time left inside working hours ("Livre até…"), and breaks between working ranges ("Intervalo"). Bookings outside working hours still show. Cancelled bookings are hidden.
- **Cancel** marks the booking `cancelled` (with `cancelled_at`) instead of deleting it, after a confirm; the slot becomes free again. Notifying the client comes with phase 5.
- **"Bloquear horário"** reuses the time-off form, opened on the day being viewed and in time-range mode; blocks are listed and removed in Horários.
- **WhatsApp** opens `wa.me` with Brazil's code added to local numbers.

### Clients (phase 2)

- **A client is identified by her phone** (required on every booking, digits only, Brazilian local format). A new phone creates a client; a known phone reuses her. **Her name is the one given in her latest booking**; each booking keeps the name used that day.
- **Own table (`clients`)** instead of deriving clients from bookings, because notes and ratings will attach to the client. Every booking links to a client (`client_id`, `ON DELETE RESTRICT`: a client with history cannot be deleted).
- **Metrics per client:** visits (confirmed bookings already ended), total spent (their snapshot prices), last visit, next confirmed booking, cancellations. Computed in SQL on read, nothing stored.
- **List order (owner's choice): clients with an upcoming booking first, soonest first; then everyone else by most recent activity** (latest booking made, or when the client was created). Search by name or phone on the server; **20 per page with a "Mostrar mais" button** (offset pagination — fine at this scale; infinite scroll was not chosen).
- **"Clientes" is a fifth tab** in the panel's bottom navigation, after Agenda. WhatsApp is a text link, as in the agenda.
- **Later:** owner's notes, ratings (owner → client, client → service), client detail page.

### Panel users (phase 2)

- Listed at the end of the Loja tab ("Quem acessa o painel"), owner first with a "Dona" badge. Every panel user sees the list; **only the owner registers and removes** (403 otherwise).
- **Register = name, email (stored lowercase, unique: 409 when taken) and a password of at least 8 characters**, which the owner passes on; the new user is an `admin` and logs in right away. There is no invitation flow and, for now, no password change or reset.
- **The owner cannot be removed** (400). Removing an admin ends her access at her next request, because the API guard re-checks the user in the database.

### My account (phase 2)

- Every panel user edits **her own name** and **changes her own password** in "Minha conta" (Loja tab): current password required (400 when wrong), new one with at least 8 characters, typed twice.
- **Changing the password signs out every other device:** `users.session_version` is stored in the sealed session (server-only part) and checked by the API guard; a password change bumps it and gives the current device a fresh session. The session cookie carries only id, name, email and role — never the password hash.
- **No "forgot my password" flow (owner's decision):** an admin who forgets asks the owner, who sets a new one with **"Redefinir senha"** next to the admin in "Quem acessa o painel"; the admin's open sessions end. The owner's own password is only changed in "Minha conta".

### Codebase untangling (2026-11-17)

A whole-project pass for duplication, hidden coupling and code outside the conventions, with no behaviour change apart from where the timezone travels (checked with an API status matrix and screenshots of every screen before and after):

- **The store's timezone is public store info** (`/api/store`, `useStoreTimezone()`); the clients and schedule responses no longer carry it, and the fallback lives once in `DEFAULT_TIMEZONE`.
- **One module owns the settings row** (`readSettings` / `writeSettings`); `/api/store` lists its public fields one by one so new columns can't leak.
- **Server utils reach the database through `useDb()`**; tests point it at a temporary database.
- **The panel user has one type** (`User` from `#auth-utils`) and one accessor (`currentPanelUser`); the client asks `usePanelUser().isOwner`.
- **Shared rules:** image types and size limit (`shared/utils/images.ts`), user fields (`nameField`, `emailField`, `loginSchema`), text helpers (`initials`, `plural`), zod → field messages (`fieldMessages`).
- **The time-off form saves itself** (used by Horários and the agenda's "Bloquear horário").
- **API-shaped props are typed from Nitro's generated routes** (`ApiGet`), replacing hand-copied types.
- **UI pieces:** `PanelCard`, `PanelHeader` with a bottom slot, Button `size="inline"` / `variant="quiet"` for text actions — which are now 44px tall (were 36px), per the touch-target rule.
- Removed: the unused `card` component, `GET /api/admin/me` (no caller), unneeded exports, and comments that only restated the code. Deleting an upload now ignores only "file already gone" and logs anything else, without failing a change already saved.

### Migrations before launch

- **Until the first production deploy there is a single migration, `0000_init`, regenerated from the schema** (delete `server/db/migrations` and run `pnpm exec drizzle-kit generate --name init`). There is no real data to migrate, so correction migrations are noise. This supersedes the earlier `0001_user_roles`, `0002_clients` and `0003_session_version`; the notes above about hand-edited migrations describe that history.
- Local databases are realigned instead of recreated: compare their structure with a fresh database built from `0000_init`, then record that migration as applied.
- **From the first deploy on, every schema change is a new migration** (generated, reviewed, never rewritten).

### Conventions (architecture skill)

- **Confirmations use one async dialog** (`useConfirmDialog` + `ConfirmDialog`, mounted once in `app.vue`, built on the shadcn AlertDialog). The caller passes title, description, labels ("Remover" / "Removendo…") and the action; the action runs from the dialog, the confirm button shows the pending label with a spinner, the dialog cannot be dismissed while it runs, closes only on success and shows the error otherwise. It resolves to true when the action ran. The alert-dialog was added declining the CLI's offer to overwrite our edited Button.

- Project conventions live in the project skill `.claude/skills/architecture/SKILL.md`, loaded before any code change.
- **English everywhere except user-facing text** (pt-BR). This includes routes: panel pages are `/admin/services`, `/admin/hours`, `/admin/store`.
- **No comments in `.vue` files**; `.ts` comments only for the why.
- Clean code rules (naming, small units, early returns, no magic values, no dead or speculative code).
- **Theme defaults to the device setting (`system`)**, falling back to light when the browser does not tell; a choice made with either control is remembered in the browser (`color-mode` in localStorage).
- **Native controls follow the theme** through `color-scheme` (light/dark) in `brand.css`; without it, date/time picker icons stayed dark in dark mode. The page declares `<html lang="pt-BR">`. Native time inputs show 12h or 24h according to the device's language, not the page's.
- **Theme: light, dark and system** with `@nuxtjs/color-mode` (`.dark` class); dark tokens in `brand.css`; two controls: `ThemeToggle` (Claro / Escuro / Sistema) in the panel's Loja tab, and `ThemeSwitch` (a single 44px icon button, light ↔ dark) fixed at the top-right corner of the login page. Both render client-only, because the server cannot know the stored preference.

### Agent skills

- Installed **per project** in `.claude/skills/` (copied, versioned in the repo, pinned by commit in `skills-lock.json`): `nuxt` and `nitro` (onmax/nuxt-skills), `shadcn-vue` (official, unovue/shadcn-vue), `vitest` (antfu/skills). Reviewed before use: documentation only, no scripts.
- Not installed: Tailwind (generic or low-reputation options; shadcn-vue covers usage), Drizzle (the popular ones follow other projects' Postgres conventions), nuxt-auth-utils (none exists). WhatsApp: search again in phase 5.
- **The `nuxt` and `nitro` skills target Nuxt 5 / Nitro v3; this project runs Nuxt 4 (latest stable, 4.6).** Nuxt-5-only advice does not apply until we upgrade: importing server utils from `nuxt/server`, h3 v2 / Web `Request`-`Response` handlers, Vite 8, typed `$fetch` from generated routes. Directory layout, aliases, auto-imports and data fetching are the same.
- Update with `npx skills update -p`; restore with `npx skills install`. Vendored files are excluded from Prettier.

### Brand (first customer)

- **Logo: option C, script "Aline Prata" + "NAILS DESIGNER"** in tracked caps. Pink variants exist because the accent color is configurable.
- Mockups of every screen and the logo: https://claude.ai/artifact/88FBqL1KLNjo9ijxbYFggv
