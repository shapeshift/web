# hdwallet Workspace Migration Audit

Deep audit of moving 21 hdwallet packages from separate repo into web monorepo as workspace packages.

## Critical — Must fix before merge

### 1. `require()` in ledger bitcoin.ts

**File:** `packages/hdwallet-ledger/src/bitcoin.ts:42-44`

```typescript
const getTrustedInputModule = require("@ledgerhq/hw-app-btc/lib/getTrustedInputBIP143");
```

Monkey-patches Zcash BIP143 trusted input handling. Will fail silently in ESM (wrapped in try-catch). **Pre-existing** from original hdwallet repo — not introduced by migration. Zcash Ledger signing may not work in the workspace version.

**Options:**
- Convert to dynamic `import()` with ESM-compatible monkey-patching
- Accept the limitation (Zcash Ledger is low usage)

### 2. Missing tsconfig references

**Files:**
- `packages/hdwallet-keepkey-electron/tsconfig.esm.json`
- `packages/hdwallet-keepkey-electron/tsconfig.cjs.json`
- `packages/hdwallet-keepkey-nodehid/tsconfig.esm.json`
- `packages/hdwallet-keepkey-nodehid/tsconfig.cjs.json`

These packages reference only `hdwallet-keepkey` but are missing `hdwallet-core`. Other keepkey transport packages (tcp, nodewebusb, webusb) correctly have both references. Without the explicit reference, `tsc --build` won't properly rebuild when hdwallet-core changes.

---

## Medium — Should fix

### 3. Duplicate `@types/w3c-web-usb` with version conflict

**File:** `packages/hdwallet-ledger-webusb/package.json`

Listed in both `dependencies` (`^1.0.4`) and `devDependencies` (`^1.0.6`) with different versions. Should be consolidated to one location with one version.

### 4. Extra `ethers` dependencies added

**Packages:** `hdwallet-coinbase`, `hdwallet-phantom`, `hdwallet-vultisig`, `hdwallet-metamask-multichain`

These packages didn't have `ethers` in the original repo but the migration script added `"ethers": "5.7.2"`. They import from `ethers/lib/utils` which is handled by the Vite alias → `ethers5`. The explicit dep is harmless but unnecessary — could be removed for cleanliness.

### 5. `@solana/web3.js` version constraint relaxed

**Packages:** `hdwallet-core`, `hdwallet-phantom`, `hdwallet-vultisig`, `hdwallet-ledger`

Changed from exact pin `1.95.8` to caret `^1.98.0`. Could pull a breaking minor version. Consider pinning to match the version the web app resolves to.

### 6. Root `tsconfig.json` missing hdwallet references

**File:** `tsconfig.json` (lines 54-63)

Only references 8 non-hdwallet packages. `tsconfig.packages.json` has all 21 — that's what `yarn build:packages` uses, so builds work. But IDE/editor type-checking via `tsconfig.json` may not see hdwallet project references for incremental builds.

### 7. `skipLibCheck: true` in all hdwallet tsconfigs

All 42 `tsconfig.{esm,cjs}.json` files have `skipLibCheck: true`. This hides type errors in declaration files. Acceptable during migration but consider removing once stable.

---

## Low / Informational

### 8. `globals.ts` String.prototype.split augmentation

**File:** `src/lib/globals.ts`

Augments `String.prototype.split` return type to `(string | undefined)[]`. Affected hdwallet files were fixed:
- `bip32/index.ts` uses `Array.from(path.split("/")) as string[]`
- `bip39.ts` uses `.filter((x): x is string => x !== undefined)`

This is a **type-level-only** augmentation — runtime behavior of `String.split` is unchanged. The fixes are safe.

### 9. `mockVault.skip.ts` included in tsconfig glob

**File:** `packages/hdwallet-native-vault/src/test/mockVault.skip.ts`

Matched by `src/**/*` glob in tsconfig. Harmless — only exports types/functions, no side effects, not re-exported from index.ts.

### 10. Ledger `require()` context

