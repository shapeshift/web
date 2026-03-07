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
  | 'idle'
  | 'prerelease_pr_open'
  | 'release_pr_open'
  | 'merged_untagged'
  | 'tagged_private_stale'
  | 'done'

export type HotfixState =
  | 'idle'
  | 'hotfix_pr_open'
  | 'merged_untagged'
  | 'tagged_private_stale'
  | 'done'

type GitHubPr = {
  number: number
  title: string
}

type UnreleasedCommit = { hash: string; message: string }

const releaseType = ['Regular', 'Hotfix'] as const
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

export const parseEnvFeatureFlags = (content: string): Record<string, boolean> => {
  const flags: Record<string, boolean> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!key.startsWith('VITE_FEATURE_')) continue
    const value = rest.join('=').trim().toLowerCase()
    if (value === 'true') flags[key] = true
    else if (value === 'false') flags[key] = false
  }
  return flags
}

export const computeDevOnlyFlags = (
  baseContent: string,
  prodContent: string,
  devContent: string,
): string[] => {
  const baseFlags = parseEnvFeatureFlags(baseContent)
  const prodOverrides = parseEnvFeatureFlags(prodContent)
  const devOverrides = parseEnvFeatureFlags(devContent)

  const prodFlags: Record<string, boolean> = { ...baseFlags, ...prodOverrides }
  const devFlags: Record<string, boolean> = { ...baseFlags, ...devOverrides }

  const allKeys = new Set([...Object.keys(prodFlags), ...Object.keys(devFlags)])
  const devOnly: string[] = []
  for (const key of allKeys) {
    if (devFlags[key] === true && prodFlags[key] !== true) {
      devOnly.push(key.replace('VITE_FEATURE_', ''))
    }
  }
  return devOnly.sort()
}

export const computePrivateDisabledFlags = (
  baseContent: string,
  prodContent: string,
  privateContent: string,
): string[] => {
  const baseFlags = parseEnvFeatureFlags(baseContent)
  const prodOverrides = parseEnvFeatureFlags(prodContent)
  const privateOverrides = parseEnvFeatureFlags(privateContent)

  const prodFlags: Record<string, boolean> = { ...baseFlags, ...prodOverrides }
  const privateFlags: Record<string, boolean> = { ...baseFlags, ...privateOverrides }

  const allKeys = new Set([...Object.keys(prodFlags), ...Object.keys(privateFlags)])
  const privateDisabled: string[] = []
  for (const key of allKeys) {
    if (prodFlags[key] === true && privateFlags[key] !== true) {
      privateDisabled.push(key.replace('VITE_FEATURE_', ''))
    }
  }
  return privateDisabled.sort()
}

export const deriveReleaseState = ({
  releaseSha,
  mainSha,
  developSha,
  privateSha,
  latestTagSha,
  openPrereleasePr,
  openReleasePr,
}: {
  releaseSha: string
  mainSha: string
  developSha: string
  privateSha: string
  latestTagSha: string
  openPrereleasePr: GitHubPr | undefined
  openReleasePr: GitHubPr | undefined
}): ReleaseState => {
  if (openPrereleasePr) return 'prerelease_pr_open'

  if (openReleasePr) return 'release_pr_open'

  if (mainSha !== latestTagSha) return 'merged_untagged'

  if (privateSha !== mainSha) return 'tagged_private_stale'

  if (releaseSha === mainSha && developSha === mainSha) return 'done'

  return 'idle'
}

export const deriveHotfixState = ({
  mainSha,
  privateSha,
  latestTagSha,
  openHotfixPr,
}: {
  mainSha: string
  privateSha: string
  latestTagSha: string
  openHotfixPr: GitHubPr | undefined
}): HotfixState => {
  if (openHotfixPr) return 'hotfix_pr_open'
  if (mainSha !== latestTagSha) return 'merged_untagged'
  if (privateSha !== mainSha) return 'tagged_private_stale'
  return 'idle'
}

