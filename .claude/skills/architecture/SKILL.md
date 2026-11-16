---
name: architecture
description: Project conventions for nails-designer — language, comments, clean code, UI fidelity to the mockups, theming (light/dark/system), app and server structure, database and auth rules. Use before writing, editing, reviewing or planning any code, page, component, API route, migration or doc in this repository.
---

# nails-designer architecture

Rules every change must follow. Background and history: `docs/decisions.md`. Progress: `docs/plan.md`.

## 1. Language

- **Everything is English** — identifiers, file and folder names, **routes and URLs** (`/admin/services`, not `/admin/servicos`), API paths, DB tables and columns, comments, docs, commit messages, test names.
- **Only text shown to the user is Portuguese (pt-BR)** — labels, buttons, headings, messages, `aria-label`s, page titles, emails/WhatsApp templates.
- Server error messages returned by the API are English (`"Invalid email or password"`); the UI maps them to Portuguese.

## 2. Comments

- **No comments in `.vue` files** — neither `<!-- -->` in templates nor `//` / `/* */` in `<script>`. Make the code say it: clear names, small components, extracted functions.
- In `.ts` files, comment only the **why** that the code cannot say (a constraint, a workaround, a security reason), one or two lines. Never narrate what the code does.

## 3. Clean code

- **Names say intent.** Booleans read as questions (`isOpen`, `canCancel`); functions are verbs (`createBooking`); no abbreviations except well-known ones (`id`, `url`, `db`).
- **Small and single-purpose.** A component renders one thing; a function does one thing. Extract when a block needs a name, not before.
- **Early returns** over nested `if`s. No `else` after `return`.
- **No magic values.** Durations, limits and sizes get a named constant next to where they are used (or a setting, if the owner should change it).
- **No dead code, no speculative code.** No unused props, params, exports, components or "for later" abstractions. Delete instead of commenting out.
- **Reuse before writing.** Check `app/components`, `app/composables`, `server/utils` and the shadcn components first.
- **Logic out of templates.** Anything beyond a simple expression goes into a `computed` or a function.
- **Types over `any`.** Validate at boundaries with zod and let types flow from the schema.
- Lint, format, typecheck and tests must pass (`pnpm lint && pnpm typecheck && pnpm test`).

## 4. UI

- **The approved mockups are the source of truth** (link in `docs/plan.md`). A screen is done only after comparing it with its mockup at 390×844 in a headless browser (agent-browser).
- **shadcn-vue** components in `app/components/ui` are our code: edit them to match the mockup, never re-add with `--overwrite`. Add new ones with `pnpm dlx shadcn-vue@latest add <name>`.
- **Styling:** Tailwind utilities with **semantic tokens only** (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`…). No raw hex colors in components, no `dark:` color overrides.
- **Theme tokens live in `app/assets/css/brand.css`** (light from the mockups, dark counterpart). Never edit `app/assets/css/main.css` — the shadcn CLI owns it.
- **Theme: light, dark and system** via `@nuxtjs/color-mode` (`useColorMode()`; `.dark` class on `<html>`). Every screen must work in both modes. Two controls: `ThemeSwitch` (single icon button, light ↔ dark; top-right corner of pages without the panel, e.g. login) and `ThemeToggle` (Claro / Escuro / Sistema, in the panel's Loja tab). Both render in `<ClientOnly>` — the server cannot know the stored preference.
- **White label:** no store-specific text, image or color hardcoded — read it from the store settings (`/api/store`).
- **Mobile first** (most clients use a phone); touch targets ≥ 44px; real `<button>`/`<a>`/`<label>`; icon-only buttons get an `aria-label`.
- Icons from `@lucide/vue`, imported explicitly.
- **Buttons:** header actions ("+ Novo", "+ Bloquear horário") are `<Button size="md">` (primary pill, 40px); full-width form actions use the default size (52px). Everything follows the store's accent; no fixed-color buttons.
- **Async submits use `SubmitButton`**: while pending it is disabled and shows a spinner with a pending label ("Salvando…", "Entrando…"), then returns to its label. No success toasts or "saved" messages; only errors are shown, in red (`role="alert"`).
- Dropdowns use the shadcn `Select` (via `OptionSelect` for numeric options), never the native `<select>`.
- Native inputs (`date`, `time`) follow the theme through `color-scheme` in `brand.css`; keep it when adding themes.
- After `shadcn-vue add`, restart the dev server: new components are registered only at startup.

## 5. Structure

- `app/` — Vue app (Nuxt 4 `srcDir`): `pages/`, `layouts/` (`panel` for `/admin/**`), `components/` (`ui/` = shadcn, `panel/` = panel-only), `composables/`, `middleware/`.
- `server/api/` — HTTP handlers, thin: validate input with zod (`readValidatedBody`, `getValidatedQuery`), call a `server/utils` function, return data.
- `server/utils/` — auto-imported server helpers (`useDb`, `requirePanelUser`, domain logic).
- `server/db/` — `schema.ts`, `client.ts`, `migrations/`. Explicit imports so plain Vitest can load them.
- `shared/` — code and types used by both app and server (e.g. zod schemas shared by form and API).
- Tests sit next to the code as `*.test.ts`.

## 6. Server, data and auth

- **`/api/admin/**` is guarded on the server** (`server/middleware/panel-auth.ts`); the page middleware only redirects. Owner-only endpoints also check `role === "owner"`.
- Roles: `owner` (one, created at boot) and `admin` (created by the owner).
- **Time:** instants are UTC epoch ms; working hours are weekday + minutes from midnight in `settings.timezone`. Never use the server's local time.
- **Money:** integer cents.
- **Constraints belong in the database** (FK, unique, check) as well as in zod.
- **Migrations:** **before the first production deploy, keep one `0000_init`**: after changing `schema.ts`, delete `server/db/migrations`, run `pnpm exec drizzle-kit generate --name init` and realign local databases (see decisions.md). **After launch**, run `pnpm exec drizzle-kit generate --name <what>` for each change and **read the generated SQL** (drizzle-kit rebuilds SQLite tables and can get it wrong); the server applies migrations at boot.
- Never commit secrets; config comes from `NUXT_*` env vars (see `.env.example`).

## 7. Repository hygiene

- Public repository: no secrets, no personal data, no references to other projects.
- Conventional Commits; propose the message and let the user commit.
- Record every new decision in `docs/decisions.md` (dated, append-only) and tick `docs/plan.md`.
