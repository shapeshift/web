# Agent Instructions (Source of Truth)

This file is the canonical instruction entrypoint for local agent tooling in this repo.

## Read Order

1. This file (high-signal defaults and routing)
2. [.claude/guidelines/beads-rules.md](.claude/guidelines/beads-rules.md)
3. [.claude/programming-guidelines.md](.claude/programming-guidelines.md)
4. [.claude/contracts](.claude/contracts)
5. [.claude/skills](.claude/skills)
6. [.claude/test-scenarios/README.md](.claude/test-scenarios/README.md)
7. [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)

## Must-Follow Defaults

- Use `develop` as the base branch.
- Use `pnpm`.
- Keep changes surgical and focused.
- For complex multi-step tasks, prefer `bd` tracking before implementation.
- Prefer `origin` for new feature/fix branch pushes when permissions allow.
- If a PR branch is already on `fork`, keep using that existing `fork` branch.
- Run `pnpm run lint --fix` and `pnpm run type-check` after code changes.
- Use `.github/PULL_REQUEST_TEMPLATE.md` for PR bodies.

## Routing

- New second-class EVM chain work: [.claude/contracts/second-class-evm-chain.md](.claude/contracts/second-class-evm-chain.md)
- New swapper integration work: [.claude/contracts/swapper-integration.md](.claude/contracts/swapper-integration.md)
- Test scenarios (`/test-agent`, @neomaking flow): [.claude/test-scenarios/README.md](.claude/test-scenarios/README.md)
- QA automation (`qabot`, fixture-based flow): [.claude/skills/qabot/SKILL.md](.claude/skills/qabot/SKILL.md)
- Translation workflow: [.claude/skills/translate/SKILL.md](.claude/skills/translate/SKILL.md)

## Cursor Cloud specific instructions

- Cloud Agent images put Node 22.14 at `/exec-daemon/node`, ahead of `/usr/local/bin`. Vitest loads `module-alias`, which needs `module.registerHooks` from Node 22.15+. Install and start switch that binary to the official Node 22.23.3 tarball when the active `node` is older. `.nvmrc` is `22`. `packageManager` pins `pnpm@10.30.3` (`corepack prepare pnpm@10.30.3 --activate`).
- OpenJDK is already on the image. `pnpm run build:packages` must finish before the web app or package tests. It generates the gitignored Unchained clients in `packages/unchained-client/src/generated` from public GitHub OpenAPI specs, then compiles workspace packages.
- Start the UI with `pnpm run dev:web:localhost` (Vite on port 3000, host `0.0.0.0`). `pnpm run dev` and `dev:web` expect the optional Portless proxy (`http://<branch>.web.localhost:1355`) and are not required here. `pnpm run dev:packages` is the package watch (`tsc --build --watch`).
- Committed `.env.development` is enough to open the trade screen, request a quote, and open Markets. No extra secrets are required for that flow.

## Tooling Notes

- Claude compatibility is provided by `CLAUDE.md` importing this file.
- Codex compatibility is pinned via `.codex/config.toml`.
- Full legacy `CLAUDE.md` policy content was moved to `.claude/programming-guidelines.md` to avoid loss while keeping top-level entrypoints compact.
- Repo-local skills live in `.claude/skills`.
- Additional user-level skills/config may exist in `~/.agents`, `~/.codex/skills`, and `~/.openclaw`.
