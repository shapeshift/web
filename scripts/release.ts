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

const createDraftPR = async (): Promise<void> => {
  const nextVersion = await getNextReleaseVersion('patch')
  const title = `chore: release v${nextVersion} [DO NOT MERGE]`
  const { commitMessages } = await getCommitMessages()
  const command = `gh pr create --draft --base "main" --title "${title}" --body "${commitMessages}"`
  console.log(chalk.yellow(command))
}

type GetCommitMessagesReturn = {
  commitMessages: string[]
  total: number
}
type GetCommitMessages = () => Promise<GetCommitMessagesReturn>
const getCommitMessages: GetCommitMessages = async () => {
  const { all, total } = await simpleGit().log([
    '--oneline',
    '--first-parent',
    '--pretty=format:%s', // no hash, just conventional commit style
    'origin/main..origin/develop',
  ])

  if (total === 0) exit(chalk.red('No commits to release.'))

  const commitMessages = all.map(({ hash }) => hash)
  return { commitMessages, total }
}
const doRegularRelease = async () => {
  await fetch()
  const { commitMessages } = await getCommitMessages()
  console.log(chalk.blue(['', commitMessages, ''].join('\n')))
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

const main = async () => {
  // await assertIsCleanRepo()
  await assertGhInstalled()
  await createDraftPR()
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
