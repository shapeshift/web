// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk'
import { exec, execFile, spawn } from 'child_process'
import fs from 'fs'
import inquirer from 'inquirer' // do not upgrade to v9, as it does not support commonjs
import os from 'os'
import path from 'path'
import pify from 'pify'
import semver from 'semver'
import { simpleGit as git } from 'simple-git'

import { exit, getLatestSemverTag } from './utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReleaseState =
  | 'idle' // no work in progress — merge develop into release if new commits exist
  | 'release_ready' // release branch has new commits, no release PR — create release PR
  | 'release_open' // release->main PR open — merge + tag + sync private
  | 'needs_tag' // main moved past tag — tag + sync private
  | 'sync_pending' // tagged, private branch still needs to be synced

export type HotfixState =
  | 'idle' // no hotfix in progress — cherry-pick + create hotfix PR
  | 'hotfix_open' // hotfix PR open — merge it
  | 'needs_tag' // main moved past tag — tag + sync private
  | 'sync_pending' // tagged, private branch still needs to be synced

type GitHubPr = {
  number: number
  title: string
}

type UnreleasedCommit = { hash: string; message: string }

const releaseType = ['Regular', 'Hotfix', 'Release fix'] as const
type ReleaseType = (typeof releaseType)[number]

// ---------------------------------------------------------------------------
// Pure helpers (testable)
// ---------------------------------------------------------------------------

