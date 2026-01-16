---
name: git-commit-push
description: Commit staged/unstaged changes and push to remote repository. Use when user wants to commit changes, push to remote, or create a commit and push in one operation.
allowed-tools: Bash, Read, TodoWrite
---

# Git Commit and Push

Execute commands exactly as shown. Flags are optimized for minimal output.

## Step 1: Gather State (single command)

```bash
git status -sb && git log --oneline -3 && git diff --stat
```

Output provides: branch state, recent commit style, files changed with line counts.
Generate commit message from file names and change magnitude.

## Step 2: Stage and Commit (single command)

```bash
git add -A && git commit -m "<type>: <description>"
```

Types: `feat|fix|refactor|chore|docs|test|style`

## Step 3: Push (single command)

If branch has upstream (shown as `origin/branch` in step 1):

```bash
git push
```

If no upstream:

```bash
git push -u origin HEAD
```

If behind remote (step 1 shows `[behind N]`):

```bash
git pull --rebase && git push
```

## Safety

Do NOT commit files matching: `.env*`, `*secret*`, `*credential*`, `*key.json`
