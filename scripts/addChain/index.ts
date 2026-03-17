#!/usr/bin/env npx tsx
import fs from 'node:fs'

import { runAllCodemods } from './codemods'
import { printReport } from './report'
import { validateConfig } from './schema'

function main() {
  const configPath = process.argv[2]
  if (!configPath) {
    console.error('Usage: npx tsx scripts/addChain/index.ts chains/<chain>.json')
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const config = validateConfig(raw)

  console.log(`\nAdding chain: ${config.pascalName} (eip155:${config.chainId})\n`)

  const results = runAllCodemods(config)
  printReport(results, config)
  if (results.some(r => r.status === 'error')) {
    process.exit(1)
  }
}

try {
  main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