// ---------------------------------------------------------------------------
// AI release notes (kept from v1)
// ---------------------------------------------------------------------------

const CLAUDE_TIMEOUT_MS = 120_000

export const buildReleasePrompt = (
  version: string,
  messages: string[],
  prBodies: Map<number, string>,
  devOnlyFlags: string[],
  privateDisabledFlags: string[],
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

  const devOnlySection =
    devOnlyFlags.length > 0
      ? `\n\n## Dev-only feature flags (enabled in dev, disabled in production)\n\n${devOnlyFlags
          .map(f => `- ${f}`)
          .join('\n')}`
      : ''

  const privateDisabledSection =
    privateDisabledFlags.length > 0
      ? `\n\n## Private-build disabled flags (enabled in production, disabled in private build)\n\n${privateDisabledFlags
          .map(f => `- ${f}`)
          .join('\n')}`
      : ''

  return `You are a release notes generator for ShapeShift Web, a decentralized crypto exchange.

Given the commit list below for ${version}, produce grouped release notes in markdown with two clearly separated top-level sections.

## Rules

### Section 1: "# Production changes - testing required"
1. Contains all PRs/commits that affect production code paths
2. Group related commits under descriptive ## headings by feature domain (e.g. "TON chain + Stonfi swapper", "Yield improvements", "BigAmount migration")
3. List each commit as a bullet under its group, preserving the original text and PR number
4. After the bullet list, write 1-2 sentences summarizing what changed and what to test
5. For internal refactors with no user-facing changes (e.g. migrations, type changes, selector renames), note **regression testing only** and what to sanity-check
6. For dependency bumps, CI fixes, infra, docker, CSP, and asset data regeneration, group under "## Fixes, deps, and infra" with **no testing required**
7. If a commit relates to a feature listed in the private-build disabled flags below, append "**Note: disabled in private build.**" to its testing notes within the production section

### Section 2: "# Dev/local only - no production testing required"
8. Contains all PRs/commits that are gated behind dev-only feature flags listed below
9. Match commits to dev-only flags by feature name (e.g. "Celo" matches CELO, "agentic chat" matches AGENTIC_CHAT, "Mantle" matches MANTLE, "Across" matches ACROSS_SWAP, etc.)
10. Commits whose title explicitly says "behind feature flag" or "under flag" also belong here
11. Group by feature domain with brief description only - no testing notes needed since these are not visible in production

### General rules
12. Merge/backmerge commits (e.g. "Merge branch 'main' into develop") should be silently dropped
13. Keep testing notes brief and actionable - what a QA person should click on, not implementation details
14. Use present tense for summaries ("Enables TON chain" not "Enabled TON chain")
15. Do NOT use emdashes. Use regular hyphens.

## Commits

${commitList}${devOnlySection}${privateDisabledSection}`
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

const CLAUDE_ARGS = ['-p', '--model', 'opus', '--max-turns', '1']

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
  devOnlyFlags: string[],
  privateDisabledFlags: string[],
): Promise<string | null> => {
  const prompt = buildReleasePrompt(version, messages, prBodies, devOnlyFlags, privateDisabledFlags)
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
// Git/GitHub helpers (side effects)
// ---------------------------------------------------------------------------

const fetchOrigin = async () => {
  console.log(chalk.green('Fetching...'))
  await git().fetch(['origin', '--tags', '--force'])
}

const assertIsCleanRepo = async () => {
  const gitStatus = await git().status()
  if (!gitStatus.isClean()) {
    console.log(chalk.red('Your repository is not clean. Please commit or stash your changes.'))
    exit()
  }
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

const getCommitMessages = async (range: string): Promise<string[]> => {
  const result = await pify(exec)(`git log --first-parent --pretty=format:"%s" ${range}`)
  const stdout = typeof result === 'string' ? result : (result as { stdout: string }).stdout
  return stdout.trim().split('\n').filter(Boolean)
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

const getUnreleasedCommits = async (): Promise<UnreleasedCommit[]> => {
  const result = await pify(exec)(
    'git log --first-parent --pretty=format:"%H %s" origin/main..origin/develop',
  )
  const stdout = typeof result === 'string' ? result : (result as { stdout: string }).stdout

  if (!stdout.trim()) return []

  return stdout
    .trim()
    .split('\n')
    .map(line => {
      const spaceIdx = line.indexOf(' ')
      if (spaceIdx === -1) return { hash: line, message: '' }
      return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) }
    })
}

type WebReleaseType = Extract<semver.ReleaseType, 'minor' | 'patch'>

const getNextVersion = async (bump: WebReleaseType): Promise<string> => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = semver.inc(latestTag, bump)
  if (!nextVersion) exit(chalk.red(`Could not bump version to ${nextVersion}`))
  return `v${nextVersion}`
}

