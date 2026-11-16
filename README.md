# nails-designer

White-label online booking for nail designers: clients pick a service and a free time slot from their phone; the owner manages services, hours, bookings and branding in a password-protected panel.

- Plan: [docs/plan.md](docs/plan.md)
- Decisions: [docs/decisions.md](docs/decisions.md)

## Development

Requires Node 24 and pnpm (pinned through `packageManager`, enable with `corepack enable pnpm`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test
pnpm lint
pnpm typecheck
```
