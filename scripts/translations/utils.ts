import { execSync } from 'child_process'
import * as fs from 'fs'
import util from 'util'

export type StringRecord = {
  [key: string]: string | StringRecord
}

export type StringToTranslate = {
  text: string
  status: string
  dottedPath: string
}

export const countWordsStringsToTranslate = (strings: StringToTranslate[]): number => {
  return strings.reduce((count, str) => count + countWords(str.text), 0)
}

export const countWords = (str: string): number => {
  const trimmedStr = str.trim()
  return trimmedStr.length === 0 ? 0 : trimmedStr.split(/\s+/).length
}

export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

export const isValidCommitHash = (commitHash: string): boolean => {
  const regex = /^[0-9a-f]{7,40}$/i
  return regex.test(commitHash)
}

export const getFirstCommitHash = (dateString: string): string => {
  // Assume simplified ISO 8601 calendar date extended format: YYYY-MM-DDTHH:mm:ss.sssZ
  const date = new Date(dateString)
  const log = execSync(`git log --since="${date.toISOString()}"`).toString()
  const commits = log.split('\n\ncommit ')
  return commits[commits.length - 1].split('\n')[0]
}

// Recursively compare two objects and returns an array of strings added and modified
export const findStringsToTranslate = (
  prev: StringRecord,
  curr: StringRecord,
  path?: string,
): StringToTranslate[] => {
  const stringsToTranslate: StringToTranslate[] = []
  for (const key in curr) {
    let currentPath: string = path ? `${path}.${key}` : key
    const currentValue = curr[key]
    const previousValue = prev?.[key]
    if (typeof currentValue === 'string' && previousValue !== currentValue) {
      stringsToTranslate.push({
        text: currentValue,
        status: previousValue ? 'modified' : 'new',
        dottedPath: currentPath,
      })
    } else if (typeof currentValue !== 'string' && typeof previousValue !== 'string') {
      const nestedModifiedStrings = findStringsToTranslate(previousValue, currentValue, currentPath)
      stringsToTranslate.push(...nestedModifiedStrings)
    }
  }
  return stringsToTranslate
}

// Handles the user input from arguments or readline to return a commit hash
export const handleDateCommitHashInput = (input: string): string => {
  let commitHash = input

  if (isValidDate(input)) {
    // If it's a valid date, get the hash of the first commit made on that date/time
    const date = new Date(input)
    commitHash = getFirstCommitHash(input)
    console.log(`The first commit after ${date.toISOString()} is ${commitHash}\n`)
  } else if (!isValidCommitHash(input)) {
    console.log(`"${input}" is not a valid date or a valid commit hash.`)
    process.exit(1)
  }
  return commitHash
}

// Delete a property from an object by doted path
export const deletePropertyByPath = (obj: Record<string, any>, path: string): boolean => {
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

// Inline console logs strings to translate
export const outputStringsToTranslate = (strings: StringToTranslate[]) => {
  for (let i = 0; i < strings.length; i++) {
    console.log(
      `${util.inspect(strings[i], {
        compact: true,
        breakLength: Infinity,
      })}`,
    )
  }
}

export const loadJSONFile = (filePath: string) => {
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
}

export const saveJSONFile = (filePath: string, data: any) => {
  const fileContents = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(filePath, fileContents, 'utf8')
}
