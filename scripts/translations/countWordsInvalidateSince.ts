/* eslint-disable no-console */

// This script counts the words that are new or modified in the English app strings since
// a specific date or commit hash. Can be used to find the monthly count of words that have been
// requested for translation to our translators working for bounties over a period of time.
// For this use, choose the date/commit right after the last words that have already been paid out.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'

import type { StringRecord, StringToTranslate } from './utils'
import * as utils from './utils'

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

if (process.argv.length > 2) {
  // Merge all arguments as one
  let args = process.argv.splice(2, process.argv.length - 1).join(' ')
  let commitHash = utils.handleDateCommitHashInput(args)
  executeComparison(commitHash)
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question('Since which date or commit hash should we compare: ', input => {
    rl.close()
    let commitHash = utils.handleDateCommitHashInput(input)
    executeComparison(commitHash)
  })
}

function executeComparison(commitHash: string) {
  const currentFileContent = fs.readFileSync('src/assets/translations/en/main.json', 'utf8')
  const currentStrings: StringRecord = JSON.parse(currentFileContent)
  const previousFileContent = execSync(
    `git show ${commitHash}:src/assets/translations/en/main.json`,
    { stdio: 'pipe' },
  ).toString()
  const previousStrings: StringRecord = JSON.parse(previousFileContent)
  const stringsToTranslate: StringToTranslate[] = utils.findStringsToTranslate(
    previousStrings,
    currentStrings,
  )
  let newStringsCount = stringsToTranslate.filter(str => str.status === 'new').length
  let modifiedStrings = stringsToTranslate.filter(str => str.status === 'modified')
  let modifiedStringsCount = modifiedStrings.length
  let totalWordCount = utils.countWordsStringsToTranslate(stringsToTranslate)
  utils.outputStringsToTranslate(stringsToTranslate)
  console.log(`\nTotal number of new strings: ${newStringsCount}`)
  console.log(`Total number of modified strings: ${modifiedStringsCount}`)
  console.log(`Total word count of strings to translate: ${totalWordCount}`)

  // Handle strings invalidation if needed.
  if (modifiedStringsCount > 0) {
    handleModifiedStringsInalidation(modifiedStrings)
  }
}

function handleModifiedStringsInalidation(strings: StringToTranslate[]) {
  console.log(`\nModified strings invalidation:`)
  utils.outputStringsToTranslate(strings)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question(
    `\nRemove the ${strings.length} modified strings above from the translations files in all languages [Yes, Default: No] ? `,
    (choiceDelete: string) => {
      rl.close()
      if (['yes', 'y'].includes(choiceDelete.toLowerCase())) {
        // Loop through all the other languages' JSON files and delete modified properties
        const languagesDir = 'src/assets/translations'
        const languageDirs = fs
          .readdirSync(languagesDir)
          .filter(dir => dir !== 'en' && fs.statSync(`${languagesDir}/${dir}`).isDirectory())
        for (const languageDir of languageDirs) {
          const languageFilePath = `${repoPath}/${languagesDir}/${languageDir}/main.json`
          const languageJSON = utils.loadJSONFile(languageFilePath)
          for (const modifiedString of strings) {
            if (utils.deletePropertyByPath(languageJSON, modifiedString.dottedPath)) {
              console.log(`Deleted ${modifiedString.dottedPath} from ${languageFilePath}`)
            }
          }
          utils.saveJSONFile(languageFilePath, languageJSON)
        }
      } else {
        console.log('No string invalidated.')
      }
    },
  )
}
