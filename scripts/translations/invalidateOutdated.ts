/* eslint-disable no-console */

// This script removes translations from all the non-English translation JSON files for
// entries which have been modified in English since a specific Git revision.
// The new and deleted English copies are ignored as they will be automatically handled
// by Gitlocalize, our translation platform.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'

import * as utils from './utils'

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let commitId: string
if (process.argv.length > 2) {
  let commitId = process.argv.splice(2, process.argv.length - 1).join(' ')
  commitId = utils.handleDateCommitHashInput(commitId)
  executeComparison(commitId)
} else {
  rl.question('Since which date or commit hash should we compare: ', input => {
    commitId = utils.handleDateCommitHashInput(input)
    executeComparison(commitId)
  })
}

function executeComparison(commitId: string) {
  // Load the current HEAD version of the English translations file
  const currentVersionFilePath = 'src/assets/translations/en/main.json'
  const currentVersion = utils.loadJSONFile(currentVersionFilePath)

  // Load the specific git revision of the English translations file
  // Only relative path work with git commands.
  const gitVersionFilePath = `${commitId}:src/assets/translations/en/main.json`
  const gitVersion = JSON.parse(execSync(`git show ${gitVersionFilePath}`).toString())

  // Deep compare the two object versions to find modified properties
  const modifiedProperties = utils.compareObjects(currentVersion, gitVersion)
  console.log(`Modified properties since ${commitId}:`, modifiedProperties)
  rl.question(
    'Remove the properties above from the translations files in all languages [Yes, Default: No] ? ',
    function (choiceDelete: string) {
      if (['yes', 'y'].includes(choiceDelete.toLowerCase())) {
        // Loop through all the other languages' JSON files and delete modified properties
        const languagesDir = 'src/assets/translations'
        const languageDirs = fs
          .readdirSync(languagesDir)
          .filter(dir => dir !== 'en' && fs.statSync(`${languagesDir}/${dir}`).isDirectory())
        for (const languageDir of languageDirs) {
          const languageFilePath = `${repoPath}/${languagesDir}/${languageDir}/main.json`
          const languageJSON = utils.loadJSONFile(languageFilePath)
          for (const modifiedProperty of modifiedProperties) {
            if (utils.deletePropertyByPath(languageJSON, modifiedProperty)) {
              console.log(`Deleted ${modifiedProperty} from ${languageFilePath}`)
            }
          }
          utils.saveJSONFile(languageFilePath, languageJSON)
        }
      } else {
        console.log('No action taken.')
      }
      rl.close()
    },
  )
}
