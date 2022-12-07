/* eslint-disable no-console */
// common CLI dev tool utils
import chalk from 'chalk' // do not upgrade to v5, not compatible with ts-node
import gitSemverTags from 'git-semver-tags'
import pify from 'pify'
import semver from 'semver'
import { simpleGit as git } from 'simple-git'

export const exit = (reason?: string) => Boolean(reason && console.log(reason)) || process.exit(0)

export const getLatestSemverTag = async (): Promise<string> => {
  const tags = await getSemverTags()
  const tag = tags[0]
  semver.valid(tag) || exit(chalk.red(`${tag} is not a valid semver tag.`))
  return tags[0]
}

export const getHeadShortCommitHash = async (): Promise<string> =>
  git().revparse(['--short', 'HEAD'])

export const getSemverTags = async (): Promise<string[]> => {
  const tags = await pify(gitSemverTags)()
  if (!tags.length) exit(chalk.red('No semver release tags found.'))
  return tags
}
