# hdwallet Workspace Migration — Agent Handoff Context

This document provides full context for an AI agent continuing work on this branch. Read this first, then `HDWALLET_MIGRATION_AUDIT.md` for the detailed audit.

## What this branch does

Moves all 21 `@shapeshiftoss/hdwallet-*` packages from the separate `shapeshift/hdwallet` repo into the web monorepo as yarn workspace packages. The original repo lives at `/Users/gomes/Sites/shapeshiftHdWallet` for reference.

**Branch:** `feat/hdwallet-workspace`
**Worktree:** `/Users/gomes/Sites/shapeshiftWeb--feat-hdwallet-workspace`
**PR:** https://github.com/shapeshift/web/pull/11811 (draft)
**Base:** `develop`

## Current state

Two commits on the branch:
1. `c7d1c38208` — WIP: initial copy of all 24 packages, workspace:^ conversions, build fixes
2. `e66725a66f` — Sandbox, integration tests, dep standardization, debug cleanup, audit doc

All builds pass:
- `yarn type-check` — 0 errors
- `yarn build:packages` — 0 errors
- `yarn hdwallet:build` — 0 errors (~14s)

## The 21 hdwallet packages

```
hdwallet-core              hdwallet-coinbase          hdwallet-gridplus
hdwallet-keepkey            hdwallet-keplr             hdwallet-ledger
hdwallet-metamask-multichain hdwallet-native           hdwallet-phantom
hdwallet-trezor             hdwallet-vultisig          hdwallet-walletconnectv2
hdwallet-keepkey-electron   hdwallet-keepkey-nodehid   hdwallet-keepkey-nodewebusb
hdwallet-keepkey-tcp        hdwallet-keepkey-webusb     hdwallet-ledger-webhid
hdwallet-ledger-webusb      hdwallet-native-vault      hdwallet-trezor-connect
```

Plus two non-publishable packages added during migration:
- `hdwallet-sandbox` — jQuery-based wallet testing UI (from `examples/sandbox/`)
- `hdwallet-integration` — integration test suite (from `integration/src/`)

## Key architectural decisions

### Build system
- Each package builds to `dist/esm/` and `dist/cjs/` (dual ESM/CJS)
- `tsc --build` with project references handles build ordering
- `tsconfig.hdwallet.json` references only hdwallet packages for fast builds
- Post-build: `tsc-esm-fix` adds `.js` extensions for ESM, CJS `package.json` marker

### ethers v5/v6 coexistence
- hdwallet packages use ethers v5, web app uses ethers v6
- `ethers5` is an npm alias (`npm:ethers@5.7.2`) at root level
- Main web app: `resolveEthersV5ForHdwallet` Vite plugin in `vite.config.mts` redirects `ethers` → `ethers5` only for imports from `packages/hdwallet-*`
- Sandbox: same plugin in `packages/hdwallet-sandbox/vite.config.ts`
- `gridplus-sdk` uses ethers v6 internally — must NOT be redirected

### @ethereumjs/tx version conflict
- Hoisted: `@ethereumjs/tx@4.2.0` (exports `Transaction`) — used by keepkey, trezor, ledger
- Nested: `@ethereumjs/tx@5.4.0` under gridplus-sdk (exports `LegacyTransaction`, no `Transaction`)
- Sandbox fix: `optimizeDeps.include: ["@ethereumjs/tx", "gridplus-sdk > @ethereumjs/tx"]` tells Vite to pre-bundle them separately

### Buffer/global/process polyfills (Vite 6)
- `vite-plugin-node-polyfills` `globals` injection is broken in Vite 6 — it injects self-referencing circular imports into its own polyfill shim files
- Workaround: `globals: { Buffer: false, global: false, process: false }` + explicit `polyfills.ts` imported first in sandbox `index.ts`
- Main web app uses the same plugin but with `globals: true` — works there because it's Vite 6 with different dep optimization behavior (source files via tsconfigPaths, not dist)

### Module resolution in sandbox vs web app
- **Web app:** `vite-tsconfig-paths` resolves hdwallet imports to SOURCE files (`packages/hdwallet-*/src/`)
- **Sandbox:** resolves hdwallet imports to DIST files (`packages/hdwallet-*/dist/esm/`) — no tsconfigPaths plugin. This is necessary because serving source directly causes version conflicts in pre-bundled deps (all packages share one `@ethereumjs/tx`)

## Root scripts

```
yarn hdwallet:build              # tsc --build tsconfig.hdwallet.json + postbuild
yarn hdwallet:sandbox            # build + start sandbox Vite dev server
yarn hdwallet:test:integration   # run integration tests via vitest
yarn hdwallet:docker:emulator    # start KeepKey emulator Docker container
```

## What's been tested

- Sandbox: MetaMask and Phantom — working
- Web app: native wallet unlock — working
- `yarn type-check`, `yarn build:packages`, `yarn build:web` — all pass

## What still needs to be done

See PR description checkboxes at https://github.com/shapeshift/web/pull/11811

### Testing
- Sandbox: Ledger, Trezor, KeepKey, WalletConnect v2, Keplr, Coinbase
- Web app: wallet import/creation, MetaMask/Ledger/Trezor connection + signing, swap flows
- Integration tests: verify `yarn hdwallet:test:integration` passes

### CI
- Conditionally run hdwallet tests only when `packages/hdwallet-*` files change — no need on every web PR

### Dead wallet removal
~~Remove Portis, WalletConnect v1 (legacy), KeepKey Chrome USB~~
**Done** -- removed `hdwallet-portis`, `hdwallet-walletconnect`, and `hdwallet-keepkey-chromeusb` packages and all references.
- Reference: https://github.com/shapeshift/hdwallet/pull/746 by @kaladinlight

### Code cleanup
- Run prettier on hdwallet sources to match web conventions (printWidth 100, singleQuote true) — separate commit
- Consider removing `skipLibCheck: true` from 48 hdwallet tsconfigs
- Consider removing unnecessary `ethers: 5.7.2` deps from packages that don't directly use ethers

## Gotchas / things to watch out for

1. **Node version**: must be 22 (check `.nvmrc`) — always `nvm use` before running commands
2. **`src/lib/globals.ts`** augments `String.prototype.split` return type — hdwallet code that calls `.split()` needs type assertions
3. **bech32 hoisting**: adding hdwallet packages can change which `bech32` version gets hoisted; `bech32@^2.0.0` is a root dep to stabilize this
4. **Sandbox/integration excluded from type-check**: both are in root `tsconfig.json` `exclude` array — they have hundreds of type errors (test harness code, not strict)
5. **`tsconfig.packages.json`**: do NOT add `"paths": {}` — it causes dual-package hazard (see MEMORY.md for details)
6. **Sandbox Vite cache**: if you change sandbox vite config, always `rm -rf packages/hdwallet-sandbox/node_modules/.vite` before restarting

## File map

```
tsconfig.hdwallet.json                    # hdwallet-only build config
HDWALLET_MIGRATION_AUDIT.md               # detailed audit of all issues found
HDWALLET_MIGRATION_CONTEXT.md             # this file
packages/hdwallet-sandbox/                # sandbox testing UI
  vite.config.ts                          # ethers plugin, @ethereumjs/tx split, polyfill config
  polyfills.ts                            # Buffer/global/process setup (Vite 6 workaround)
  index.html                              # sandbox HTML
  index.ts                                # sandbox entry (imports polyfills first)
packages/hdwallet-integration/            # integration test suite
  src/                                    # test files per chain + wallet adapter tests
vite.config.mts                           # main web app — has resolveEthersV5ForHdwallet plugin
```