const PR_NUMBER_REGEX = /\(#(\d+)\)\s*$/

export const extractPrNumbers = (messages: string[]): number[] => {
  const prNumbers: number[] = []
  for (const msg of messages) {
    const match = msg.match(PR_NUMBER_REGEX)
    if (match) prNumbers.push(Number(match[1]))
  }
  return Array.from(new Set(prNumbers))
}

export const extractDescription = (prBody: string): string | undefined => {
  const descMatch = prBody.match(/## Description\s*\n([\s\S]*?)(?=\n## |$)/)
  if (!descMatch) return undefined
  const desc = descMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim()
  if (!desc || desc.length < 10) return undefined
  const MAX_DESC_LENGTH = 500
  return desc.length > MAX_DESC_LENGTH ? `${desc.slice(0, MAX_DESC_LENGTH)}...` : desc
}

export const deriveReleaseState = ({
  mainSha,
  latestTagSha,
  releaseIsAheadOfMain,
  privateContentMatchesMain,
  openReleasePr,
}: {
  mainSha: string
  latestTagSha: string
  releaseIsAheadOfMain: boolean
  privateContentMatchesMain: boolean
  openReleasePr: GitHubPr | undefined
}): ReleaseState => {
  // Open PRs take highest priority — resume in-flight work first.
  if (openReleasePr) return 'release_open'
  // Main moved past the latest tag — must tag before anything else.
  if (mainSha !== latestTagSha) return 'needs_tag'
  // Tagged but private branch is still behind main.
  if (!privateContentMatchesMain) return 'sync_pending'
  // Release branch has new commits but no release PR was created yet.
  if (releaseIsAheadOfMain) return 'release_ready'
  return 'idle'
}

export const deriveHotfixState = ({
  mainSha,
  latestTagSha,
  privateContentMatchesMain,
  openHotfixPr,
}: {
  mainSha: string
  latestTagSha: string
  privateContentMatchesMain: boolean
  openHotfixPr: GitHubPr | undefined
}): HotfixState => {
  if (openHotfixPr) return 'hotfix_open'
  if (mainSha !== latestTagSha) return 'needs_tag'
  // Private branch still behind main after tag.
  if (!privateContentMatchesMain) return 'sync_pending'
  return 'idle'
}

// ---------------------------------------------------------------------------
// AI release notes
// ---------------------------------------------------------------------------

const CLAUDE_TIMEOUT_MS = 120_000

export const buildReleasePrompt = (
  version: string,
  messages: string[],
  prBodies: Map<number, string>,
): string => {
  const commitList = messages
    .map(msg => {
      const match = msg.match(PR_NUMBER_REGEX)
      const prNum = match ? Number(match[1]) : null
      const body = prNum ? prBodies.get(prNum) : undefined
      const description = body ? extractDescription(body) : undefined
      const lines = [`- ${msg}`]
      if (description) lines.push(`  Context: ${description}`)
      return lines.join('\n')
    })
    .join('\n')

  return `You are a release notes generator for ShapeShift Web, a decentralized crypto exchange.

Given the commit list below for ${version}, produce grouped release notes in markdown with two clearly separated top-level sections.

## STEP 1: Determine which features are behind a flag (OFF in production)

Read the env files to determine which VITE_FEATURE_* flags are OFF in production:
- .env is the base (all environments inherit from it)
- .env.production overrides base for production
- .env.development overrides base for development

A feature is "under flag" (not in production) if its effective production value is false, i.e. it is false in .env and not overridden to true in .env.production, OR it is overridden to false in .env.production.

A feature is "dev-only" if it is ON in development (.env + .env.development overrides) but OFF in production.

For each commit below, check if it relates to a flagged-off-in-prod feature by matching the feature name in the commit message to a VITE_FEATURE_* flag name (e.g. "celo" matches VITE_FEATURE_CELO, "across" matches VITE_FEATURE_ACROSS_SWAP, "agentic" matches VITE_FEATURE_AGENTIC_CHAT). Commits explicitly saying "behind feature flag" or "under flag" also count.

## STEP 2: Write grouped release notes

### Section 1: "# Production changes - testing required"
1. Contains all PRs/commits that are NOT behind a flagged-off-in-prod feature
2. Group related commits under descriptive ## headings by feature domain (e.g. "TON chain + Stonfi swapper", "Yield improvements", "BigAmount migration")
3. List each commit as a bullet under its group, preserving the original text and PR number
4. After the bullet list, write 1-2 sentences summarizing what changed and what to test
5. For internal refactors with no user-facing changes (e.g. migrations, type changes, selector renames), note **regression testing only** and what to sanity-check
6. For dependency bumps, CI fixes, infra, docker, CSP, and asset data regeneration, group under "## Fixes, deps, and infra" with **no testing required**

### Section 2: "# Dev/local only - no production testing required"
7. Contains ALL commits behind a feature flag that is OFF in production
8. Group by feature domain with brief description only - no testing notes needed since these are not visible in production

### General rules
9. Merge commits (e.g. "Merge branch 'main' into develop", "chore: merge develop into release") should be silently dropped
10. Keep testing notes brief and actionable - what a QA person should click on, not implementation details
11. Use present tense for summaries ("Enables TON chain" not "Enabled TON chain")
12. Do NOT use emdashes. Use regular hyphens.

## Commits

${commitList}`
}

const spawnClaude = (cmd: string, args: string[], promptPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const promptStream = fs.createReadStream(promptPath)
    promptStream.on('error', err => reject(new Error(`Failed to read prompt file: ${err.message}`)))
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.CLAUDE_CODE_ENTRYPOINT
    delete env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    promptStream.pipe(child.stdin)

    const label = `${cmd} ${args[0] === 'code' ? 'code ' : ''}`
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`${label}timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`))
    }, CLAUDE_TIMEOUT_MS)

    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim())
      } else {
        const details = [
          stderr && `stderr: ${stderr.slice(0, 500)}`,
          stdout && `stdout: ${stdout.slice(0, 500)}`,
        ]
          .filter(Boolean)
          .join('; ')
        reject(new Error(`${label}exited with code ${code}${details ? `: ${details}` : ''}`))
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      reject(new Error(`${label}not available: ${err.message}`))
    })
  })
}

