import type { ChainConfig } from './schema'

export type CodemodResult = {
  file: string
  operation: string
  status: 'inserted' | 'skipped' | 'error'
  message?: string
}

export function printReport(results: CodemodResult[], config: ChainConfig): void {
  const inserted = results.filter(r => r.status === 'inserted')
  const skipped = results.filter(r => r.status === 'skipped')
  const errors = results.filter(r => r.status === 'error')

  console.log('\n=== Chain Scaffolding Report ===\n')
  console.log(`Chain: ${config.pascalName} (eip155:${config.chainId})`)
  console.log(`Total operations: ${results.length}\n`)

  if (inserted.length > 0) {
    console.log(`--- Inserted (${inserted.length}) ---`)
    for (const r of inserted) {
      console.log(`  + ${r.file} - ${r.operation}`)
    }
    console.log()
  }

  if (skipped.length > 0) {
    console.log(`--- Skipped / already exists (${skipped.length}) ---`)
    for (const r of skipped) {
      console.log(`  ~ ${r.file} - ${r.operation}${r.message ? ` (${r.message})` : ''}`)
    }
    console.log()
  }

  if (errors.length > 0) {
    console.log(`--- Errors (${errors.length}) ---`)
    for (const r of errors) {
      console.log(`  x ${r.file} - ${r.operation}: ${r.message ?? 'unknown error'}`)
    }
    console.log()
  }

  console.log('=== Manual Tasks ===\n')

  const manualTasks: string[] = []

  // Swapper support tasks
  const { swappers } = config
  if (swappers.relay.supported) {
    manualTasks.push('Verify Relay chain ID mapping is correct in relay swapper config')
  }
  if (swappers.across.supported) {
    manualTasks.push('Verify Across chain support and bridge token list')
  }
  if (swappers.portals.supported) {
    manualTasks.push('Verify Portals chain integration and supported tokens')
  }
  if (swappers.zerion.supported) {
    manualTasks.push('Verify Zerion chain support for balance/tx history')
  }
  if (swappers.yieldxyz.supported) {
    manualTasks.push('Verify Yield.xyz opportunities for this chain')
  }

  if (config.wrappedNativeAddress === null) {
    manualTasks.push(`Set wrappedNativeAddress in chains/${config.camelName}.json once known`)
  }

  manualTasks.push(`Run: pnpm run generate:chain eip155:${config.chainId}`)
  manualTasks.push('Add stablecoin manualRelatedAssetIndex entries if applicable')
  manualTasks.push('Check for native ERC20 wrapper duplicates in asset list')
  manualTasks.push('Run: pnpm run lint --fix && pnpm run type-check')

  for (let i = 0; i < manualTasks.length; i++) {
    console.log(`  [ ] ${i + 1}. ${manualTasks[i]}`)
  }

  console.log()

  if (errors.length > 0) {
    console.log(`!! ${errors.length} error(s) detected - review and fix before proceeding.\n`)
  } else {
    console.log('All codemods applied successfully.\n')
  }
}
