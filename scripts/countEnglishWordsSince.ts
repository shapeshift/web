/* eslint-disable no-console */

// This script counts the words that were added or modified in the English app strings since
// a specific commit. Usually to find out the monthly count of words that have been requested
// for translation to our translators working for bounties over a period of time.
// For this use, choose the commit right after the last words that have already been paid out.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'
import util from 'util'

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Which revision sould we compare: ', commitId => {
  const currentFileContent = fs.readFileSync('src/assets/translations/en/main.json', 'utf8')
  const currentStrings = JSON.parse(currentFileContent)
  const previousFileContent = execSync(
    `git show ${commitId}:src/assets/translations/en/main.json`,
  ).toString()
  const previousStrings = JSON.parse(previousFileContent)
  const modifiedStrings = findModifiedStrings(previousStrings, currentStrings)
  console.log(`${util.inspect(modifiedStrings, { maxArrayLength: 1000 })}`)
  const wordCount = countWordsArray(modifiedStrings)

  console.log(`Total number of added/modified strings: ${modifiedStrings.length}`)
  console.log(`Total word count in added/modified strings: ${wordCount}`)

  rl.close()
})

function findModifiedStrings(prev: any, curr: any, path: string[] = []): string[] {
  const modifiedStrings: string[] = []
  for (const key in curr) {
    const newPath = [...path, key]
    if (typeof curr[key] === 'string') {
      if (!prev || !prev.hasOwnProperty(key) || prev[key] !== curr[key]) {
        modifiedStrings.push(curr[key])
      }
    } else {
      const nestedModifiedStrings = findModifiedStrings(prev?.[key] ?? null, curr[key], newPath)
      modifiedStrings.push(...nestedModifiedStrings)
    }
  }
  return modifiedStrings
}

function countWordsArray(strings: string[]): number {
  return strings.reduce((count, str) => count + countWords(str), 0)
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).length
}