const findOpenPr = async (head: string, base: string): Promise<GitHubPr | undefined> => {
  const result = await pify(exec)(
    `gh pr list --repo shapeshift/web --head ${head} --base ${base} --state open --json number,title --jq '.[0]'`,
  )
  const stdout = typeof result === 'string' ? result : (result as { stdout: string }).stdout
  const trimmed = stdout.trim()
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
}): Promise<string> => {
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
    const stdout = typeof result === 'string' ? result : (result as { stdout: string }).stdout
    return stdout.trim()
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

const readEnvFile = (filename: string): string => {
  const filePath = path.resolve(__dirname, '..', filename)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
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

const inquireSelectCommits = async (commits: UnreleasedCommit[]): Promise<UnreleasedCommit[]> => {
  const { selected } = await inquirer.prompt<{ selected: string[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select commits to cherry-pick into the hotfix:',
      choices: commits.map(c => ({
        name: `${c.hash.slice(0, 8)} ${c.message}`,
        value: c.hash,
      })),
    },
  ])
  return commits.filter(c => selected.includes(c.hash))
}

// ---------------------------------------------------------------------------
// Regular release flow (idempotent state machine)
// ---------------------------------------------------------------------------

const doRegularRelease = async () => {
  const nextVersion = await getNextVersion('minor')
  const latestTag = await getLatestSemverTag()

  const [releaseSha, mainSha, developSha, privateSha, latestTagSha] = await Promise.all([
    getSha('origin/release'),
    getSha('origin/main'),
    getSha('origin/develop'),
    getSha('origin/private'),
    getTagSha(latestTag),
  ])

  const [openPrereleasePr, openReleasePr] = await Promise.all([
    findOpenPr('develop', 'release'),
    findOpenPr('release', 'main'),
  ])

  const state = deriveReleaseState({
    releaseSha,
    mainSha,
    developSha,
    privateSha,
    latestTagSha,
    openPrereleasePr,
    openReleasePr,
  })

  console.log(chalk.blue(`Release state: ${state}`))
  console.log(chalk.blue(`Current: ${latestTag} -> Next: ${nextVersion}`))

  switch (state) {
    case 'idle': {
      // Two sub-states within idle:
      // 1. Release branch ahead of main (prerelease merged) -> create release -> main PR
      // 2. Release branch matches main (fresh start) -> create develop -> release PR
      const prereleaseMerged = releaseSha !== mainSha

      if (prereleaseMerged) {
        const messages = await getCommitMessages(`${latestTag}..origin/release`)
        if (messages.length === 0) exit(chalk.red('No commits to release.'))

        console.log(chalk.green(`${messages.length} commits ready on release branch.`))
        console.log(chalk.green('Generating AI release summary...'))

        const prNumbers = extractPrNumbers(messages)
        console.log(chalk.green(`Found ${prNumbers.length} PR references, fetching context...`))

        const prBodies =
          prNumbers.length > 0 ? await fetchPrBodies(prNumbers) : new Map<number, string>()
        console.log(chalk.green(`Fetched ${prBodies.size}/${prNumbers.length} PR descriptions.`))

        const devOnlyFlags = computeDevOnlyFlags(
          readEnvFile('.env'),
          readEnvFile('.env.production'),
          readEnvFile('.env.development'),
        )
        const privateDisabledFlags = computePrivateDisabledFlags(
          readEnvFile('.env'),
          readEnvFile('.env.production'),
          readEnvFile('.env.private'),
        )
        console.log(
          chalk.green(
            `Detected ${devOnlyFlags.length} dev-only flags, ${privateDisabledFlags.length} private-disabled flags.`,
          ),
        )

        const summary = await generateReleaseSummary(
          nextVersion,
          messages,
          prBodies,
          devOnlyFlags,
          privateDisabledFlags,
        )
        const releaseBody = summary ?? messages.join('\n')

        if (summary) console.log(chalk.green('AI summary generated successfully.\n'))
        console.log(chalk.blue(['', releaseBody, ''].join('\n')))

        if (!(await inquireConfirm('Create release PR with this body?'))) exit('Release cancelled.')

        console.log(chalk.green('Creating release PR (release -> main)...'))
        const releasePrUrl = await createPr({
          base: 'main',
          head: 'release',
          title: `chore: release ${nextVersion}`,
          body: releaseBody,
        })
        console.log(chalk.green(`Release PR created: ${releasePrUrl}`))
        console.log(
          chalk.green(
            '\nMerge the release PR on GitHub when CI passes, then run this script again.',
          ),
        )
      } else {
        const messages = await getCommitMessages(`${latestTag}..origin/develop`)
        if (messages.length === 0) exit(chalk.red('No commits to release.'))

        console.log(chalk.green(`${messages.length} commits to release.`))
        const commitList = messages.map(m => `- ${m}`).join('\n')

        if (!(await inquireConfirm(`Create prerelease PR with ${messages.length} commits?`)))
          exit('Release cancelled.')

        console.log(chalk.green('Creating prerelease PR (develop -> release)...'))
        const prereleasePrUrl = await createPr({
          base: 'release',
          head: 'develop',
          title: `chore: prerelease ${nextVersion}`,
          body: `## Prerelease ${nextVersion}\n\n${commitList}`,
        })
        console.log(chalk.green(`Prerelease PR created: ${prereleasePrUrl}`))
        console.log(
          chalk.green(
            '\nMerge the prerelease PR on GitHub, then run this script again to create the release PR.',
          ),
        )
      }
      break
    }

    case 'prerelease_pr_open': {
      if (!openPrereleasePr) break
      console.log(
        chalk.yellow(
          `Prerelease PR is open: #${openPrereleasePr.number} - ${openPrereleasePr.title}`,
        ),
      )
      console.log(
        chalk.yellow('Merge it on GitHub, then run this script again to create the release PR.'),
      )
      break
    }

    case 'release_pr_open': {
      if (!openReleasePr) break
      console.log(
        chalk.yellow(`Release PR is open: #${openReleasePr.number} - ${openReleasePr.title}`),
      )
      console.log(chalk.yellow('Merge it on GitHub, then run this script again to finalize.'))
      break
    }

    case 'merged_untagged': {
      console.log(chalk.green(`Release merged to main. Tagging ${nextVersion}...`))
      await git().checkout(['main'])
      await git().pull()
      await git().tag(['-a', nextVersion, '-m', nextVersion])
      console.log(chalk.green('Pushing tag...'))
      await git().push(['origin', '--tags'])
      console.log(chalk.green(`Tagged ${nextVersion}.`))

      console.log(chalk.green('Creating PR to sync private to main...'))
      const privatePrUrl = await createPr({
        base: 'private',
        head: 'main',
        title: `chore: sync private to ${nextVersion}`,
        body: `Sync private branch to main after release ${nextVersion}.`,
      })
      console.log(chalk.green(`Private sync PR created: ${privatePrUrl}`))
      console.log(chalk.green('Merge it on GitHub to complete the release.'))
      break
    }

    case 'tagged_private_stale': {
      console.log(chalk.yellow(`${nextVersion} is tagged but private is behind main.`))

      const existingPrivatePr = await findOpenPr('main', 'private')
      if (existingPrivatePr) {
        console.log(
          chalk.yellow(
            `Private sync PR already open: #${existingPrivatePr.number}. Merge it on GitHub.`,
          ),
        )
      } else {
        console.log(chalk.green('Creating PR to sync private to main...'))
        const privatePrUrl = await createPr({
          base: 'private',
          head: 'main',
          title: `chore: sync private to ${nextVersion}`,
          body: `Sync private branch to main after release ${nextVersion}.`,
        })
        console.log(chalk.green(`Private sync PR created: ${privatePrUrl}`))
      }
      break
    }

    case 'done': {
      console.log(chalk.green(`Release ${latestTag} is fully complete. Nothing to do.`))
      break
    }

    default:
      break
  }
}

// ---------------------------------------------------------------------------
// Hotfix release flow (idempotent state machine)
// ---------------------------------------------------------------------------

const doHotfixRelease = async () => {
  const nextVersion = await getNextVersion('patch')
  const latestTag = await getLatestSemverTag()

  const [mainSha, privateSha, latestTagSha] = await Promise.all([
    getSha('origin/main'),
    getSha('origin/private'),
    getTagSha(latestTag),
  ])

  const hotfixBranch = `hotfix/${nextVersion}`
  const openHotfixPr = await findOpenPr(hotfixBranch, 'main')

  const state = deriveHotfixState({
    mainSha,
    privateSha,
    latestTagSha,
    openHotfixPr,
  })

  console.log(chalk.blue(`Hotfix state: ${state}`))
  console.log(chalk.blue(`Current: ${latestTag} -> Next: ${nextVersion}`))

  switch (state) {
    case 'idle': {
      const unreleased = await getUnreleasedCommits()
      if (unreleased.length === 0) {
        exit(chalk.red('No unreleased commits found between origin/main and origin/develop.'))
      }

      console.log(chalk.green(`Found ${unreleased.length} unreleased commit(s).\n`))
      const selected = await inquireSelectCommits(unreleased)
      if (selected.length === 0) exit(chalk.yellow('No commits selected. Hotfix cancelled.'))

      console.log(chalk.blue('\nSelected commits:'))
      for (const c of selected) {
        console.log(chalk.blue(`  ${c.hash.slice(0, 8)} ${c.message}`))
      }

      if (!(await inquireConfirm('Create hotfix branch and PR?'))) exit('Hotfix cancelled.')

      console.log(chalk.green('Checking out main...'))
      await git().checkout(['main'])
      await git().pull()

      console.log(chalk.green(`Creating branch ${hotfixBranch}...`))
      await git().checkout(['-b', hotfixBranch])

      const cherryPickOrder = [...selected].reverse()
      for (const c of cherryPickOrder) {
        console.log(chalk.green(`Cherry-picking ${c.hash.slice(0, 8)} ${c.message}...`))
        try {
          await pify(exec)(`git cherry-pick ${c.hash}`)
        } catch (err) {
          try {
            await pify(exec)('git cherry-pick --abort')
          } catch {
            // no-op
          }
          await git().checkout(['main'])
          await pify(exec)(`git branch -D ${hotfixBranch}`)
          const message = err instanceof Error ? err.message : String(err)
          exit(
            chalk.red(
              `Cherry-pick failed for ${c.hash.slice(0, 8)}: ${message}\nHotfix branch deleted.`,
            ),
          )
        }
      }

      console.log(chalk.green(`Pushing ${hotfixBranch}...`))
      await git().push(['-u', 'origin', hotfixBranch])

      const commitList = selected.map(c => `- ${c.message}`).join('\n')
      const prUrl = await createPr({
        base: 'main',
        head: hotfixBranch,
        title: `chore: hotfix ${nextVersion}`,
        body: `## Hotfix ${nextVersion}\n\n${commitList}`,
      })

      console.log(chalk.green(`Hotfix PR created: ${prUrl}`))
      console.log(chalk.green('Merge it on GitHub, then run this script again to finalize.'))
      break
    }

    case 'hotfix_pr_open': {
      if (!openHotfixPr) break
      console.log(
        chalk.yellow(`Hotfix PR is open: #${openHotfixPr.number} - ${openHotfixPr.title}`),
      )
      console.log(chalk.yellow('Merge it on GitHub, then run this script again to finalize.'))
      break
    }

    case 'merged_untagged': {
      console.log(chalk.green(`Hotfix merged to main. Tagging ${nextVersion}...`))
      await git().checkout(['main'])
      await git().pull()
      await git().tag(['-a', nextVersion, '-m', nextVersion])
      console.log(chalk.green('Pushing tag...'))
      await git().push(['origin', '--tags'])
      console.log(chalk.green(`Tagged ${nextVersion}.`))

      console.log(chalk.green('Creating PR to sync private to main...'))
      const privatePrUrl = await createPr({
        base: 'private',
        head: 'main',
        title: `chore: sync private to ${nextVersion}`,
        body: `Sync private branch to main after hotfix ${nextVersion}.`,
      })
      console.log(chalk.green(`Private sync PR created: ${privatePrUrl}`))

      console.log(chalk.green('Creating backmerge PR (main -> develop)...'))
      const backmergeUrl = await createPr({
        base: 'develop',
        head: 'main',
        title: `chore: backmerge ${nextVersion} into develop`,
        body: `Backmerge main into develop after hotfix ${nextVersion} to sync cherry-picked commits.`,
      })
      console.log(chalk.green(`Backmerge PR created: ${backmergeUrl}`))
      console.log(chalk.green('Merge both PRs on GitHub to complete the hotfix.'))
      break
    }

    case 'tagged_private_stale': {
      console.log(chalk.yellow(`${nextVersion} is tagged but private is behind main.`))

      const existingPrivatePr = await findOpenPr('main', 'private')
      if (existingPrivatePr) {
        console.log(
          chalk.yellow(
            `Private sync PR already open: #${existingPrivatePr.number}. Merge it on GitHub.`,
          ),
        )
      } else {
        console.log(chalk.green('Creating PR to sync private to main...'))
        const privatePrUrl = await createPr({
          base: 'private',
          head: 'main',
          title: `chore: sync private to ${nextVersion}`,
          body: `Sync private branch to main after hotfix ${nextVersion}.`,
        })
        console.log(chalk.green(`Private sync PR created: ${privatePrUrl}`))
      }

      const existingBackmerge = await findOpenPr('main', 'develop')
      if (!existingBackmerge) {
        const mainDevelopDiff = await getCommitMessages('origin/develop..origin/main')
        if (mainDevelopDiff.length > 0) {
          console.log(chalk.green('Creating backmerge PR (main -> develop)...'))
          const backmergeUrl = await createPr({
            base: 'develop',
            head: 'main',
            title: `chore: backmerge ${nextVersion} into develop`,
            body: `Backmerge main into develop after hotfix ${nextVersion}.`,
          })
          console.log(chalk.green(`Backmerge PR created: ${backmergeUrl}`))
        }
      }
      break
    }

    case 'done': {
      console.log(chalk.green(`Hotfix ${latestTag} is fully complete. Nothing to do.`))
      break
    }

    default:
      break
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  await assertIsCleanRepo()
  await assertGhInstalled()
  await assertGhAuth()
  await fetchOrigin()

  const type = await inquireReleaseType()
  type === 'Regular' ? await doRegularRelease() : await doHotfixRelease()
}

main()
