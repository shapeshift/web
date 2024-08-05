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
const VALID_ENVIRONMENTS = ['dev', 'develop', 'app', 'private', 'e2e'] as const
type Environment = (typeof VALID_ENVIRONMENTS)[number]

const VALID_BRANCHES = [
  'develop',
  'release',
  'main',
  'private',
  'yeet',
  'beard',
  'juice',
  'wood',
  'gome',
  'arkeo',
  'neo',
] as const
type Branch = (typeof VALID_BRANCHES)[number]

/**
 * the keys of this object are mapped to subdomains in cloudflare
 * e.g. yeet.shapeshift.com
 * the values of this object are the names of the .env files
 * e.g. .env.develop
 */
const BRANCH_TO_ENVIRONMENT: Record<Branch, Environment> = {
  // environments for individual devs
  beard: 'develop',
  juice: 'develop',
  wood: 'develop',
  gome: 'develop',
  neo: 'develop',
  arkeo: 'develop',
  yeet: 'develop', // free for all
  develop: 'develop',
  release: 'app', // for operations testing production releases
  // production environments
  main: 'app',
  private: 'private',
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
 * note for future maintainers - the intent of this script, is to map a given arg to a config environment.
 *
 * the arg can be
 * - a whitelisted branch name (in CI)
 * - an environment name
 * - empty, and the script will try to infer the environment from the branch name
 *
 * e.g.
 * - `yarn env app` will load the .env.app file and write out a .env file
 * - `yarn env` will try and read the branch name from process.env and map it to an environment
 *
 * this script can be called one of two ways
 * without args - `yarn env` in CI in GitHub Actions - where we inject process.env.CURRENT_BRANCH_NAME
 * see cloudflare.yml for more details
 * we have develop | main | release | private | yeet branches configured
 * and these branches map to the environments in BRANCH_TO_ENVIRONMENT above
 *
 * or `yarn env dev` and we're running locally and we use the radical dev config
 *
 */
const getSpecifiedEnvironment = (): Environment => {
  const args = process.argv.slice(2)
  const branch = process.env.CURRENT_BRANCH_NAME // set by cloudflare.yml

  // we're in a CI environment - we called the script as `yarn env` and hope the branch is set
  if (branch) {
    assert(VALID_BRANCHES.includes(branch as Branch), `invalid branch: ${branch}`)
    const targetEnvironment = BRANCH_TO_ENVIRONMENT[branch as Branch]
    assert(Boolean(targetEnvironment))
    console.log(`Using branch ${branch} to determine environment ${targetEnvironment}`)
    return targetEnvironment
  } else {
    const specifiedEnvironment = args[0] as Environment
    assert(
      VALID_ENVIRONMENTS.includes(specifiedEnvironment),
      `invalid environment: ${specifiedEnvironment}`,
    )
    return specifiedEnvironment
  }
}

const exportDotEnvFile = (serializedEnvVars: string) => {
  console.log(serializedEnvVars)
  writeFileSync('.env', serializedEnvVars) // write out new .env
}

const main = flow([getSpecifiedEnvironment, getSerializedEnvVars, exportDotEnvFile])

main()
