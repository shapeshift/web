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
- Run `pnpm run lint --fix` and `pnpm run type-check` after code changes.
- Use `.github/PULL_REQUEST_TEMPLATE.md` for PR bodies.

## Routing

- New second-class EVM chain work: [.claude/contracts/second-class-evm-chain.md](.claude/contracts/second-class-evm-chain.md)
- New swapper integration work: [.claude/contracts/swapper-integration.md](.claude/contracts/swapper-integration.md)
- Test scenarios (`/test-agent`, @neomaking flow): [.claude/test-scenarios/README.md](.claude/test-scenarios/README.md)
- QA automation (`qabot`, fixture-based flow): [.claude/skills/qabot/SKILL.md](.claude/skills/qabot/SKILL.md)
- Translation workflow: [.claude/skills/translate/SKILL.md](.claude/skills/translate/SKILL.md)

## Tooling Notes

- Claude compatibility is provided by `CLAUDE.md` importing this file.
- Codex compatibility is pinned via `.codex/config.toml`.
- Full legacy `CLAUDE.md` policy content was moved to `.claude/programming-guidelines.md` to avoid loss while keeping top-level entrypoints compact.
- Repo-local skills live in `.claude/skills`.
- Additional user-level skills/config may exist in `~/.agents`, `~/.codex/skills`, and `~/.openclaw`.
