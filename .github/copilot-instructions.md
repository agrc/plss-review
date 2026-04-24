# Project Guidelines

Use this file for repository-specific behavior that is not obvious from the file tree alone. Prefer linking to existing documentation instead of copying it. See [README.md](../README.md) for setup details and [CONTRIBUTING.md](../CONTRIBUTING.md) for branch and release workflow.

## Build And Test

- Use `pnpm`, not `npm`.
- Install both package roots before running anything:
  - `pnpm install`
  - `pnpm install --dir functions`
- `functions/` is a standalone package with its own dependencies and is not part of the pnpm workspace.
- `pnpm start` is the normal local entry point. It starts Vite, Firebase emulators, emulator seed data, and a watch build for `functions/`.
- Frontend build: `pnpm run build`
- Frontend type check: `pnpm run check`
- Frontend lint: `pnpm run lint`
- Frontend tests for automation: `pnpm run test:ci`
- Avoid `pnpm run test` unless you explicitly want the interactive Vitest UI.
- Functions build: `cd functions && pnpm run build`
- Functions tests: `cd functions && pnpm run test:ci`

## Architecture

- `src/` is the React 19 + Vite frontend.
- `functions/src/` is the Firebase Cloud Functions TypeScript source.
- `scripts/` contains one-off seed and migration scripts.
- App bootstrap, Firebase providers, and auth setup live in [src/main.tsx](../src/main.tsx).
- Route composition and lazy-loaded page boundaries live in [src/Routes.tsx](../src/Routes.tsx).
- Cloud Function entry points and task orchestration live in [functions/src/functions.ts](../functions/src/functions.ts); keep business logic in nearby modules under `functions/src/`.
- Root tests and local development assume Firebase emulators. The default Vitest emulator environment is defined in [vite.config.ts](../vite.config.ts).

## Conventions

- Do not hand-edit generated outputs in `functions/lib/`, `coverage/`, or `dist/`.
- When you change Cloud Functions, edit `functions/src/` and treat `functions/lib/` as generated output.
- PRs should target `dev`, not `main`.
- Commit messages follow Angular-style Conventional Commits. See [CONTRIBUTING.md](../CONTRIBUTING.md).
- Tailwind-related packages are intentionally pinned to Tailwind v3-compatible versions. Check [README.md](../README.md) before changing Tailwind dependencies.
- Check [scripts/package.json](../scripts/package.json) before running any migration or seed command, especially `prod:*` variants.