const isCcrAvailable = (): Promise<boolean> => {
  return new Promise(resolve => {
    const child = spawn('which', ['ccr'], { stdio: ['ignore', 'pipe', 'ignore'] })
    child.on('close', code => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
}

const CLAUDE_ARGS = ['-p', '--model', 'opus', '--max-turns', '10']

const runClaude = async (promptPath: string): Promise<string> => {
  try {
    return await spawnClaude('claude', CLAUDE_ARGS, promptPath)
  } catch (cliErr) {
    if (!(await isCcrAvailable())) throw cliErr
    console.log(chalk.yellow(`claude CLI failed: ${(cliErr as Error).message}`))
    console.log(chalk.blue('Falling back to ccr code...'))
    return await spawnClaude('ccr', ['code', ...CLAUDE_ARGS], promptPath)
  }
}

const generateReleaseSummary = async (
  version: string,
  messages: string[],
  prBodies: Map<number, string>,
): Promise<string | null> => {
  const prompt = buildReleasePrompt(version, messages, prBodies)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shapeshift-release-'))
  const promptPath = path.join(tmpDir, 'prompt.txt')

  try {
    fs.writeFileSync(promptPath, prompt, 'utf-8')
    const output = await runClaude(promptPath)
    return output
  } catch (err) {
    console.log(chalk.yellow(`Claude summary generation failed: ${(err as Error).message}`))
    console.log(chalk.yellow('Falling back to raw commit list.'))
    return null
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

// ---------------------------------------------------------------------------
// Git/GitHub helpers
// ---------------------------------------------------------------------------

const fetchOrigin = async () => {
  console.log(chalk.green('Fetching...'))
  await git().fetch(['origin', '--tags', '--force'])
}

const assertGhInstalled = async () => {
  try {
    await pify(exec)('hash gh')
  } catch {
    exit(chalk.red('Please install GitHub CLI https://github.com/cli/cli#installation'))
  }
}

const assertGhAuth = async () => {
  try {
    await pify(exec)('gh auth status')
  } catch (e) {
    exit(chalk.red((e as Error).message))
  }
}

const getSha = async (ref: string): Promise<string> => {
  try {
    return (await git().revparse([ref])).trim()
  } catch {
    return ''
  }
}

const getTagSha = async (tag: string): Promise<string> => {
  try {
    return (await git().revparse([`${tag}^{}`])).trim()
  } catch {
    return ''
  }
}

const fetchPrBodies = async (prNumbers: number[]): Promise<Map<number, string>> => {
  const results = new Map<number, string>()
  const settled = await Promise.allSettled(
    prNumbers.map(async prNum => {
      const stdout = (await pify(exec)(
        `gh api repos/{owner}/{repo}/pulls/${prNum} --jq '.body'`,
      )) as string
      return { prNum, body: stdout.trim() }
    }),
  )
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.body) {
      results.set(result.value.prNum, result.value.body)
    }
  }
  return results
}

// Finds an open private sync PR — checks the pre-resolved branch first, then falls back to main.
const findOpenPrivateSyncPr = async (version: string): Promise<GitHubPr | undefined> => {
  const resolveBranch = `chore/sync-private-${version}-resolve`
  return (await findOpenPr(resolveBranch, 'private')) ?? (await findOpenPr('main', 'private'))
}

// Creates a private sync PR with a single pre-resolved commit (main's tree, private's parent).
// Uses git commit-tree to produce one clean commit without touching the working tree or
// switching branches. private ends up content-identical to main after the PR merges.
const createResolvedPrivateSyncPr = async ({
  version,
  title,
  body,
}: {
  version: string
  title: string
  body: string
}): Promise<string | null> => {
  const resolveBranch = `chore/sync-private-${version}-resolve`
  console.log(chalk.green(`Creating pre-resolved private sync branch ${resolveBranch}...`))

  const treeResult = await pify(exec)('git rev-parse "origin/main^{tree}"')
  const mainTree = treeResult.trim()

  const commitResult = await pify(exec)(
    `git commit-tree ${mainTree} -p origin/private -m "chore: sync private to ${version}"`,
  )
  const commitSha = commitResult.trim()

  await pify(exec)(`git branch -f ${resolveBranch} ${commitSha}`)
  await git().push(['-f', 'origin', resolveBranch])

  if (!(await inquireConfirm('Create private sync PR?'))) return exit('Sync cancelled.')
  return createPr({ base: 'private', head: resolveBranch, title, body })
}

// Returns develop commits that haven't yet been shipped to main.
//
// `git log --cherry-pick --right-only --no-merges main...develop` lists commits on develop
// whose patch IDs are not present on main. Because release PRs land as merge commits, develop
// SHAs are reachable from main directly after a release, so this naturally returns empty.
// Hotfixes are also handled correctly: cherry-picked commits land on main with new SHAs but
// matching patch IDs, so the original develop commits are skipped from the unreleased set.
const getUnreleasedCommits = async (): Promise<UnreleasedCommit[]> => {
  const result = await pify(exec)(
    `git log --cherry-pick --right-only --no-merges --pretty=format:"%H %s" origin/main...origin/develop`,
  ).catch(() => '')
  if (!result.trim()) return []

  return result
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line: string) => {
      const spaceIdx = line.indexOf(' ')
      if (spaceIdx === -1) return { hash: line, message: '' }
      return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) }
    })
}

