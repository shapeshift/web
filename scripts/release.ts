// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import { exec } from 'child_process'
import gitSemverTags from 'git-semver-tags'
import inquirer from 'inquirer' // do not upgrade to v9, not compatible with ts-node
import pify from 'pify'
import semver from 'semver'
import { simpleGit as git } from 'simple-git'

const exit = (reason?: string) => Boolean(reason && console.log(reason)) || process.exit(0)

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
type ReleaseType = typeof releaseType[number]

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

const inquireProceedWithCommits = async (commits: string[]) => {
  console.log(chalk.blue(['', commits, ''].join('\n')))
  const questions: inquirer.QuestionCollection<{ shouldProceed: boolean }> = [
    {
      type: 'confirm',
      default: 'y',
      name: 'shouldProceed',
      message: 'Do you want to create a release with these commits?',
      choices: ['y', 'n'],
    },
  ]
  const { shouldProceed } = await inquirer.prompt(questions)
  if (!shouldProceed) exit('Release cancelled.')
}

const createDraftPR = async (): Promise<void> => {
  const { messages } = await getCommits('release')
  // TODO(0xdef1cafe): parse version bump from commit messages
  const nextVersion = await getNextReleaseVersion('minor')
  const title = `chore: release v${nextVersion} [DO NOT MERGE]`
  const command = `gh pr create --draft --base "main" --title "${title}" --body "${messages}"`
  console.log(chalk.green('Creating draft PR...'))
  await pify(exec)(command)
  console.log(chalk.green('Draft PR created.'))
  exit(chalk.green(`Release ${nextVersion} created.`))
}

type GetCommitMessagesArgs = 'develop' | 'release'
type GetCommitMessagesReturn = {
  messages: string[]
  total: number
}
type GetCommitMessages = (branch: GetCommitMessagesArgs) => Promise<GetCommitMessagesReturn>
const getCommits: GetCommitMessages = async branch => {
  const { all, total } = await git().log([
    '--oneline',
    '--first-parent',
    '--pretty=format:%s', // no hash, just conventional commit style
    `origin/main..origin/${branch}`,
  ])

  const messages = all.map(({ hash }) => hash)
  return { messages, total }
}

const assertCommitsToRelease = (total: number) => {
  if (!total) exit(chalk.red('No commits to release.'))
}

const doRegularRelease = async () => {
  await fetch()
  const { messages, total } = await getCommits('develop')
  assertCommitsToRelease(total)
  await inquireProceedWithCommits(messages)
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
  await createDraftPR()
  exit()
}

const doHotfixRelease = async () => {
  exit(chalk.yellow('Unimplemented. PRs welcome!'))
  // TODO(0xdef1cafe): implement hotfix release
  // 1. ask if we want to merge currently checked out branch to main
  // 2. set release to current branch
  // 3. force push release to origin
  // 4. create draft PR
}

const getSemverTags = async (): Promise<string[]> => {
  const tags = await pify(gitSemverTags)()
  if (!tags.length) exit(chalk.red('No semver release tags found.'))
  return tags
}

const getLatestSemverTag = async (): Promise<string> => {
  const tags = await getSemverTags()
  const tag = tags[0]
  semver.valid(tag) || exit(chalk.red(`${tag} is not a valid semver tag.`))
  return tags[0]
}

type WebReleaseType = Extract<semver.ReleaseType, 'minor' | 'patch'>

const getNextReleaseVersion = async (versionBump: WebReleaseType): Promise<string> => {
  const latestTag = await getLatestSemverTag()
  const nextVersion = semver.inc(latestTag, versionBump)
  if (!nextVersion) exit(chalk.red(`Could not bump version to ${nextVersion}`))
  return nextVersion!
}

const assertGhInstalled = async () => {
  try {
    await pify(exec)('hash gh') // will throw if gh is not installed
  } catch (e) {
    exit(chalk.red('Please install GitHub CLI https://github.com/cli/cli#installation'))
  }
}

const isReleaseInProgress = async (): Promise<boolean> => {
  const { total } = await getCommits('release')
  return Boolean(total)
}

const createRelease = async () => {
  ;(await inquireReleaseType()) === 'Regular' ? await doRegularRelease() : await doHotfixRelease()
}

const mergeRelease = async () => {
  await fetch()
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
  // TODO(0xdef1cafe): remove --dry-run
  await git().push(['--dry-run', 'origin', 'main', '--tags'])
  console.log(chalk.green('Checking out develop...'))
  await git().checkout(['develop'])
  console.log(chalk.green('Pulling develop...'))
  await git().pull()
  console.log(chalk.green('Merging main back into develop...'))
  await git().merge(['main'])
  console.log(chalk.green('Pushing develop...'))
  // TODO(0xdef1cafe): remove --dry-run
  await git().push(['--dry-run', 'origin', 'develop'])
  exit(chalk.green(`Release ${nextVersion} completed successfully.`))
}

const main = async () => {
  await assertIsCleanRepo()
  await assertGhInstalled()
  ;(await isReleaseInProgress()) ? await mergeRelease() : await createRelease()
}

main()
