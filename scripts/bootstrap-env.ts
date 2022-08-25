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

const getSpecifiedEnvironment = (): Environment => {
  const args = process.argv.slice(2)
  assert(args.length === 1, 'yarn env must be called with exactly one environment argument')
  const specifiedEnvironment = args[0] as Environment
  assert(VALID_ENVIRONMENTS.includes(specifiedEnvironment), 'invalid environment')
  return specifiedEnvironment
}

const exportDotEnvFile = (serialiazedEnvVars: string) => {
  console.log(serialiazedEnvVars)
  writeFileSync('.env', serialiazedEnvVars) // write out new .env
}

const main = flow([getSpecifiedEnvironment, getSerializedEnvVars, exportDotEnvFile])

main()
