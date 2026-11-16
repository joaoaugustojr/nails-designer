# nails-designer

White-label booking app for nail designers (first customer: Aline Prata).

- **Conventions: load the `architecture` skill (`.claude/skills/architecture/SKILL.md`) before any code change.**
- Decisions: `docs/decisions.md`. Append a dated entry for every new decision.
- Plan and progress: `docs/plan.md`. Tick boxes as work lands.
- Repo files are written in English; conversation is in Portuguese.
- Setup steps marked "(you)" in the plan are done by the user, guided one step at a time: say when, give the exact command, wait.
- Public repository: never commit secrets.
- UI must match the approved mockups (link in docs/plan.md); compare at 390×844 before calling a screen done. shadcn components in `app/components/ui` are edited to the mockup, never re-added with `--overwrite`.
- UI: add components with `pnpm dlx shadcn-vue@latest add <name>`. Never edit `app/assets/css/main.css` (CLI-owned); brand styles go in `app/assets/css/brand.css`.