type WebReleaseType = Extract<semver.ReleaseType, 'minor' | 'patch'>

const getNextVersion = async (bump: WebReleaseType): Promise<string> => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = semver.inc(latestTag, bump)
  if (!nextVersion) exit(chalk.red(`Could not increment ${latestTag} with bump type '${bump}'`))
  return `v${nextVersion}`
}

const findOpenPr = async (head: string, base: string): Promise<GitHubPr | undefined> => {
  const result = await pify(exec)(
    `gh pr list --repo shapeshift/web --head ${head} --base ${base} --state open --json number,title --jq '.[0]'`,
  )
  const trimmed = result.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as GitHubPr
  } catch {
    return undefined
  }
}

const createPr = async ({
  base,
  head,
  title,
  body,
}: {
  base: string
  head: string
  title: string
  body: string
}): Promise<string | null> => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shapeshift-release-body-'))
  const bodyPath = path.join(tmpDir, 'body.md')

  try {
    fs.writeFileSync(bodyPath, body, 'utf-8')
    const result = await pify(execFile)('gh', [
      'pr',
      'create',
      '--repo',
      'shapeshift/web',
      '--base',
      base,
      '--head',
      head,
      '--title',
      title,
      '--body-file',
      bodyPath,
    ])
    return result.trim()
  } catch (err) {
    if (String(err).includes('No commits between')) return null
    throw err
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

// ---------------------------------------------------------------------------
// Inquirer prompts
// ---------------------------------------------------------------------------

const inquireReleaseType = async (): Promise<ReleaseType> => {
  const { type } = await inquirer.prompt<{ type: ReleaseType }>([
    {
      type: 'list',
      name: 'type',
      message: 'What type of release is this?',
      choices: releaseType,
    },
  ])
  return type
}

const inquireConfirm = async (message: string): Promise<boolean> => {
  const { shouldProceed } = await inquirer.prompt<{ shouldProceed: boolean }>([
    {
      type: 'confirm',
      default: true,
      name: 'shouldProceed',
      message,
    },
  ])
  return shouldProceed
}

const inquireSelectCommits = async (
  commits: UnreleasedCommit[],
  message = 'Select commits to cherry-pick:',
): Promise<UnreleasedCommit[]> => {
  const { selected } = await inquirer.prompt<{ selected: string[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices: commits.map(c => ({
        name: `${c.hash.slice(0, 8)} ${c.message}`,
        value: c.hash,
      })),
    },
  ])
  return commits.filter(c => selected.includes(c.hash))
}

// ---------------------------------------------------------------------------
// Shared release step handlers
// ---------------------------------------------------------------------------

// sync_pending: sync the private branch with main after a release.
// Release branch is left alone in both flows. For regular releases, release already matches
// main's tree (the release PR brought it there). For hotfixes, release lags behind main, but
// the hotfix commits originated on develop, so the next regular release's develop->release
// merge brings them onto release naturally and patch-id matching reconciles them with main.
const handleSyncPending = async (version: string): Promise<void> => {
  const privateContentMatchesMain = await git()
    .diff(['origin/main', 'origin/private'])
    .then(diff => !diff)

  // Private sync: bring private branch to match main.
  const existingPrivatePr = await findOpenPrivateSyncPr(version)
  if (privateContentMatchesMain) {
    console.log(chalk.green('Private already in sync with main.'))
  } else if (existingPrivatePr) {
    console.log(
      chalk.yellow(
        `Private sync PR already open: #${existingPrivatePr.number}. Enabling auto-merge...`,
      ),
    )
    await pify(exec)(`gh pr merge --auto --squash ${existingPrivatePr.number}`)
    console.log(chalk.green('Auto-merge enabled. PR will merge once status checks pass.'))
  } else {
    console.log(chalk.green('Creating PR to sync private to main...'))
    const privatePrUrl = await createResolvedPrivateSyncPr({
      version,
      title: `chore: sync private to ${version}`,
      body: `Sync private branch to main after release ${version}.`,
    })
    if (privatePrUrl) {
      console.log(chalk.green(`Private sync PR created: ${privatePrUrl}. Enabling auto-merge...`))
      await pify(exec)(`gh pr merge --auto --squash ${privatePrUrl}`)
      console.log(chalk.green('Auto-merge enabled. PR will merge once status checks pass.'))
    }
  }
}

