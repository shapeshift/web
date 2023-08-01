/* eslint-disable no-console */

// This script counts the words that are new or modified in the English app strings since
// a specific date or commit hash. Can be used to find the monthly count of words that have been
// requested for translation to our translators working for bounties over a period of time.
// For this use, choose the date/commit right after the last words that have already been paid out.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'
import util from 'util'

import type { StringRecord } from './utils'
import * as utils from './utils'

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

if (process.argv.length > 2) {
  let commitId = process.argv.splice(2, process.argv.length - 1).join(' ')
  commitId = utils.handleDateCommitHashInput(commitId)
  executeComparison(commitId)
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question('Since which date or commit hash should we compare: ', input => {
    let commitId = utils.handleDateCommitHashInput(input)
    executeComparison(commitId)
    rl.close()
  })
}

function executeComparison(commitId: string) {
  const currentFileContent = fs.readFileSync('src/assets/translations/en/main.json', 'utf8')
  const currentStrings: StringRecord = JSON.parse(currentFileContent)
  const previousFileContent = execSync(
    `git show ${commitId}:src/assets/translations/en/main.json`,
    { stdio: 'pipe' },
  ).toString()
  const previousStrings: StringRecord = JSON.parse(previousFileContent)
  const stringsToTranslate = utils.findStringsToTranslate(previousStrings, currentStrings)
  let newStringsCount = stringsToTranslate.filter(([_, status]) => status === 'new').length
  let modifiedStringsCount = stringsToTranslate.filter(
    ([_, status]) => status === 'modified',
  ).length
  let totalWordCount = utils.countWordsStringsToTranslate(stringsToTranslate)
  console.log(`${util.inspect(stringsToTranslate, { maxArrayLength: 1000 })}`)
  console.log(`Total number of new strings: ${newStringsCount}`)
  console.log(`Total number of modified strings: ${modifiedStringsCount}`)
  console.log(`Total word count of strings to translate: ${totalWordCount}`)
  if (modifiedStringsCount > 0) {
    console.log(
      `If you want to invalidate the modified strings run this command: yarn translations:invalidate-outdated ${commitId}`,
    )
  }
}
