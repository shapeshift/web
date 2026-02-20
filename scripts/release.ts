// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import inquirer from 'inquirer' // do not upgrade to v9, as it does not support commonjs
import os from 'os'
import path from 'path'
import pify from 'pify'
import semver from 'semver'
import { simpleGit as git } from 'simple-git'

import { exit, getLatestSemverTag } from './utils'

const fetch = async () => {
  console.log(chalk.green('Fetching...'))
  await git().fetch(['origin', '--tags', '--force'])
}

export const assertIsCleanRepo = async () => {
  const gitStatus = await git().status()
  if (!gitStatus.isClean()) {
    console.log(chalk.red('Your repository is not clean. Please commit or stash your changes.'))
    exit()
  }
}

const releaseType = ['Regular', 'Hotfix'] as const
type ReleaseType = (typeof releaseType)[number]

const inquireReleaseType = async (): Promise<ReleaseType> => {
  const questions: inquirer.QuestionCollection<{ releaseType: ReleaseType }> = [
    {
      type: 'list',
      name: 'releaseType',
      message: 'What type of release is this?',
      choices: releaseType,
    },
  ]
  return (await inquirer.prompt(questions)).releaseType
}

const inquireCleanBranchOffMain = async (): Promise<boolean> => {
  const questions: inquirer.QuestionCollection<{ isCleanlyBranched: boolean }> = [
    {
      type: 'confirm',
      name: 'isCleanlyBranched',
      message: 'Is your branch cleanly branched off origin/main?',
      default: false, // Defaulting to false to encourage verification
    },
  ]
  const { isCleanlyBranched } = await inquirer.prompt(questions)
  return isCleanlyBranched
}

const inquireProceedWithCommits = async (commits: string[], action: 'create' | 'merge') => {
  console.log(chalk.blue(['', commits, ''].join('\n')))
  const message =
    action === 'create'
      ? 'Do you want to create a release with these commits?'
      : 'Do you want to merge and push these commits into main?'
  const questions: inquirer.QuestionCollection<{ shouldProceed: boolean }> = [
    {
      type: 'confirm',
      default: 'y',
      name: 'shouldProceed',
      message,
      choices: ['y', 'n'],
    },
  ]
  const { shouldProceed } = await inquirer.prompt(questions)
  if (!shouldProceed) exit('Release cancelled.')
}

const CLAUDE_TIMEOUT_MS = 120_000