// needs_tag: tag main as nextVersion. With merge-commit releases, main contains the original
// develop SHAs directly, so no separate develop-side tag is needed to anchor commit detection.
const handleNeedsTag = async (nextVersion: string): Promise<void> => {
  console.log(chalk.green(`Tagging ${nextVersion}...`))
  await git().fetch(['origin'])
  const tagSha = (await git().revparse(['origin/main'])).trim()
  await git().tag(['-a', nextVersion, tagSha, '-m', nextVersion])
  await git().push(['origin', nextVersion])
  console.log(chalk.green(`Tagged ${nextVersion}.`))
  await git().fetch(['origin', '--tags', '--force'])
  await handleSyncPending(nextVersion)
}

// ---------------------------------------------------------------------------
// Regular release handlers
// ---------------------------------------------------------------------------

// idle: if develop has new commits not yet shipped, merge develop into release and create
// the release PR. Release notes are derived from `main..release` after the merge.
const handleReleaseIdle = async (nextVersion: string): Promise<void> => {
  const commits = await getUnreleasedCommits()
  if (commits.length === 0) {
    console.log(chalk.green('No new commits on develop. Nothing to do.'))
    return
  }

  const commitList = commits.map(c => `- ${c.message}`).join('\n')
  console.log(chalk.blue(`\nProposed commits:\n${commitList}\n`))
  if (!(await inquireConfirm(`Merge develop into release for ${nextVersion}?`)))
    return exit('Release cancelled.')

  // Merge develop into release in a temporary worktree so the user's branch is unchanged.
  const worktreeDir = path.join(os.tmpdir(), `release-merge-${Date.now()}`)
  console.log(chalk.green('Merging develop into release...'))
  try {
    await pify(exec)(`git worktree add ${worktreeDir} origin/release`)
    const wt = git().cwd(worktreeDir)
    await wt.raw([
      'merge',
      '--no-ff',
      'origin/develop',
      '-m',
      `chore: merge develop into release for ${nextVersion}`,
    ])
    await wt.push(['origin', 'HEAD:refs/heads/release'])
  } catch (err) {
    await pify(exec)(`git worktree remove --force ${worktreeDir}`).catch(() => {})
    return exit(
      chalk.red(
        `Merge failed: ${
          err instanceof Error ? err.message : String(err)
        }\nResolve manually and re-run.`,
      ),
    )
  }
  await pify(exec)(`git worktree remove ${worktreeDir}`).catch(() => {})

  console.log(chalk.green('Release branch updated.'))
  await git().fetch(['origin'])
  await handleReleaseReady(nextVersion)
}

