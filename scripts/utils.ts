/* eslint-disable no-console */
// common CLI dev tool utils
import chalk from 'chalk'
import semver from 'semver'
import { simpleGit as git } from 'simple-git'

export const exit = (reason?: string) => Boolean(reason && console.log(reason)) || process.exit(0)

export const getLatestSemverTag = async (): Promise<string> => {
  const tags = await getSemverTags()
  const tag = tags.slice(-1)[0] // get the latest tag
  semver.valid(tag) || exit(chalk.red(`${tag} is not a valid semver tag.`))
  return tag
}

export const getHeadShortCommitHash = (): Promise<string> => git().revparse(['--short', 'HEAD'])

export const getSemverTags = async (): Promise<string[]> => {
  // safety in case we pick up other tags from other packages
  const WEB_VERSION_RANGES = '>1.0.0 <2.0.0'
  await git().fetch(['origin', '--tags', '--force'])
  const tags = await git().tags()
  const allTags: string[] = tags.all
  const validTags: string[] = allTags
    .filter(t => semver.valid(t))
    .filter(t => semver.satisfies(t, WEB_VERSION_RANGES))
  return validTags
}
