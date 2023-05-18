/* eslint-disable no-console */

// This script removes translations from all the non-English translation JSON files for
// entries which have been modified in English since a specific Git revision.
// The new and deleted English copies are ignored as they will be automatically handled
// by Gitlocalize, our translation platform.

import { execSync } from 'child_process'
import * as fs from 'fs'
import readline from 'readline'

// Set the current dir to the repo root (makes it easier for git commands)
const repoPath: string = execSync('git rev-parse --show-toplevel').toString().trim()
process.chdir(repoPath)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Which revision sould we compare: ', function (gitRevision: string) {
  // Load the current HEAD version of the English translations file
  const currentVersionFilePath = 'src/assets/translations/en/main.json'
  const currentVersion = loadJSONFile(currentVersionFilePath)

  // Load the specific git revision of the English translations file
  // Only relative path work with git commands.
  const gitVersionFilePath = `${gitRevision}:src/assets/translations/en/main.json`
  const gitVersion = JSON.parse(execSync(`git show ${gitVersionFilePath}`).toString())

  // Deep compare the two object versions to find modified properties
  const modifiedProperties = compareObjects(currentVersion, gitVersion)
  console.log(`Modified properties since ${gitRevision}:`, modifiedProperties)
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
          const languageJSON = loadJSONFile(languageFilePath)
          for (const modifiedProperty of modifiedProperties) {
            if (deletePropertyByPath(languageJSON, modifiedProperty)) {
              console.log(`Deleted ${modifiedProperty} from ${languageFilePath}`)
            }
          }
          saveJSONFile(languageFilePath, languageJSON)
        }
      } else {
        console.log('No action taken.')
      }
      rl.close()
    },
  )
})

// Utility function to load a JSON file
function loadJSONFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
}

// Utility function to save a JSON file
function saveJSONFile(filePath: string, data: any) {
  const fileContents = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(filePath, fileContents, 'utf8')
}

// Utility function to recursively compare two objects
function compareObjects(obj1: any, obj2: any, path = ''): string[] {
  const diffs: string[] = []

  for (const key in obj1) {
    if (!obj1.hasOwnProperty(key)) {
      continue
    }
    const curPath = path ? `${path}.${key}` : key

    if (!obj2.hasOwnProperty(key)) {
    } else if (typeof obj1[key] !== typeof obj2[key]) {
    } else if (typeof obj1[key] === 'object') {
      // Nested properties
      const nestedDiffs = compareObjects(obj1[key], obj2[key], curPath)
      diffs.push(...nestedDiffs)
    } else if (obj1[key] !== obj2[key]) {
      // Updated properties.
      diffs.push(curPath)
    }
  }

  return diffs
}

// Utility function to delete a property using a doted path
function deletePropertyByPath(obj: Record<string, any>, path: string): boolean {
  const parts = path.split('.')
  let currentObj = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!currentObj.hasOwnProperty(part)) {
      // Property not found, nothing to delete
      return false
    }
    currentObj = currentObj[part]
  }
  delete currentObj[parts[parts.length - 1]]
  return true
}