// release_ready: release branch has new merged commits — create the release PR (release -> main).
const handleReleaseReady = async (nextVersion: string): Promise<void> => {
  // Safety check: warn if any non-merge commit on release (past the merge-base with main)
  // was cherry-picked without -x, which would cause it to be re-included in a future release.
  const mergeBase = (await pify(exec)('git merge-base origin/main origin/release')).trim()
  const cherryPickCheck = await pify(exec)(
    `git log --no-merges --format="%H %s" ${mergeBase}..origin/release`,
  ).catch(() => '')
  if (cherryPickCheck.trim()) {
    const lines = cherryPickCheck.trim().split('\n').filter(Boolean)
    for (const line of lines) {
      const sha = line.split(' ')[0]
      const body = await pify(exec)(`git log -1 --format="%b" ${sha}`).catch(() => '')
      // Commits reachable from develop came from the merge and don't need trailers.
      // Only manually cherry-picked commits (not ancestors of develop) need the -x trailer.
      const isReachableFromDevelop = await pify(exec)(
        `git merge-base --is-ancestor ${sha} origin/develop`,
      )
        .then(() => true)
        .catch(() => false)
      if (!isReachableFromDevelop && !body.includes('(cherry picked from commit')) {
        const shortMsg = line.slice(sha.length + 1)
        console.log(
          chalk.yellow(
            `⚠ Commit ${sha.slice(
              0,
              8,
            )} "${shortMsg}" was cherry-picked without -x (missing trailer). ` +
              'This may cause it to be re-included in a future release.',
          ),
        )
      }
    }
  }

  // Release notes = commits on release not yet on main, filtered by patch-id so any commits
  // already shipped via a hotfix (different SHAs but same patch on main) are excluded. With
  // merge-commit releases, develop SHAs are reachable from main directly after merge, so this
  // naturally bounds to the current release's window without any tag or marker bookkeeping.
  const result = await pify(exec)(
    `git log --cherry-pick --right-only --no-merges --pretty=format:"%s" origin/main...origin/release`,
  )
  const messages = result.trim().split('\n').filter(Boolean)
  if (messages.length === 0) return exit(chalk.red('No commits to release.'))

  console.log(chalk.green(`${messages.length} commits ready on release branch.`))
  console.log(chalk.green('Generating AI release summary...'))
  const prNumbers = extractPrNumbers(messages)
  console.log(chalk.green(`Found ${prNumbers.length} PR references, fetching context...`))
  const prBodies = prNumbers.length > 0 ? await fetchPrBodies(prNumbers) : new Map<number, string>()
  console.log(chalk.green(`Fetched ${prBodies.size}/${prNumbers.length} PR descriptions.`))

  const summary = await generateReleaseSummary(nextVersion, messages, prBodies)
  const releaseBody = summary ?? messages.join('\n')
  if (summary) console.log(chalk.green('AI summary generated successfully.\n'))
  console.log(chalk.blue(['', releaseBody, ''].join('\n')))

  if (!(await inquireConfirm('Create release PR with this body?')))
    return exit('Release cancelled.')

  console.log(chalk.green('Creating release PR (release -> main)...'))
  const prUrl = await createPr({
    base: 'main',
    head: 'release',
    title: `chore: release ${nextVersion}`,
    body: releaseBody,
  })
  if (!prUrl) return exit(chalk.red('Failed to create release PR — no commits between branches.'))
  console.log(chalk.green(`Release PR created: ${prUrl}`))
  console.log(
    chalk.green(
      'Release PR is ready for review. Merge it manually after testing, then re-run this script to tag and sync.',
    ),
  )
}

// release_open: a release PR is already open — remind to merge manually.
const handleReleaseOpen = (pr: GitHubPr): void => {
  console.log(chalk.yellow(`Release PR open: #${pr.number} - ${pr.title}`))
  console.log(
    chalk.green(
      'Release PR is awaiting review. Merge it manually after testing, then re-run this script to tag and sync.',
    ),
  )
}

// ---------------------------------------------------------------------------
// Regular release flow (state machine dispatcher)
// ---------------------------------------------------------------------------

const doRegularRelease = async () => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = await getNextVersion('minor')

  const [mainSha, latestTagSha] = await Promise.all([getSha('origin/main'), getTagSha(latestTag)])

  const [openReleasePr, privateContentMatchesMain, releaseIsAheadOfMain] = await Promise.all([
    findOpenPr('release', 'main'),
    git()
      .diff(['origin/main', 'origin/private'])
      .then(diff => !diff),
    // Commit-count based, not tree-diff based: after a hotfix, main has commits release doesn't,
    // so a tree diff would be non-empty in the wrong direction and falsely trigger release_ready.
    pify(exec)('git rev-list --count origin/main..origin/release').then(
      (out: string) => parseInt(out.trim(), 10) > 0,
    ),
  ])

  const state = deriveReleaseState({
    mainSha,
    latestTagSha,
    releaseIsAheadOfMain,
    privateContentMatchesMain,
    openReleasePr,
  })

  console.log(chalk.blue(`Release state: ${state}`))
  const showNextVersion = state !== 'sync_pending'
  console.log(
    chalk.blue(
      showNextVersion ? `Current: ${latestTag} -> Next: ${nextVersion}` : `Current: ${latestTag}`,
    ),
  )

  switch (state) {
    case 'idle':
      return handleReleaseIdle(nextVersion)
    case 'release_ready':
      return handleReleaseReady(nextVersion)
    case 'release_open':
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handleReleaseOpen(openReleasePr!)
    case 'needs_tag':
      return handleNeedsTag(nextVersion)
    case 'sync_pending':
      return handleSyncPending(latestTag)
    default:
      return state satisfies never
  }
}

