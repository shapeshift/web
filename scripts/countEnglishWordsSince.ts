/* eslint-disable no-console */

// This script counts the words that were added or modified in the English app strings since
// a specific commit. Usually to find out the monthly count of words that have been requested
// for translation to our translators working for bounties over a period of time.
// For this use, choose the commit right after the last words that have already been paid out.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'
import util from 'util'
interface StringRecord {
  [key: string]: string | StringRecord
}

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const countWordsArray = (strings: string[]): number =>
  strings.reduce((count, str) => count + countWords(str), 0)

const countWords = (str: string): number => {
  const trimmedStr = str.trim()
  return trimmedStr.length === 0 ? 0 : trimmedStr.split(/\s+/).length
}

rl.question('Which revision sould we compare: ', commitId => {
  const currentFileContent = fs.readFileSync('src/assets/translations/en/main.json', 'utf8')
  const currentStrings: StringRecord = JSON.parse(currentFileContent)
  const previousFileContent = execSync(
    `git show ${commitId}:src/assets/translations/en/main.json`,
  ).toString()
  const previousStrings: StringRecord = JSON.parse(previousFileContent)
  const modifiedStrings = findModifiedStrings(previousStrings, currentStrings)
  console.log(`${util.inspect(modifiedStrings, { maxArrayLength: 1000 })}`)
  const wordCount = countWordsArray(modifiedStrings)

  console.log(`Total number of added/modified strings: ${modifiedStrings.length}`)
  console.log(`Total word count in added/modified strings: ${wordCount}`)

  rl.close()
})

const findModifiedStrings = (prev: StringRecord, curr: StringRecord): string[] => {
  const modifiedStrings: string[] = []
  for (const key in curr) {
    const currentValue = curr[key]
    const previousValue = prev?.[key]
    if (typeof currentValue === 'string' && previousValue !== currentValue) {
      modifiedStrings.push(currentValue)
    } else if (typeof currentValue !== 'string' && typeof previousValue !== 'string') {
      const nestedModifiedStrings = findModifiedStrings(previousValue, currentValue)
      modifiedStrings.push(...nestedModifiedStrings)
    }
  }
  return modifiedStrings
}
