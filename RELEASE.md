# Release process

Single command, idempotent. Run `pnpm release` at any point - it figures out where you are and does the next step.

## Regular release

1. Run `pnpm release`, select Regular, confirm -> creates **prerelease PR** (develop -> release)
2. **Merge prerelease PR on GitHub**
3. Run `pnpm release` again -> generates AI release notes, creates **release PR** (release -> main)
4. **Merge release PR on GitHub** when CI passes
5. Run `pnpm release` again -> tags main with version, creates **private sync PR** (main -> private)
6. **Merge private sync PR on GitHub**
7. Run `pnpm release` again -> "done, nothing to do"

## Hotfix release

1. Run `pnpm release`, select Hotfix, pick commits -> creates **hotfix PR** (hotfix/vX.Y.Z -> main)
2. **Merge hotfix PR on GitHub**
3. Run `pnpm release` again -> tags, creates **private sync PR** + **backmerge PR** (main -> develop)
4. **Merge both PRs on GitHub**

## How it works

The script derives its state from observable git/GitHub state (branch SHAs, tags, open PRs) rather than tracking state in a file. This makes it idempotent - you can run it as many times as you want without creating duplicates or re-tagging.

### Regular release states

```
idle (no prerelease)     -> create develop -> release PR
prerelease_pr_open       -> waiting for merge on GitHub
idle (prerelease merged) -> create release -> main PR with AI notes
release_pr_open          -> waiting for merge on GitHub
merged_untagged          -> tag main, create main -> private PR
tagged_private_stale     -> waiting for private sync merge on GitHub
done                     -> nothing to do
```

### Hotfix states

```
idle                     -> cherry-pick commits, create hotfix -> main PR
hotfix_pr_open           -> waiting for merge on GitHub
merged_untagged          -> tag main, create private sync + backmerge PRs
tagged_private_stale     -> waiting for PR merges on GitHub
done                     -> nothing to do
```

## Branch protection

All four branches are protected - no direct pushes:

- **main**: production
- **develop**: development
- **release**: staging between develop and main
- **private**: tracks main with different env vars (Cloudflare deployment)

## AI release notes

The release PR body is AI-generated using Claude CLI. It groups commits by feature domain, separates production changes from dev-only (feature-flagged) changes, and includes testing notes. Falls back to a raw commit list if Claude is unavailable.
