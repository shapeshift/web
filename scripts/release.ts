// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import gitSemverTags from 'git-semver-tags'
import inquirer from 'inquirer' // do not upgrade to v9, not compatible with ts-node
import pify from 'pify'
import semver from 'semver'
import { simpleGit } from 'simple-git'
const { exec } = require('child_process')

const exit = (reason?: string) => Boolean(reason && console.log(reason)) || process.exit(0)

const fetch = async () => {
  console.log(chalk.green('Fetching...'))
  await simpleGit().fetch('origin')
}

export const assertIsCleanRepo = async () => {
  const gitStatus = await simpleGit().status()
  if (!gitStatus.isClean()) {
    console.log(chalk.red('Your repository is not clean. Please commit or stash your changes.'))
    exit()
  }
}

const releaseType = ['Regular', 'Hotfix'] as const
type ReleaseType = keyof typeof releaseType

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

const inquireProceedWithCommits = async (): Promise<boolean> => {
  const questions: inquirer.QuestionCollection<{ shouldProceed: boolean }> = [
    {
      type: 'confirm',
      default: 'y',
      name: 'shouldProceed',
      message: 'Do you want to create a release with these commits?',
      choices: ['y', 'n'],
    },
  ]
  return (await inquirer.prompt(questions)).shouldProceed
}

export const createDraftPR = async (): Promise<void> => {
  // TODO(0xdef1cafe): parse version bump from commit messages
  const nextVersion = await getNextReleaseVersion('patch')
  const title = `chore: release v${nextVersion} [DO NOT MERGE]`
  const { messages } = await getCommits('develop')
  const command = `gh pr create --draft --base "main" --title "${title}" --body "${messages}"`
  console.log(chalk.yellow(command))
}

type GetCommitMessagesArgs = 'develop' | 'release'
type GetCommitMessagesReturn = {
  messages: string[]
  total: number
}
type GetCommitMessages = (args: GetCommitMessagesArgs) => Promise<GetCommitMessagesReturn>
const getCommits: GetCommitMessages = async branch => {
  const { all, total } = await simpleGit().log([
    '--oneline',
    '--first-parent',
    '--pretty=format:%s', // no hash, just conventional commit style
    `origin/main..origin/${branch}`,
  ])

  const messages = all.map(({ hash }) => hash)
  return { messages, total }
}
const doRegularRelease = async () => {
  await fetch()
  const { messages, total } = await getCommits('develop')
  if (total === 0) exit(chalk.red('No commits to release.'))
  console.log(chalk.blue(['', messages, ''].join('\n')))
  const shouldProceed = await inquireProceedWithCommits()
  if (!shouldProceed) exit('Release cancelled.')
  console.log(chalk.green('Checking out develop...'))
  await simpleGit().checkout(['develop'])
  console.log(chalk.green('Pulling develop...'))
  await simpleGit().pull()
  console.log(chalk.green('Resetting release to develop...'))
  await simpleGit().checkout(['-B', 'release']) // reset release to develop
  console.log(chalk.green('Force pushing release...'))
  const result = await simpleGit().push(['--dry-run', '--force', 'origin', 'release'])
  console.log(JSON.stringify(result, null, 2))
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
  const result = Boolean(total)
  console.log(result)
  return result
}

const main = async () => {
  // await assertIsCleanRepo()
  await assertGhInstalled()
  await isReleaseInProgress()
  exit('remove')
  const releaseType = await inquireReleaseType()
  switch (releaseType) {
    case 'Regular': {
      await doRegularRelease()
      break
    }
    case 'Hotfix': {
      await doHotfixRelease()
      break
    }
    default: {
      exit()
    }
  }
}

main()
