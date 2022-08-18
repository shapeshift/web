// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import inquirer from 'inquirer' // do not upgrade to v9, not compatible with ts-node
import { simpleGit } from 'simple-git'

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

const doRegularRelease = async () => {
  const { all, total } = await simpleGit().log([
    '--oneline',
    '--first-parent',
    'origin/main..origin/develop',
  ])

  if (total === 0) exit(chalk.red('No commits to release.'))

  console.log(chalk.green(`Found ${total} commit${total > 1 ? 's' : ''} to release:`))
  const commitMessages = all.map(({ hash }) => hash).join('\n')
  console.log(chalk.blue(commitMessages))
  const shouldProceed = await inquireProceedWithCommits()
  if (!shouldProceed) exit('Release cancelled.')
  console.log(chalk.green('Checking out develop...'))
  await simpleGit().checkout('develop')
  console.log(chalk.green('Resetting release to develop...'))
  await simpleGit().checkout(['-B', 'release']) // reset release to develop
  exit()
}

const doHotfixRelease = async () => {
  exit(chalk.yellow('Unimplemented. PRs welcome!'))
}

const main = async () => {
  // await assertIsCleanRepo()
  const releaseType = await inquireReleaseType()
  await fetch()
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
