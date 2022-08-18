// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import inquirer from 'inquirer' // do not upgrade to v9, not compatible with ts-node
import { simpleGit } from 'simple-git'

const exit = () => process.exit(0)

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

const doRegularRelease = async () => {
  // git log --oneline --first-parent "origin/main".."origin/releases/$2"
  const mergedPRs = await simpleGit().log([
    '--oneline',
    '--first-parent',
    'origin/main..origin/develop',
  ])
  console.log(chalk.white(mergedPRs))
  // console.log(chalk.green('Checking out develop...'))
  // await simpleGit().checkout('develop')
  // await simpleGit().checkout(['-B', 'release']) // reset release to develop
  exit()
}

const doHotfixRelease = async () => {
  console.log(chalk.yellow('Unimplemented. PRs welcome!'))
  exit()
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
