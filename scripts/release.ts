// CLI dev tool, we need dat console
/* eslint-disable no-console */
import chalk from 'chalk'
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

const main = async () => {
  // await assertIsCleanRepo()
  await fetch()
}

main()
