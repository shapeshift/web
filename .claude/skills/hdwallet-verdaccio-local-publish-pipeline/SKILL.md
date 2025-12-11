---
name: hdwallet-verdaccio-local-publish-pipeline
description: Publishes hdwallet packages locally to verdaccio and updates them in the web repo. Use when you need to publish hdwallet locally, publish to verdaccio, run the verdaccio publish pipeline, or test hdwallet changes locally.
allowed-tools: Bash, Read, TodoWrite, AskUserQuestion
---

# hdwallet-verdaccio-local-publish-pipeline

This skill automates the complete hdwallet local publish pipeline.

## Pipeline Steps

This skill runs the complete hdwallet publish pipeline:

### 0. Verify verdaccio setup (FIRST TIME ONLY)
Only needed if this is the first time setting up verdaccio in these repos.

Run in both repos:
- `yarn config set npmRegistryServer http://127.0.0.1:4873 && npm set registry http://127.0.0.1:4873`

Once configured, this persists across runs.

### 1. Build hdwallet
In the hdwallet repo (`../shapeshiftHdWallet`, or whichever is the path for hdwallet):
- `yarn && yarn build`

### 2. Version and publish to verdaccio
- Ask user for semver feature name (FIRST TIME ONLY)
  - Must be either a single word OR use hyphens as delimiters (e.g., `sol-sig-fix`, not `sol_sig_fix`)
  - Underscores are NOT allowed in npm package versions
- Determine the alpha version:
  - Current version (e.g., `1.62.5`) → next is `1.62.6-<feature-name>.0`
  - If already on an alpha (e.g., `1.62.6-<feature-name>.0`) → increment to `.1`, `.2`, etc.
- Version packages: `npx lerna version prerelease --preid <feature-name> --no-git-tag-version --no-push --yes`
- Commit version changes: `git add -A && git commit -m "chore: version packages to <version>"`
- Publish: `npx lerna publish from-package --no-git-tag-version --no-push --yes`

### 3. Update web repo dependencies
In the ShapeShift web repo (Current repo clause is being ran from):
- `yarn up '@shapeshiftoss/hdwallet-*@<version>'`

### 4. Verify all hdwallet references were updated
After running `yarn up`, verify that ALL package.json files with hdwallet dependencies were updated:
- Root `package.json`
- `packages/chain-adapters/package.json`
- `packages/swapper/package.json`

**Verification commands:**
```bash
grep "@shapeshiftoss/hdwallet-" package.json | head -20
grep "@shapeshiftoss/hdwallet-" packages/chain-adapters/package.json
grep "@shapeshiftoss/hdwallet-" packages/swapper/package.json
```

**If any packages were NOT updated:**
Simply edit the files directly and replace the old version with the new version:
- Edit `packages/chain-adapters/package.json`
- Edit `packages/swapper/package.json`
- Find/replace old hdwallet version with new version

## Important Notes

- Assumes user ran Claude from web repo with `--add-dir ../shapeshiftHdWallet` (or their hdwallet dir)
- Verdaccio must be running on `http://127.0.0.1:4873`
- Feature name must use hyphens, not underscores (npm version requirement)
- If lerna publish fails due to uncommitted changes, commit them first
- The publish process rebuilds all packages automatically (prepublishOnly hooks)

## Example

```bash
# First alpha for a new feature
1.62.5 → 1.62.6-sol-sig-fix.0

# Subsequent alphas
1.62.6-sol-sig-fix.0 → 1.62.6-sol-sig-fix.1
1.62.6-sol-sig-fix.1 → 1.62.6-sol-sig-fix.2
```

