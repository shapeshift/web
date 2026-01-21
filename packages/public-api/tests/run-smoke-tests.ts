import { runSmokeTests } from './smoke-tests'
import { sleep } from './test-utils'

const main = async (): Promise<void> => {
  console.log('='.repeat(60))
  console.log('ShapeShift Public API - Smoke Tests')
  console.log('='.repeat(60))

  const apiUrl = process.env.API_URL || 'http://localhost:3001'
  console.log(`Testing API at: ${apiUrl}`)
  console.log('')

  // Wait for API to be ready (Railway may still be spinning up)
  const maxRetries = 10
  const retryDelay = 3000

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${apiUrl}/health`)
      if (res.ok) {
        console.log('API is ready!')
        break
      }
    } catch {
      // Ignore - API not ready yet
    }

    if (i < maxRetries - 1) {
      console.log(`Waiting for API to be ready... (${i + 1}/${maxRetries})`)
      await sleep(retryDelay)
    } else {
      console.error('API did not become ready in time')
      // Still exit 0 to not block deployment
      process.exit(0)
    }
  }

  console.log('')
  const results = await runSmokeTests()

  // Print results
  console.log('\nTest Results:')
  console.log('-'.repeat(60))

  for (const result of results.results) {
    const status = result.passed ? 'PASS' : result.critical ? 'FAIL (CRITICAL)' : 'FAIL (warning)'
    const icon = result.passed ? '[OK]' : '[!!]'
    console.log(`${icon} ${result.name}: ${status} (${result.duration}ms)`)
    if (result.error) {
      console.log(`    Error: ${result.error}`)
    }
  }

  console.log('-'.repeat(60))
  console.log(
    `Total: ${results.totalTests} | Passed: ${results.passed} | Failed: ${results.failed}`,
  )

  if (results.criticalFailures > 0) {
    console.log(`\n[WARNING] ${results.criticalFailures} CRITICAL test(s) failed!`)
    console.log('The API may not be functioning correctly.')
  }

  // Output JSON for programmatic consumption
  console.log('\n--- JSON Results ---')
  console.log(JSON.stringify(results, null, 2))

  // Always exit 0 to not block deployment
  // Critical failures are logged but don't fail the deploy
  process.exit(0)
}

main().catch(err => {
  console.error('Smoke test runner error:', err)
  process.exit(0) // Still exit 0 to not block
})
