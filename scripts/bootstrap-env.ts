// build tool
/* eslint-disable no-console */

import assert from 'assert'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

// the release environment uses the app configuration
const VALID_ENVIRONMENTS = ['local', 'develop', 'app', 'private']

const args = process.argv.slice(2)

assert(args.length === 1, 'yarn env must be called with exactly one environment argument')
const specifiedEnvironment = args[0]
assert(VALID_ENVIRONMENTS.includes(specifiedEnvironment), 'invalid environment')

const envVars = Object.assign(
  {},
  dotenv.parse(readFileSync('.env.base')), // always load the base config first, path is relative to root of repo
  dotenv.parse(readFileSync(`.env.${specifiedEnvironment}`)), // load the environment specific .env file
)

const exportString = Object.entries(envVars)
  .map(([k, v]) => `${k}=${v}`)
  .join(' ')

console.log(exportString)