const extractPrNumbers = (messages: string[]): number[] => {
  const prNumbers: number[] = []
  const prRegex = /\(#(\d+)\)\s*$/
  for (const msg of messages) {
    const match = msg.match(prRegex)
    if (match) prNumbers.push(Number(match[1]))
  }
  return Array.from(new Set(prNumbers))
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

const extractDescription = (prBody: string): string | undefined => {
  const descMatch = prBody.match(/## Description\s*\n([\s\S]*?)(?=\n## |$)/)
  if (!descMatch) return undefined
  const desc = descMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim()
  if (!desc || desc.length < 10) return undefined
  const MAX_DESC_LENGTH = 500
  return desc.length > MAX_DESC_LENGTH ? `${desc.slice(0, MAX_DESC_LENGTH)}...` : desc
}

const buildReleasePrompt = (
  version: string,
  messages: string[],
  prBodies: Map<number, string>,
): string => {
  const prRegex = /\(#(\d+)\)\s*$/
  const commitList = messages
    .map(msg => {
      const match = msg.match(prRegex)
      const prNum = match ? Number(match[1]) : null
      const body = prNum ? prBodies.get(prNum) : undefined
      const description = body ? extractDescription(body) : undefined
      const lines = [`- ${msg}`]
      if (description) lines.push(`  Context: ${description}`)
      return lines.join('\n')
    })
    .join('\n')

  return `You are a release notes generator for ShapeShift Web, a decentralized crypto exchange.

Given the commit list below for ${version}, produce grouped release notes in markdown.

## Rules

1. Group related commits under descriptive ## headings by feature domain (e.g. "TON chain + Stonfi swapper", "Yield improvements", "BigAmount migration")
2. List each commit as a bullet under its group, preserving the original text and PR number
3. After the bullet list, write 1-2 sentences summarizing what changed and what to test
4. For commits that are clearly behind a feature flag (title contains "behind feature flag" or "under flag"), note **under flag, no testing required**
5. For internal refactors with no user-facing changes (e.g. migrations, type changes, selector renames), note **regression testing only** and what to sanity-check
6. For dependency bumps, CI fixes, infra, docker, CSP, and asset data regeneration, group under "## Fixes, deps, and infra" with **no testing required**
7. Merge/backmerge commits (e.g. "Merge branch 'main' into develop") should be silently dropped
8. Keep testing notes brief and actionable - what a QA person should click on, not implementation details
9. Use present tense for summaries ("Enables TON chain" not "Enabled TON chain")
10. Do NOT use emdashes. Use regular hyphens.

## Commits

${commitList}`
}

const runClaude = (promptPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const promptStream = fs.createReadStream(promptPath)
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.CLAUDE_CODE_ENTRYPOINT
    delete env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

    const child = spawn('claude', ['-p', '--model', 'opus'], {
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

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Claude timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`))
    }, CLAUDE_TIMEOUT_MS)

    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim())
      } else {
        reject(
          new Error(`Claude exited with code ${code}${stderr ? `: ${stderr.slice(0, 200)}` : ''}`),
        )
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      reject(new Error(`Claude not available: ${err.message}`))
    })
  })
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

const createDraftRegularPR = async (): Promise<void> => {
  const { messages } = await getCommits('release')
  const nextVersion = await getNextReleaseVersion('minor')
  const title = `chore: release ${nextVersion}`

  console.log(chalk.green('Generating release summary...'))
  const prNumbers = extractPrNumbers(messages)
  console.log(chalk.green(`Found ${prNumbers.length} PR references, fetching context...`))

  const prBodies = prNumbers.length > 0 ? await fetchPrBodies(prNumbers) : new Map()
  console.log(chalk.green(`Fetched ${prBodies.size}/${prNumbers.length} PR descriptions.`))

  const summary = await generateReleaseSummary(nextVersion, messages, prBodies)
  const prBody = summary ?? messages.join('\n')

  if (summary) {
    console.log(chalk.green('AI summary generated successfully.'))
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shapeshift-release-body-'))
  const bodyPath = path.join(tmpDir, 'body.md')

  try {
    fs.writeFileSync(bodyPath, prBody, 'utf-8')
    const command = `gh pr create --draft --base "main" --title "${title}" --body-file "${bodyPath}"`
    console.log(chalk.green('Creating draft PR...'))
    await pify(exec)(command)
    console.log(chalk.green('Draft PR created.'))
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }

  exit(chalk.green(`Release ${nextVersion} created.`))
}

const createDraftHotfixPR = async (): Promise<void> => {
  const currentBranch = await git().revparse(['--abbrev-ref', 'HEAD'])
  const { messages } = await getCommits(currentBranch as GetCommitMessagesArgs)
  // TODO(0xdef1cafe): parse version bump from commit messages
  const formattedMessages = messages.map(m => m.replace(/"/g, '\\"'))
  const nextVersion = await getNextReleaseVersion('minor')
  const title = `chore: hotfix release ${nextVersion}`
  const command = `gh pr create --draft --base "main" --title "${title}" --body "${formattedMessages}"`
  console.log(chalk.green('Creating draft hotfix PR...'))
  await pify(exec)(command)
  console.log(chalk.green('Draft hotfix PR created.'))
  exit(chalk.green(`Hotfix release ${nextVersion} created.`))
}

type GetCommitMessagesArgs = 'develop' | 'release'
type GetCommitMessagesReturn = {
  messages: string[]
  total: number
}
type GetCommitMessages = (branch: GetCommitMessagesArgs) => Promise<GetCommitMessagesReturn>
const getCommits: GetCommitMessages = async branch => {
  // Get the last release tag
  const latestTag = await getLatestSemverTag()

  // If we have a last release tag, base the diff on that
  const range = latestTag ? `${latestTag}..origin/${branch}` : `origin/main..origin/${branch}`

  const { all, total } = await git().log([
    '--oneline',
    '--first-parent',
    '--pretty=format:%s', // no hash, just conventional commit style
    range,
  ])

  const messages = all.map(({ hash }) => hash)
  return { messages, total }
}

const assertCommitsToRelease = (total: number) => {
  if (!total) exit(chalk.red('No commits to release.'))
}

const doRegularRelease = async () => {
  const { messages, total } = await getCommits('develop')
  assertCommitsToRelease(total)
  await inquireProceedWithCommits(messages, 'create')
  console.log(chalk.green('Checking out develop...'))
  await git().checkout(['develop'])
  console.log(chalk.green('Pulling develop...'))
  await git().pull()
  console.log(chalk.green('Resetting release to develop...'))
  // **note** - most devs are familiar with lowercase -b to check out a new branch
  // capital -B will checkout and reset the branch to the current HEAD
  // so we can reuse the release branch, and force push over it
  // this is required as the fleek environment is pointed at this specific branch
  await git().checkout(['-B', 'release'])
  console.log(chalk.green('Force pushing release branch...'))
  await git().push(['--force', 'origin', 'release'])
  await createDraftRegularPR()
  exit()
}

const doHotfixRelease = async () => {
  const currentBranch = await git().revparse(['--abbrev-ref', 'HEAD'])
  const isMain = currentBranch === 'main'

  if (isMain) {
    console.log(
      chalk.red(
        'Cannot open hotfix PRs directly off local main branch for security reasons. Please branch out to another branch first.',
      ),
    )
    exit()
  }

  // Only continue if the branch is cleanly branched off origin/main since we will
  // target it in the hotfix PR
  const isCleanOffMain = await inquireCleanBranchOffMain()
  if (!isCleanOffMain) {
    exit(
      chalk.yellow(
        'Please ensure your branch is cleanly branched off origin/main before proceeding.',
      ),
    )
  }

  // Dev has confirmed they're clean off main, here goes nothing
  await fetch()

  // Force push current branch upstream so we can getCommits from it - getCommits uses upstream for diffing
  console.log(chalk.green(`Force pushing ${currentBranch} branch...`))
  await git().push(['-u', 'origin', currentBranch, '--force'])
  const { messages, total } = await getCommits(currentBranch as GetCommitMessagesArgs)
  assertCommitsToRelease(total)
  await inquireProceedWithCommits(messages, 'create')

  // Merge origin/main as a paranoia check
  console.log(chalk.green('Merging origin/main...'))
  await git().merge(['origin/main'])

  console.log(chalk.green('Setting release to current branch...'))
  await git().checkout(['-B', 'release'])

  console.log(chalk.green('Force pushing release branch...'))
  await git().push(['--force', 'origin', 'release'])

  console.log(chalk.green('Creating draft hotfix PR...'))
  await createDraftHotfixPR()

  exit(chalk.green('Hotfix release process completed.'))
}

type WebReleaseType = Extract<semver.ReleaseType, 'minor' | 'patch'>

const getNextReleaseVersion = async (versionBump: WebReleaseType): Promise<string> => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = semver.inc(latestTag, versionBump)
  if (!nextVersion) exit(chalk.red(`Could not bump version to ${nextVersion}`))
  return `v${nextVersion}`
}

const assertGhInstalled = async () => {
  try {
    await pify(exec)('hash gh') // will throw if gh is not installed
  } catch (e) {
    exit(chalk.red('Please install GitHub CLI https://github.com/cli/cli#installation'))
  }
}

const assertGhAuth = async () => {
  try {
    await pify(exec)('gh auth status') // will throw if gh not authenticated
  } catch (e) {
    exit(chalk.red((e as Error).message))
  }
}

const isReleaseInProgress = async (): Promise<boolean> => {
  const { total } = await getCommits('release')
  return Boolean(total)
}

const createRelease = async () => {
  ;(await inquireReleaseType()) === 'Regular' ? await doRegularRelease() : doHotfixRelease()
}

const mergeRelease = async () => {
  const { messages, total } = await getCommits('release')
  assertCommitsToRelease(total)
  await inquireProceedWithCommits(messages, 'merge')
  console.log(chalk.green('Checking out release...'))
  await git().checkout(['release'])
  console.log(chalk.green('Pulling release...'))
  await git().pull()
  console.log(chalk.green('Checking out main...'))
  await git().checkout(['main'])
  console.log(chalk.green('Pulling main...'))
  await git().pull()
  console.log(chalk.green('Merging release...'))
  await git().merge(['release'])
  const nextVersion = await getNextReleaseVersion('minor')
  console.log(chalk.green(`Tagging main with version ${nextVersion}`))
  await git().tag(['-a', nextVersion, '-m', nextVersion])
  console.log(chalk.green('Pushing main...'))
  await git().push(['origin', 'main', '--tags'])
  /**
   * we want private to track main, as Cloudflare builds with different env vars
   * based off the branch name, and there's in sufficient information with a single branch name.
   */
  console.log(chalk.green('Resetting private to main...'))
  await git().checkout(['-B', 'private'])
  console.log(chalk.green('Pushing private...'))
  await git().push(['--force', 'origin', 'private', '--tags'])
  console.log(chalk.green('Checking out develop...'))
  await git().checkout(['develop'])
  console.log(chalk.green('Pulling develop...'))
  await git().pull()
  console.log(chalk.green('Merging main back into develop...'))
  await git().merge(['main'])
  console.log(chalk.green('Pushing develop...'))
  await git().push(['origin', 'develop'])
  exit(chalk.green(`Release ${nextVersion} completed successfully.`))
}

const main = async () => {
  await assertIsCleanRepo()
  await assertGhInstalled()
  await assertGhAuth()
  await fetch()
  ;(await isReleaseInProgress()) ? await mergeRelease() : await createRelease()
}

main()
