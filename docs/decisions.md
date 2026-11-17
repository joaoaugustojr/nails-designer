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
- **Domain:** a temporary subdomain of a domain we already own, until the customer has her own. Cloudflare proxied; it must be a first-level subdomain so the universal certificate covers it. The actual hostname lives in the server config, not in this repo. _Superseded on 2026-11-17: see "Own domain" below._
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

### Availability rules (2026-11-17)

`availableStartMinutes` in `server/utils/availability.ts`, a pure function with tests:

- Start times step by `slot_step_minutes` (30) from the start of each working range; the whole service must end by the range's end, so it never crosses a break.
- The gap between appointments is kept free on **both sides of a booking**; time off needs no gap.
- Minimum notice counts from now, so it can push the first slot into the next day.
- The agenda is open from today through today + `max_days_ahead` (inclusive), "today" in the store's timezone.
- Every comparison is in UTC instants, so bookings crossing midnight and daylight-saving changes are handled.

### No double booking (2026-11-17)

- **Atomic:** the booking is saved in a write transaction (`BEGIN IMMEDIATE`): SQLite takes the write lock before reading, so the slot check and the insert run alone; a second client asking for the same time waits, re-checks, and gets "horário indisponível".
- **Last guard in the database:** a trigger aborts any insert (or un-cancel) of a confirmed booking that overlaps another confirmed one, whatever code path tries it.
- **Idempotent:** the form sends an idempotency key generated when it opens (`bookings.idempotency_key`, unique). A double tap or a retry after a lost response returns the booking already made instead of creating a second one or reporting the slot as taken.

### Client catalog (2026-11-17)

- **`GET /api/catalog`** (public) returns the store profile (name, logo, cover, about, address, WhatsApp, Instagram — listed field by field) and the active services in panel order, with all photos and "what's included" split into lines.
- **Header:** cover, logo, name, and the "Sobre" text as the subtitle (the panel describes it as "the short text at the top of the site"). Address, Instagram and WhatsApp chips appear only when filled; the address opens Google Maps.
- **The client's theme:** a `ThemeSwitch` on the cover, as decided for the Loja tab ("each client picks their own theme").
- **"Saiba mais" is a bottom `Sheet`** sized to its content, up to 90% of the screen. Photos swipe (CSS scroll snap) with dots and thumbnails; a service without photos shows no gallery.
- **"Agendar" goes to `/book/<serviceId>`**, the day and time picker (next step).
- Chips (32px) and the card's "Agendar" (36px) keep the mockup size; an invisible extension makes their touch area 44px.
- `PanelCard` became `SurfaceCard`, since the site uses the same card surface. Lucide no longer ships brand icons, so the Instagram icon is a small local SVG. The check marks use a `--success` colour token (light and dark).

### Theme switch without animation (2026-11-17)

