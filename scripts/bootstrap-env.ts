// build tool
/* eslint-disable no-console */

// use the same source of truth as runtime config management in the app
import assert from 'assert'
import dotenv from 'dotenv'

/**
 * these are injected by the hosted environment, i.e. fleek and should not be modified
 * the existence of an injected environment variable indicates it has been set manually in the UI
 * and should take precedence over configuration as code
 */
import { reactAppEnvVars } from '../src/env'

// the release environment uses the app configuration
const VALID_ENVIRONMENTS = ['develop', 'app', 'private'] as const
type ValidEnvironment = typeof VALID_ENVIRONMENTS[number]

const args = process.argv.slice(2)

assert(args.length === 1, 'yarn env must be called with exactly one environment argument')
const specifiedEnvironment = args[0]
assert(
  VALID_ENVIRONMENTS.includes(specifiedEnvironment as ValidEnvironment),
  `yarn env must be called with a valid environment. expected one of ${JSON.stringify(
    VALID_ENVIRONMENTS,
    null,
    2,
  )} received ${specifiedEnvironment}`,
)

/**
 * dotenv.config will not override existing config by default
 * https://github.com/motdotla/dotenv#override
 */

// always load the base config first
dotenv.config({ path: `.base.env` }) // relative to root of repo

// load the environment specific .env file
dotenv.config({ path: `.${specifiedEnvironment}.env` })

console.log('Loaded environment variables')
console.log(reactAppEnvVars(process.env))