The monkey-patch in `hdwallet-ledger/src/bitcoin.ts` (Issue #1) works by replacing `getTrustedInputBIP143` at the module level to fix Zcash BIP143 handling on Ledger devices. In ESM, `require()` is unavailable and the catch block fires, logging a console error. The rest of the Ledger Bitcoin functionality is unaffected.

---

## What's verified and solid

| Area | Status |
|---|---|
| All 21 packages copied completely | No missing source files |
| All `workspace:^` conversions | Correct across root, chain-adapters, swapper |
| Barrel exports (index.ts) | All match original hdwallet repo exactly |
| No circular dependencies | Dependency graph is clean and acyclic |
| No CJS patterns in source | No `module.exports` or `exports.` — all ESM |
| Dynamic imports | All wrapped in `PLazy.from()` |
| Web app import paths | No deep imports — all use package index exports |
| Buffer polyfills | `vite-plugin-node-polyfills` covers Buffer, global, process |
| Crypto usage | Web Crypto API only — no Node.js `crypto` module |
| ethers v5/v6 coexistence | Vite plugin resolves hdwallet `ethers` → `ethers5` |
| `yarn type-check` | 0 errors |
| `yarn build:packages` | 0 errors |
| `yarn build:web` | 0 errors (263 valid files) |
| Vite config | Plugin order, commonjsOptions, resolve aliases all correct |
| Code splitting | Wallet-specific lazy imports preserved (same as before) |
| `noUnusedLocals/noUnusedParameters` overrides | Removed from all 42 hdwallet tsconfigs |

---

## Package dependency diff vs original

| Package | Change | Severity |
|---|---|---|
| hdwallet-coinbase | Added `ethers: 5.7.2` (not in original) | Low |
| hdwallet-phantom | Added `ethers: 5.7.2` (not in original) | Low |
| hdwallet-vultisig | Added `ethers: 5.7.2` (not in original) | Low |
| hdwallet-metamask-multichain | Added `ethers: 5.7.2` (not in original) | Low |
| hdwallet-core | `@solana/web3.js` `1.95.8` → `^1.98.0` | Medium |
| hdwallet-phantom | `@solana/web3.js` `1.95.8` → `^1.98.0` | Medium |
| hdwallet-vultisig | `@solana/web3.js` `1.95.8` → `^1.98.0` | Medium |
| hdwallet-ledger | `@solana/web3.js` `1.95.8` → `^1.98.0` | Medium |
| hdwallet-keplr | `caip`/`types` npm versions → `workspace:^` | Intentional |
| hdwallet-ledger-webusb | Duplicate `@types/w3c-web-usb` in deps + devDeps | Medium |

---

## Fixed during migration

| Item | Status |
|---|---|
| Missing tsconfig refs (keepkey-electron, keepkey-nodehid) | Fixed — added `hdwallet-core` references to 4 tsconfig files |
| Root `tsconfig.json` missing hdwallet references | Fixed — added all 21 packages |
| `@solana/web3.js` version pinning | Fixed — pinned to exact `1.98.0` across all 9 packages |
| `noUnusedLocals`/`noUnusedParameters` overrides | Fixed — removed from all 42 hdwallet tsconfigs, prefixed unused params with `_` |
| Stale build artifacts in `src/` dirs | Fixed — deleted 67 stale `.d.ts`, `.d.ts.map`, `.js.map` files from hdwallet-native/src |
| ethers v5/v6 coexistence | Fixed — Vite plugin conditionally resolves `ethers` → `ethers5` for hdwallet sources |

---

## Remaining / Post-merge cleanup

### Debug console.logs
~~8 `[hdwallet-native][WORKSPACE]` logs + 2 `gm hmr` logs in `packages/hdwallet-native/src/`. Must be removed before merge.~~
**Done** — all 10 debug console.logs removed.

### Formatting mismatch
Original hdwallet used `printWidth: 120`, `singleQuote: false`. Web uses `printWidth: 100`, `singleQuote: true`. Copied hdwallet source keeps original formatting. Not a functional issue but will show in diffs if files are touched later. Consider running prettier on hdwallet sources as a separate commit.

### Integration tests
~~Original repo had `integration/src/` with Jest-based tests. Not brought over.~~
**Done** — brought over as `packages/hdwallet-integration/` with vitest. Run via `yarn hdwallet:test:integration`. Excluded from root type-check (test harness, not strict).

### Docker emulator scripts
~~Original had `docker:run:emulator` / `docker:stop:run:emulator` for KeepKey hardware wallet emulator.~~
**Done** — added as `yarn hdwallet:docker:emulator` root script.

### Sandbox
~~Original had `examples/sandbox/` with jQuery-based wallet testing UI.~~
**Done** — brought over as `packages/hdwallet-sandbox/`. Run via `yarn hdwallet:sandbox`. Excluded from root type-check (test harness, ~362 type errors, not strict). MetaMask tested and working.

### Sandbox — remaining wallet testing
Sandbox is functional with MetaMask. The following wallet integrations should still be manually tested:
- Ledger (WebHID / WebUSB)
- Trezor
- KeepKey (WebUSB / TCP via emulator)
- WalletConnect v2
- Keplr
- Coinbase
- Phantom

### Sandbox — Vite 6 polyfill workarounds
`vite-plugin-node-polyfills` `globals` injection is broken in Vite 6 (self-referencing circular import in pre-bundled dep chunks). Workaround: `globals: false` + explicit `polyfills.ts` module imported first in `index.ts` sets up `Buffer`, `global`, and `process` on `globalThis`. If upgrading `vite-plugin-node-polyfills` later, test whether `globals: true` works again.

### Sandbox — `@ethereumjs/tx` version conflict
`gridplus-sdk` depends on `@ethereumjs/tx@5.4.0` (renamed `Transaction` to `LegacyTransaction`), while keepkey/trezor/ledger use `@ethereumjs/tx@4.2.0` (has `Transaction`). Vite's dep optimizer wants to pre-bundle one version. Workaround: `optimizeDeps.include: ["@ethereumjs/tx", "gridplus-sdk > @ethereumjs/tx"]` creates separate pre-bundled entries per version.

### Sandbox — ethers v5/v6 resolution
Sandbox uses a targeted Vite plugin (`resolveEthersV5ForHdwallet`) that redirects `ethers` → `ethers5` only for files under `packages/hdwallet-*`, allowing `gridplus-sdk` to use its own ethers v6. Same pattern as the main web app.

### Dependency version standardization
Standardized across monorepo during migration:
- `lodash`: `^4.17.23` (12 packages)
- `@types/lodash`: `^4.14.178` (10 packages)
- `crypto-js`: `^4.2.0` (keepkey, native)
- `bitcoinjs-message`: `^2.1.0` (ledger, phantom, vultisig)
- `bip32`: `^2.0.5` (sandbox)

### `patch-package` postinstall
Original had `postinstall: "patch-package"` with a `jest-environment-jsdom` patch. Jest-specific — not relevant (Vitest). No action needed.

### `skipLibCheck: true` in hdwallet tsconfigs
All 42 `tsconfig.{esm,cjs}.json` files have `skipLibCheck: true`. Hides type errors in declaration files. Acceptable during migration, consider removing once stable.