// ---------------------------------------------------------------------------
// Release fix handlers
// ---------------------------------------------------------------------------

// Cherry-picks selected develop commits onto the release branch with -x so
// patch-id matching works correctly for future releases.
const handleReleaseFix = async (): Promise<void> => {
  const openReleasePr = await findOpenPr('release', 'main')
  if (!openReleasePr) {
    return exit(chalk.red('No open release PR found. Release fix requires an open release PR.'))
  }
  console.log(chalk.blue(`Open release PR: #${openReleasePr.number} - ${openReleasePr.title}\n`))

  // Compare develop against release (not main) so commits already merged into release are excluded.
  const result = await pify(exec)(
    `git log --cherry-pick --right-only --no-merges --pretty=format:"%H %s" origin/release...origin/develop`,
  ).catch(() => '')
  const unreleased: UnreleasedCommit[] = !result.trim()
    ? []
    : result
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line: string) => {
          const spaceIdx = line.indexOf(' ')
          if (spaceIdx === -1) return { hash: line, message: '' }
          return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) }
        })
  if (unreleased.length === 0) return exit(chalk.red('No unreleased commits found on develop.'))

  console.log(chalk.green(`Found ${unreleased.length} unreleased commit(s).\n`))
  const selected = await inquireSelectCommits(
    unreleased,
    'Select commits to cherry-pick onto release:',
  )
  if (selected.length === 0)
    return exit(chalk.yellow('No commits selected. Release fix cancelled.'))

  console.log(chalk.blue('\nSelected commits:'))
  for (const c of selected) console.log(chalk.blue(`  ${c.hash.slice(0, 8)} ${c.message}`))

  if (!(await inquireConfirm('Cherry-pick these commits onto release?')))
    return exit('Release fix cancelled.')

  const shas = [...selected].reverse().map(c => c.hash)
  const worktreeDir = path.join(os.tmpdir(), `release-fix-${Date.now()}`)
  console.log(chalk.green('Cherry-picking commits onto release with -x...'))
  try {
    await pify(exec)(`git worktree add ${worktreeDir} origin/release`)
    const wt = git().cwd(worktreeDir)
    await wt.raw(['cherry-pick', '-x', ...shas])
    await wt.push(['origin', 'HEAD:refs/heads/release'])
  } catch (err) {
    await pify(exec)(`git worktree remove --force ${worktreeDir}`).catch(() => {})
    return exit(
      chalk.red(
        `Cherry-pick failed: ${
          err instanceof Error ? err.message : String(err)
        }\nResolve manually and re-run.`,
      ),
    )
  }
  await pify(exec)(`git worktree remove ${worktreeDir}`).catch(() => {})

  console.log(chalk.green('Release branch updated. The open release PR now includes the fix(es).'))
}

// ---------------------------------------------------------------------------
// Hotfix handlers
// ---------------------------------------------------------------------------

