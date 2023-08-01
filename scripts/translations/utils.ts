import { execSync } from 'child_process'
import * as fs from 'fs'

export type StringRecord = {
  [key: string]: string | StringRecord
}

export const countWordsStringsToTranslate = (strings: [string, string][]): number => {
  return strings.reduce((count, str) => count + countWords(str[0]), 0)
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

export const findStringsToTranslate = (
  prev: StringRecord,
  curr: StringRecord,
): [string, string][] => {
  const stringsToTranslate: [string, string][] = []
  for (const key in curr) {
    const currentValue = curr[key]
    const previousValue = prev?.[key]
    if (typeof currentValue === 'string' && previousValue !== currentValue) {
      stringsToTranslate.push([currentValue, previousValue ? 'modified' : 'new'])
    } else if (typeof currentValue !== 'string' && typeof previousValue !== 'string') {
      const nestedModifiedStrings = findStringsToTranslate(previousValue, currentValue)
      stringsToTranslate.push(...nestedModifiedStrings)
    }
  }
  return stringsToTranslate
}

// Handles the user input from arguments of readline to return a commit hash
export const handleDateCommitHashInput = (input: string): string => {
  let commitHash = input

  if (isValidDate(input)) {
    // If it's a valid date, get the hash of the first commit made on that date/time
    const date = new Date(input)
    commitHash = getFirstCommitHash(input)
    console.log(`The first commit after ${date.toISOString()} is ${commitHash}`)
  } else if (!isValidCommitHash(input)) {
    console.log(`"${input}" is not a valid date or a valid commit hash.`)
    process.exit(1)
  }
  return commitHash
}

export const loadJSONFile = (filePath: string) => {
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
}

export const saveJSONFile = (filePath: string, data: any) => {
  const fileContents = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(filePath, fileContents, 'utf8')
}

// Recursively compare two objects and returns any array of dotted paths to
// modified values.
export const compareObjects = (obj1: any, obj2: any, path = ''): string[] => {
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

// Delete a property from ano object by doted path
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
