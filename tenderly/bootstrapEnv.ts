import { assert } from 'console'
import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

const { level, msg } = require(path.join(__dirname, '.tenderly.json'))

assert(level === 'info', 'received bad tenderly devnet metadata', msg)

const envFilePath = path.join(__dirname, '.env')

const envVars = {
  ...dotenv.parse(readFileSync(envFilePath)),
  PROXY_TENDERLY_ETHEREUM_HTTP_URL: msg,
}

const serializedEnvVars =
  Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`) // back to .env style
    .join('\n') + '\n' // newline at end of file

writeFileSync(envFilePath, serializedEnvVars)
