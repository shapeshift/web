// build tool
/* eslint-disable no-console */
import assert from 'assert'
import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import flow from 'lodash/flow'

/**
 * please note!
 * - dev is the local environment. .env.local automatically gets picked up by dotenv
 * - the release environment uses the app configuration
 */
const VALID_ENVIRONMENTS = ['dev', 'develop', 'app', 'private'] as const
type Environment = typeof VALID_ENVIRONMENTS[number]

const VALID_BRANCHES = ['develop', 'release', 'main', 'private', 'yeet'] as const
type Branch = typeof VALID_BRANCHES[number]

const BRANCH_TO_ENVIRONMENT: Record<Branch, Environment> = {
  'develop': 'develop',
  'yeet': 'develop',
  'release': 'app',
  'main': 'app',
  'private': 'private',
}

const getSerializedEnvVars = (environment: Environment) => {
  console.log(`Using environment variables for ${environment} environment`)

  const envVars = Object.assign(
    {},
    dotenv.parse(readFileSync('.env.base')), // always load the base config first, path is relative to root of repo
    dotenv.parse(readFileSync(`.env.${environment}`)), // load the environment specific .env file, stomp on base
  )

  return Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`) // back to .env style
    .join('\n')
}

/**
 * this script can be called one of two ways
 * `yarn env` in CI in Cloudflare Pages - where CF_PAGES_BRANCH is injected
 * https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables
 * and we have develop | main | release | private | yeet branches configured
 * and these branches map to the environments in BRANCH_TO_ENVIRONMENT above
 *
 * or `yarn env dev` and we're running locally and we use the radical dev config
 *
 */
const getSpecifiedEnvironment = (): Environment => {
  const args = process.argv.slice(2)
  const branch = process.env.CF_PAGES_BRANCH || process.env.TARGET_BRANCH_NAME

  // we're in a CI environment - we called the script as `yarn env` and hope the branch is set
  if (branch) {
    assert(VALID_BRANCHES.includes(branch as Branch), `invalid branch: ${branch}`)
    const targetEnvironment = BRANCH_TO_ENVIRONMENT[branch as Branch]
    assert(Boolean(targetEnvironment))
    console.log(`Using branch ${branch} to determine environment ${targetEnvironment}`)
    return targetEnvironment
  } else {
    const specifiedEnvironment = args[0] as Environment
    assert(VALID_ENVIRONMENTS.includes(specifiedEnvironment), `invalid environment: ${specifiedEnvironment}`)
    return specifiedEnvironment
  }
}

const exportDotEnvFile = (serializedEnvVars: string) => {
  console.log(serializedEnvVars)
  writeFileSync('.env', serializedEnvVars) // write out new .env
}

const main = flow([getSpecifiedEnvironment, getSerializedEnvVars, exportDotEnvFile])

main()
