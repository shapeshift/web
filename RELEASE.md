# Release process

> [!WARNING]
> **Merge release and hotfix PRs into `main` with "Create a merge commit". Never squash.**
> A squashed release breaks the script's tracking of what has shipped. If it happens, stop and ask in #engineering before running anything else.

Everything goes through `pnpm release`. Run it, pick the release type, and follow the prompts. It works out which step you're on, so re-running it is always safe.

Requires `gh` (authenticated). The `claude` CLI is optional and only used to write the release notes.

## Regular release

1. Run `pnpm release` and choose **Regular**. Confirm the commit list. The script opens the release PR (`release` -> `main`).
2. Test the `release` deployment.
3. Merge the release PR with **"Create a merge commit"**.
4. Run `pnpm release` and choose **Regular** again. The script tags the version and opens the private sync PR, which merges itself once checks pass.

## Release fix

Adds a fix to the release PR that's already open.

1. Merge the fix into `develop` as usual.
2. Run `pnpm release` and choose **Release fix**. Pick the commits to add.

The next release's notes may list these commits again. Delete those lines from the PR body.

## Hotfix

Ships specific commits from `develop` straight to production.

1. Run `pnpm release` and choose **Hotfix**. Pick the commits. The script opens the hotfix PR (`hotfix/vX.Y.Z` -> `main`).
2. Merge the hotfix PR with **"Create a merge commit"**.
3. Run `pnpm release` and choose **Hotfix** again. The script tags the version and opens the private sync PR, which merges itself once checks pass.

## Merge methods

| PR | Merge with |
| --- | --- |
| Feature/fix -> `develop` | Squash |
| Release -> `main` | **Merge commit** |
| Hotfix -> `main` | **Merge commit** |
| Private sync -> `private` | Squash (automatic) |

## Rules

- Don't push to `release`, `main`, or `private` yourself. Let the script do it.
- Don't edit the release PR title (`chore: release vX.Y.Z`).
- Don't create tags by hand. The script tags after each merge.