// idle: select commits from develop, cherry-pick onto a hotfix branch off main, push, and
// open the hotfix PR. With merge-commit releases, future regular releases automatically
// filter out hotfix commits via patch-id matching (see getUnreleasedCommits), so there's no
// need to also cherry-pick onto release.
const handleHotfixIdle = async (nextVersion: string): Promise<void> => {
  const unreleased = await getUnreleasedCommits()
  if (unreleased.length === 0) return exit(chalk.red('No unreleased commits found.'))

  console.log(chalk.green(`Found ${unreleased.length} unreleased commit(s).\n`))
  const selected = await inquireSelectCommits(
    unreleased,
    'Select commits to cherry-pick into the hotfix:',
  )
  if (selected.length === 0) return exit(chalk.yellow('No commits selected. Hotfix cancelled.'))

  console.log(chalk.blue('\nSelected commits:'))
  for (const c of selected) console.log(chalk.blue(`  ${c.hash.slice(0, 8)} ${c.message}`))

  if (!(await inquireConfirm('Create hotfix branch and PR?'))) return exit('Hotfix cancelled.')

  const hotfixBranch = `hotfix/${nextVersion}`
  // Reverse to chronological order: getUnreleasedCommits returns reverse-chronological (newest
  // first) per default git log order, but cherry-pick must apply oldest first when commits
  // have ordering dependencies.
  const shas = [...selected].reverse().map(c => c.hash)

  // Cherry-pick onto the hotfix branch (from main) in a worktree. Pre-clean any leftover
  // local branch from a prior failed run so retries are idempotent.
  const hotfixWorktree = path.join(os.tmpdir(), `hotfix-cherry-pick-${Date.now()}`)
  console.log(chalk.green(`Cherry-picking commits onto ${hotfixBranch}...`))
  try {
    await pify(exec)(`git branch -D ${hotfixBranch}`).catch(() => {})
    await pify(exec)(`git worktree add -b ${hotfixBranch} ${hotfixWorktree} origin/main`)
    const wt = git().cwd(hotfixWorktree)
    await wt.raw(['cherry-pick', ...shas])
    await wt.push(['-u', 'origin', hotfixBranch])
  } catch (err) {
    await pify(exec)(`git worktree remove --force ${hotfixWorktree}`).catch(() => {})
    await pify(exec)(`git branch -D ${hotfixBranch}`).catch(() => {})
    return exit(
      chalk.red(
        `Cherry-pick onto ${hotfixBranch} failed: ${
          err instanceof Error ? err.message : String(err)
        }\nHotfix branch deleted.`,
      ),
    )
  }
  await pify(exec)(`git worktree remove ${hotfixWorktree}`).catch(() => {})

  const prUrl = await createPr({
    base: 'main',
    head: hotfixBranch,
    title: `chore: hotfix ${nextVersion}`,
    body: `## Hotfix ${nextVersion}\n\n${selected.map(c => `- ${c.message}`).join('\n')}`,
  })
  if (!prUrl) return exit(chalk.red('Failed to create hotfix PR — no commits between branches.'))
  console.log(chalk.green(`Hotfix PR created: ${prUrl}`))
  console.log(
    chalk.green(
      'Hotfix PR is ready for review. Merge it manually after testing, then re-run this script to tag and sync.',
    ),
  )
}

// hotfix_open: a hotfix PR is already open — remind to merge manually.
const handleHotfixOpen = (pr: GitHubPr): void => {
  console.log(chalk.yellow(`Hotfix PR open: #${pr.number} - ${pr.title}`))
  console.log(
    chalk.green(
      'Hotfix PR is awaiting review. Merge it manually after testing, then re-run this script to tag and sync.',
    ),
  )
}

// ---------------------------------------------------------------------------
// Hotfix flow (state machine dispatcher)
// ---------------------------------------------------------------------------

const doHotfixRelease = async () => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = await getNextVersion('patch')

  const [mainSha, latestTagSha] = await Promise.all([getSha('origin/main'), getTagSha(latestTag)])

  const hotfixBranch = `hotfix/${nextVersion}`
  const [openHotfixPr, privateContentMatchesMain] = await Promise.all([
    findOpenPr(hotfixBranch, 'main'),
    git()
      .diff(['origin/main', 'origin/private'])
      .then(diff => !diff),
  ])

  const state = deriveHotfixState({
    mainSha,
    latestTagSha,
    privateContentMatchesMain,
    openHotfixPr,
  })

  console.log(chalk.blue(`Hotfix state: ${state}`))
  const showNextVersion = state === 'idle' || state === 'hotfix_open'
  console.log(
    chalk.blue(
      showNextVersion ? `Current: ${latestTag} -> Next: ${nextVersion}` : `Current: ${latestTag}`,
    ),
  )

  switch (state) {
    case 'idle':
      return handleHotfixIdle(nextVersion)
    case 'hotfix_open':
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handleHotfixOpen(openHotfixPr!)
    case 'needs_tag':
      return handleNeedsTag(nextVersion)
    case 'sync_pending':
      return handleSyncPending(latestTag)
    default:
      return state satisfies never
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  await assertGhInstalled()
  await assertGhAuth()
  await fetchOrigin()

  const type = await inquireReleaseType()
  switch (type) {
    case 'Regular':
      return doRegularRelease()
    case 'Hotfix':
      return doHotfixRelease()
    case 'Release fix':
      return handleReleaseFix()
    default:
      return type satisfies never
  }
}

main()