- Switching the theme is instant: `colorMode.disableTransition` turns every CSS transition off for the frame of the switch, so colours no longer fade (buttons use `transition-all`). Applies to both theme controls, in the panel and on the site.
- Buttons no longer shift 1px down when pressed (shadcn's `active:translate-y-px`, removed from the base button): with `transition-all` it read as a sliding animation on the theme switch. (2026-11-17)
- Panel "Sair" is a header action (`size="md"`, primary pill), like "+ Novo". The client cancellation deadline goes up to 7 days (2 to 7 days added). (2026-11-17)

### Typography (2026-11-17)

- Nunito for all text (rounded, friendly; fits the beauty trade), replacing Manrope. A Fraunces + Figtree pairing was tried and rejected. Parisienne was loaded but unused and is gone.
- Small selects (`size="sm"`, 34px) keep their look but get an invisible extension to a 44px touch area, like the chips.

### Day and time picker (2026-11-17)

- **`GET /api/services/:id/availability?from=&days=`** (public; 404 for an inactive or unknown service) returns the service summary, the open agenda (`firstDate` = today, `lastDate` = today + `max_days_ahead`) and, for each day, its free start minutes. One request per page of days: changing day does not hit the server.
- **Six days per page**, as in the mockup, with arrows that stop at today and at the last open day. A day with no free time is dashed and disabled. On load (and on each new page) the first day with free time is selected; changing day clears the chosen time.
- **The choice travels in the URL** (`/book/<id>?date=…&start=…` and step 2 at `/book/<id>/details?date=…&start=…`), so going back keeps it. The slot is checked again on save.
- `todayIn` and `weekdayOf` moved to `shared/utils/time.ts`; the agenda and availability share them.
- **Error page in Portuguese** (`app/error.vue`): a stale link shows "Página não encontrada" and a button back to the services, instead of Nuxt's English default.

### Booking form and no double booking, as built (2026-11-17)

Supersedes the "Atomic" point of "No double booking" above: `BEGIN IMMEDIATE` does not work here. SQLite runs inside the Node process and blocks the thread while it waits for a lock, so a second open transaction froze the first one until both failed with "database is locked" after 5 s (a test with two simultaneous bookings caught it).

- **One booking at a time:** `createBooking` runs in an in-process queue: check the idempotency key, re-check the slot with the same rule as the picker, then write client + booking in one `db.batch`, which begins and commits in a single call without yielding to other requests. A second client asking for the same time waits in the queue, sees the slot taken and gets 409 ("Esse horário acabou de ser reservado"). This holds for one app process, which is how the app is deployed.
- **Database guards stay:** the overlap trigger (hand-written SQL appended to the end of `0000_init`; regenerating `0000_init` must keep it) and the unique idempotency key.
- **Idempotent:** the form creates its key on the first submit and reuses it on retries; a repeated submit returns the same booking.
- **No open transactions anywhere:** saving a day's working hours now uses one `db.batch` too, for the same reason.
- **Abuse:** `POST /api/bookings` allows 10 requests per IP per 10 minutes and `/api/auth/login` 10 per 15 minutes (in memory, per process; the IP comes from `X-Forwarded-For`, set by the proxy). A hidden "website" field must stay empty.
- **Form:** name, mobile (Brazilian, 11 digits with the 9; formatted on leaving the field), optional email, reminders opt-in (on by default, as in the mockup). If the time was taken meanwhile, the page says so and links back to the picker on the same day. Success replaces the page with `/bookings/<token>/confirmed` (the thank-you page, next step), so going back does not show the form again.

### Thank-you page (2026-11-17)

- **`/bookings/<token>/confirmed`**, reached after booking. `GET /api/bookings/:token` (public: the 32-character random token is the secret) returns the client's first name, service, date and times in the store's timezone, and the public store profile (now also the thank-you message and timezone). Unknown or malformed tokens get 404.
- **What it shows:** "Obrigada, <first name>!", the owner's thank-you message signed with the logo and store name (hidden when empty), service / when / where, "Salvar na agenda", "Como chegar" (Google Maps directions; hidden without an address) and "Seguir no Instagram" (hidden without a handle).
- **"Salvar na agenda"** downloads `GET /api/bookings/:token/calendar` (`agendamento.ics`, RFC 5545: UTC times, escaped text, folded lines). Its description carries the "my booking" link.
- **"Ver meu agendamento"** links to `/bookings/<token>` (the page sent in the WhatsApp confirmation), so the client can keep it before notifications exist. Not in the mockup; asked for by the owner.
- **No "the confirmation was sent to your WhatsApp" line yet:** nothing is sent until phase 5, so the page only says the time is reserved. Add the line back with the notifications.

### "My booking" page (2026-11-17)

- **`/bookings/<token>`** is the link the client keeps (the WhatsApp confirmation will carry it; the thank-you page and the calendar event already do). It shows the service, the full date ("Quarta, 18 de novembro · 09:00 às 10:00") and the address.
- **Cancellation follows the Horários rule, decided on the server:** `GET /api/bookings/:token` says whether the store offers it and whether this booking can still be cancelled (confirmed, and now ≤ start − deadline); `POST /api/bookings/:token/cancel` applies the same check (403 otherwise; cancelling twice is fine) and marks the booking `cancelled`, freeing the slot. Rate limited like booking.
- **Four states:** can cancel (note "até 2h antes", WhatsApp and "Cancelar agendamento" with a confirm); owner only (setting off: "Precisa remarcar ou desmarcar? Entre em contato pelo WhatsApp, que resolvemos para você."); the can-cancel note ends "Depois disso, entre em contato pelo WhatsApp."; deadline passed (setting on: "O prazo para cancelar por aqui já passou. Para remarcar ou desmarcar, entre em contato pelo WhatsApp."); cancelled ("Agendamento cancelado" and "Agendar outro horário"). A booking that already started greets with "Esperamos que tenha gostado" and offers a new booking.
- **White label:** the WhatsApp button reads "Falar comigo no WhatsApp" (the owner speaking, as in the thank-you message; asked for by the owner instead of "Falar com <store name>"), and the header shows the store name only. The WhatsApp button opens a message with the service, day and time, and is hidden when the store has no WhatsApp.
- `ConfirmDialog` takes an optional `dismissLabel`: here it is "Manter", so the client never sees "Cancelar" next to "Cancelar agendamento".
- Warning colours (`--warning`, `--warning-foreground`, light and dark) for the cancellation note.

### Brand on every page (2026-11-17)

- **Tab title:** a title template adds the store name to every page ("Escolha o horário · Aline Prata", "Agenda · Aline Prata"); the catalog shows the name alone. The login tab reads "Painel · <name>".
- **Tab icon:** the store's logo, falling back to `/favicon.ico`.
- **Link preview** (WhatsApp, Instagram, etc.): every page answers with `og:title` / `og:site_name` = store name, `og:description` = "Sobre", `og:image` = the cover (or the logo) as an absolute URL built from the proxy's forwarded host and protocol. Link previews can only be checked for real after deploy. `/api/store` now also returns the cover and "Sobre" (both already public in the catalog).
- **Mobile browser bar colour** (`theme-color`) follows the page background of the theme in use, read from the CSS after each switch.

### Client site on wider screens (2026-11-17)

The mockups are portrait phones; the site must also work sideways, on tablets and desktops:

- **Full-bleed bars, centred content:** the cover, the step header and the step footer span the whole width; their content sits in a centred column (catalog up to `max-w-5xl`, booking steps and booking pages up to `max-w-2xl`). No dark bands on the sides.
- **More per row when there is room:** services in 1 / 2 / 3 columns (phone / ≥640px / ≥1024px), free times in 4 / 6 columns, cover 140px tall on phones and 200px from 640px.
- **Short screens** (height ≤ 500px, a phone held sideways; `[@media(max-height:500px)]:`, since brand.css is not processed by Tailwind): the step footer stops being sticky, and the "Saiba mais" sheet scrolls photos and text together, so the button and the text stay reachable.
- Portrait at 390×844 is unchanged.

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

### Store covers (2026-11-17)

- The store has up to 4 cover photos (`settings.cover_paths`, a JSON list; `STORE_MAX_COVERS`). With more than one, the site hero cross-fades between them every 4 s (1 s fade; an instant swap under reduced motion); with one there is no animation. The hero is taller (220px on phones, 320px from `sm`), image centred. The first cover is the link preview image.
- Endpoints: `POST /api/admin/store/logo` (replace), `POST /api/admin/store/covers` (add), `DELETE /api/admin/store/covers/:index` (asks first in the panel).
- Shipped as migration `0002_store_covers` (copies the old single cover into the list) instead of regenerating `0000_init`, because local databases apply it at boot without realignment. Fold it into `0000_init` before the first deploy.
- Service photos on the site catalog card are square (96px).

### Cancel from the client card (2026-11-17)

- A client card with an upcoming booking has "Cancelar" next to "Próximo", which cancels that next booking with the same confirmation as the agenda (`useCancelBooking`). The clients list returns `nextBookingId` for it.

### No client email (2026-11-17)

- The booking form asks only for name and mobile (WhatsApp); the optional email field and `bookings.client_email` are gone (migration `0003_drop_client_email`). Nothing used it, every message goes to WhatsApp, and collecting unused personal data is a risk with no benefit (LGPD data minimisation). This supersedes the email mentions in "Client flow", "Email is optional and secondary" and the booking form notes above, and drops the email notification channel from the plan.

### Reminder one day before (2026-11-17)

- Reminders are 1 day before, day of, 1 h before and 30 min before, all under the single "Quero receber lembretes" opt-in (the client does not pick each one). This extends the list in "WhatsApp Cloud API" above; the sent-at column for the new reminder is added with the reminder task (phase 4 since 2026-11-17).

### Notifications before deploy (2026-11-17)

- Phase order swapped by the owner: notifications (now phase 4) ship before deploy (now phase 5), so the site never goes live promising reminders and WhatsApp confirmations it does not send.

### Image processing on upload (2026-11-17)

- Settles the pending decision in "Services and uploads": every upload (service photos, logo, covers) is re-encoded with `sharp` before it is written (`prepareImage` in `server/utils/uploads.ts`, `encodeWebp` in `server/utils/image-encode.ts`). Re-encoding drops all metadata, including the phone's GPS position; the EXIF orientation is applied first so photos stay upright. Images are fitted within 1600 × 1600 px (never enlarged) and stored as WebP at quality 80, so a 4–8 MB phone photo becomes a few hundred KB. Transparency in PNG logos is kept.
- The accepted inputs are unchanged (JPEG, PNG, WebP by signature, up to 8 MB). A file with a valid signature that sharp cannot decode is rejected with 415. A request's images are all re-encoded before any is written.
- Files uploaded before this change keep their original format and are still served; there were no real customer photos yet.
- `sharp` 0.35 runs on the dev machine (glibc 2.31); its linux-arm64 binary is checked with the Dockerfile.

### Notification module (2026-11-17)

- Every client message goes through `notify()` in `server/utils/notifications.ts`. A message is shaped like a WhatsApp template message: recipient phone, template name and named variables. The text itself lives in the approved Meta template, not in the app.
- For now the only channel is `log` (prints the message to the server log). Picking a channel and handling send errors come with the WhatsApp channel; callers already call `notify()` without awaiting it, so a failed message never undoes or delays a booking.
- The booking confirmation (`booking_confirmation`) is sent for every new booking, whatever the reminders opt-in, and not again when the same form is resubmitted. Variables: client first name, store name, service, when ("Quarta, 18 de novembro · 09:00 às 10:00") and the "my booking" link.
- Links in messages use `NUXT_SITE_URL` (default `http://localhost:3000`): reminders are sent by a scheduled task with no request to read the host from.

### Owner cancellation message (2026-11-17)

- When the owner cancels a booking (agenda or clients list), the confirm dialog has an "Avisar a cliente no WhatsApp" switch, on by default. If on, the client gets the `booking_cancelled` message (same variables as the confirmation; the link opens the "my booking" page, which shows the cancellation and offers a new booking). If off, nothing is sent. This settles "Notifying the client comes with phase 5" in the agenda notes.
- `useConfirmDialog` takes an optional `toggle` (`label`, `isOn`) and passes its state to the action.
- A client who cancels by herself gets no message: she did it.

### Reminder task (2026-11-17)

- The Nitro scheduled task `reminders:send` runs every minute (`sendDueReminders` in `server/utils/reminders.ts`), so a reminder goes out at most 1 minute late (5 minutes was too coarse for the owner; the query is cheap). Only confirmed bookings with the reminders opt-in get them.
- When each is due: **1 day before** = 24 h before the start; **day of** = 08:00 store time on the booking day; **1 h** and **30 min** before the start. A reminder due after the start is never sent (a 07:00 booking has no "day of").
- **No bursts:** if several reminders are due at once (for example, the app was down), only the latest goes out and the earlier ones are marked sent with it. **A reminder already due when the booking was made is skipped**: the confirmation covers it (booked at 09:00 for 14:00 the same day → only 1 h and 30 min).
- The sent-at column is written before the message goes out: if the process dies in between, a reminder is lost rather than sent twice.
- **One WhatsApp template for all four** (`booking_reminder`, same variables as the confirmation, the date and time spelled out), so Meta approves one template instead of four.
- New column `reminder_day_before_sent_at` (migration `0004_reminder_day_before`).

### Deploy before WhatsApp (2026-11-17)

- Reverses "Notifications before deploy": the owner launches first and sets up Meta (business portfolio, number, template approval) calmly afterwards, since it takes days. Phase 5 is deploy, phase 6 is WhatsApp.
- The reason for the earlier order still holds, so until WhatsApp is on the booking form must not promise messages: the reminders opt-in and the WhatsApp line are hidden (planned in phase 5). The log channel keeps running in production meanwhile.
- The switch is `NUXT_PUBLIC_IS_WHATSAPP_ENABLED` (runtime config, off by default), not a code change: being white label, another store may never set up WhatsApp. While off, the booking form hides the reminders opt-in and "A confirmação e os lembretes chegam no seu WhatsApp.", the footer reads "Imprevisto? Depois de confirmar, você vê como desmarcar." (the thank-you page links to "my booking"), the owner's cancel dialog has no "Avisar a cliente" switch, and the server saves `reminders_opt_in` as false whatever the request says, so turning WhatsApp on never sends reminders nobody was promised. Bookings made while off get no reminders.

### Migrations folded for the first deploy (2026-11-17)

- `0001_booking_overlap_guard` to `0004_reminder_day_before` are folded into a regenerated `0000_init`; the overlap triggers are appended by hand at its end. Local databases were realigned, not recreated: their structure (columns, foreign keys, indexes, triggers, CHECK constraints) matches a fresh database built from `0000_init` except for column order, so `__drizzle_migrations` now holds only the new `0000_init` row.
- This is the last regeneration: from the first deploy on, every schema change is a new migration.

### Docker image (2026-11-17)

- Two stages on `node:24-slim` (Debian, glibc: the prebuilt `sharp` and libsql binaries need it, so no Alpine). The build stage runs `pnpm fetch` on the lockfile alone, so dependencies are a cached layer, then installs offline and runs `nuxt build`. The final image carries only `.output` (Nitro traces the server's own `node_modules` into it) and `server/db/migrations`, about 270 MB, and runs as the `node` user.
- Native packages are traced for the platform that builds, so the production image is built natively on GitHub's arm64 runner, never cross-built from x86.
- **libsql's native package is copied by hand** into `.output/server/node_modules/@libsql/`: libsql loads it with ``require(`@libsql/${target}`)``, which Nitro's trace cannot follow. On x86 the trace happened to include it; the first arm64 deploy crashed with `Cannot find module '@libsql/linux-arm64-gnu'`. The copy takes whichever `@libsql/linux-*` pnpm installed for the build platform. Checked by booting the CI arm64 image with the package added, under emulation (a full emulated arm64 build is not possible: esbuild crashes under QEMU).
- `/data` is the volume: `NUXT_DB_URL=file:/data/nails.db` and `NUXT_UPLOADS_DIR=/data/uploads` are set in the image. The rest (`NUXT_APP_SECRET`, `NUXT_SITE_URL`, store name, first admin) comes from the server's `.env`.
- Checked locally (x86): boot runs the migrations and creates the first admin, pages and API answer, a logo upload is re-encoded to WebP by `sharp`, and the reminder task is scheduled in the build. The session cookie is `Secure` in production, so logging in over plain HTTP (e.g. `localhost` against the image) does not keep the session; behind Cloudflare it is HTTPS.

### Compose and deploy script (2026-11-17)

- `deploy/compose.yaml` and `deploy/server-deploy.sh` are copied by hand to `/srv/nails` on the server, next to `.env` (they change rarely; the image changes on every push).
- **Versions are commits.** CI tags each image with the full commit SHA. `server-deploy.sh <sha>` pulls `ghcr.io/joaoaugustojr/nails-designer:<sha>`, tags it `nails:current` (the compose file runs that tag, with `pull_policy: never`, so `docker compose logs/ps/restart` work without arguments) and runs `docker compose up -d --wait`. It appends the time and SHA to `deploys.log`; **rollback** is the same call with an older SHA from that log.
- The deploy key's forced command in `authorized_keys` runs only this script, which accepts nothing but a 40-character hex SHA (sent by CI as the SSH command).
- **Healthcheck** (`node -e fetch(…/api/store)`; the image has no curl): `--wait` returns only when the new container is healthy, so a version that fails to boot (a bad migration, a missing env var) turns the deploy red in GitHub. While the single container is replaced, Caddy holds requests for up to 10 s (`lb_try_duration`) instead of answering 502.
- No published port: the `nails` network is named, and Caddy joins it and proxies to `nails-web:3000` (a network alias, so it never clashes with other projects' `web` services).
- Logs are capped at 3 × 10 MB. Images of this repository older than 7 days are pruned after each deploy (matched by the `org.opencontainers.image.source` label set in the Dockerfile, so other projects' images on the server are never touched).

### Own domain (2026-11-17)

- The site lives at **alinepratanails.site**, the store's own domain, instead of a temporary subdomain (owner's change of mind). The domain is added to Cloudflare as its own zone (free plan, nameservers changed at the registrar), both records proxied: `alinepratanails.site` points to the server and `www` redirects to it. The universal certificate covers both.
- `NUXT_SITE_URL=https://alinepratanails.site` on the server.

### CI build and deploy (2026-11-17)

- `.github/workflows/pipeline.yml`: pull requests run the checks only. A push to `main` runs the checks, then **build** on `ubuntu-24.04-arm` (`docker build` + `docker push` of `ghcr.io/joaoaugustojr/nails-designer:<sha>`, logged in with the workflow's `GITHUB_TOKEN`, `packages: write` on that job only), then **deploy** (`ssh deploy@$DEPLOY_HOST <sha>`, which the forced command turns into `server-deploy.sh <sha>`).
- Plain `docker build`, no buildx layer cache: GitHub runners are free for a public repository and a full build takes a few minutes.
- Pushes to `main` queue instead of cancelling, so deploys never overlap.
- Repository secrets: `DEPLOY_SSH_KEY` (private half of the dedicated key), `DEPLOY_HOST` (server IP) and `DEPLOY_KNOWN_HOSTS` (the server's host keys, so the runner refuses an impostor instead of trusting on first use).
- The GHCR package must be **public** (the repository is public; the server pulls without logging in).

### Exact map location (2026-11-17)

- Searching Google Maps for the address text can land on the wrong place (the same street exists in other cities; new addresses are not always known). Loja has an optional **"Localização no mapa"** field: the owner pastes the coordinates Google Maps shows when she long-presses the studio (`-18.147734, -47.912953`). They are stored as `settings.map_location` (`"lat,lng"`, no spaces; migration `0001_store_map_location`, the first after launch).
- When set, the address chip on the site and "Como chegar" on the thank-you page open that exact point (`mapUrl` / `directionsUrl` in `shared/utils/maps.ts`); otherwise they search the address text as before. The address text is still what clients read; the coordinates never appear on the page.

### DNS only, no Cloudflare proxy (2026-11-17)

- Measured from Brazil: the app answers in ~10 ms inside the server, ~0.21 s per request going straight to the server (stable; it is the Brazil–Germany round trip), but 0.3–2.8 s through Cloudflare's free proxy, with jumps of ~1 s and ~3 s that match lost packets on new connections between Cloudflare and the server. The other site on the same server shows the same pattern.
- So both `alinepratanails.site` records are **DNS only** (grey cloud). Caddy serves its own Let's Encrypt certificate and renews it; the rate limit still sees the client's IP (Caddy only trusts `CF-Connecting-IP` from Cloudflare's ranges). Lost: Cloudflare's edge cache (assets are `immutable`, so only a first visit pays) and its DDoS shield; the server IP was already public through another DNS-only host.
- **HTTP/3 is off in Caddy** (`protocols h1 h2`, in the Caddyfile kept with the server's other projects): Caddy advertised `h3` while only TCP 443 is published, so browsers going direct failed with `ERR_QUIC_PROTOCOL_ERROR`. Proxied hosts are unaffected (Cloudflare talks HTTP/3 to browsers).

### JPEG link-preview image (2026-11-17)

- WhatsApp showed the link preview without a picture: `og:image` pointed at the WebP cover, and link-preview crawlers skip WebP. `og:image` now points at `/preview/<upload name>.jpg`, which converts that upload to a JPEG of at most 1200 px with `sharp` on each request (crawlers ask rarely; `immutable` cache, since upload names are never reused). The upload name is checked with the same pattern as `/uploads`, so the route cannot read any other file.
