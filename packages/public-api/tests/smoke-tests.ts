import { ASSET_IDS, TEST_PAIRS } from './test-config'
import type { TestResult, TestSuiteResult } from './test-utils'
import { fetchWithTimeout, runTest } from './test-utils'

const getApiUrl = (): string => process.env.API_URL || 'http://localhost:3001'

export const runSmokeTests = async (): Promise<TestSuiteResult> => {
  const API_URL = getApiUrl()
  const results: TestResult[] = []

  // 1. Health Check (Critical)
  results.push(
    await runTest('Health check', true, async () => {
      const res = await fetchWithTimeout(`${API_URL}/health`, {})
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
      const data = (await res.json()) as { status?: string }
      if (data.status !== 'ok') throw new Error('Health status not ok')
    }),
  )

  // 2. Chain Count (Critical)
  results.push(
    await runTest('Chain count', true, async () => {
      const res = await fetchWithTimeout(`${API_URL}/v1/chains/count`, {})
      if (!res.ok) throw new Error(`Chain count failed: ${res.status}`)
      const data = (await res.json()) as { count?: number }
      if (typeof data.count !== 'number' || data.count === 0) {
        throw new Error(`Invalid chain count: ${data.count}`)
      }
    }),
  )

  // 3. Chain List (Critical)
  results.push(
    await runTest('Chain list', true, async () => {
      const res = await fetchWithTimeout(`${API_URL}/v1/chains`, {})
      if (!res.ok) throw new Error(`Chain list failed: ${res.status}`)
      const data = (await res.json()) as {
        chains?: { chainId?: string; name?: string; type?: string }[]
      }
      if (!Array.isArray(data.chains) || data.chains.length === 0) {
        throw new Error('No chains returned')
      }
      const firstChain = data.chains[0]
      if (!firstChain.chainId || !firstChain.name || !firstChain.type) {
        throw new Error('Invalid chain structure')
      }
    }),
  )

  // 4. Asset Count (Critical)
  results.push(
    await runTest('Asset count', true, async () => {
      const res = await fetchWithTimeout(`${API_URL}/v1/assets/count`, {})
      if (!res.ok) throw new Error(`Asset count failed: ${res.status}`)
      const data = (await res.json()) as { count?: number }
      if (typeof data.count !== 'number' || data.count === 0) {
        throw new Error(`Invalid asset count: ${data.count}`)
      }
    }),
  )

  // 5. Asset List (Critical)
  results.push(
    await runTest('Asset list', true, async () => {
      const res = await fetchWithTimeout(`${API_URL}/v1/assets?limit=10`, {})
      if (!res.ok) throw new Error(`Asset list failed: ${res.status}`)
      const data = (await res.json()) as { assets?: unknown[] }
      if (!Array.isArray(data.assets) || data.assets.length === 0) {
        throw new Error('No assets returned')
      }
    }),
  )

  // 6. Single Asset Lookup (Critical)
  results.push(
    await runTest('Single asset lookup (ETH)', true, async () => {
      const assetId = encodeURIComponent(ASSET_IDS.ETH)
      const res = await fetchWithTimeout(`${API_URL}/v1/assets/${assetId}`, {})
      if (!res.ok) throw new Error(`Asset lookup failed: ${res.status}`)
      const asset = (await res.json()) as { chainId?: string; symbol?: string }
      if (!asset.chainId || !asset.symbol) {
        throw new Error('Invalid asset structure')
      }
    }),
  )

  // 7. EVM Same-Chain Rates (Informative)
  const evmPair = TEST_PAIRS.evmSameChain[0]
  results.push(
    await runTest(`Rates: ${evmPair.name}`, false, async () => {
      const params = new URLSearchParams({
        sellAssetId: evmPair.sellAssetId,
        buyAssetId: evmPair.buyAssetId,
        sellAmountCryptoBaseUnit: evmPair.sellAmountCryptoBaseUnit,
      })
      const res = await fetchWithTimeout(`${API_URL}/v1/swap/rates?${params}`, {}, 30000) // 30s timeout for rates

      if (!res.ok) throw new Error(`Rates request failed: ${res.status}`)
      const data = (await res.json()) as {
        rates?: {
          swapperName: string
          error?: unknown
          buyAmountCryptoBaseUnit?: string
        }[]
      }
      if (!Array.isArray(data.rates)) throw new Error('Invalid rates response structure')

      const validRates = data.rates.filter(
        r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
      )
      if (validRates.length === 0) {
        const swappersWithErrors = data.rates
          .filter(r => r.error)
          .map(r => r.swapperName)
          .join(', ')
        console.warn(
          `Warning: No valid rates returned for ${evmPair.name}. Swappers with errors: ${
            swappersWithErrors || 'none'
          }`,
        )
      } else {
        console.log(
          `  Found ${validRates.length} valid rate(s) from: ${validRates
            .map(r => r.swapperName)
            .join(', ')}`,
        )
      }
    }),
  )

  // 8. Cross-Chain Rates (Informative)
  const crossChainPair = TEST_PAIRS.crossChain[0]
  results.push(
    await runTest(`Rates: ${crossChainPair.name}`, false, async () => {
      const params = new URLSearchParams({
        sellAssetId: crossChainPair.sellAssetId,
        buyAssetId: crossChainPair.buyAssetId,
        sellAmountCryptoBaseUnit: crossChainPair.sellAmountCryptoBaseUnit,
      })
      const res = await fetchWithTimeout(`${API_URL}/v1/swap/rates?${params}`, {}, 30000)

      if (!res.ok) throw new Error(`Rates request failed: ${res.status}`)
      const data = (await res.json()) as {
        rates?: {
          swapperName: string
          error?: unknown
          buyAmountCryptoBaseUnit?: string
        }[]
      }
      if (!Array.isArray(data.rates)) throw new Error('Invalid rates response structure')

      const validRates = data.rates.filter(
        r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
      )
      if (validRates.length === 0) {
        const swappersWithErrors = data.rates
          .filter(r => r.error)
          .map(r => r.swapperName)
          .join(', ')
        console.warn(
          `Warning: No valid rates returned for ${crossChainPair.name}. Swappers with errors: ${
            swappersWithErrors || 'none'
          }`,
        )
      } else {
        console.log(
          `  Found ${validRates.length} valid rate(s) from: ${validRates
            .map(r => r.swapperName)
            .join(', ')}`,
        )
      }
    }),
  )

  // Calculate summary
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const criticalFailures = results.filter(r => !r.passed && r.critical).length

  return {
    timestamp: Date.now(),
    apiUrl: API_URL,
    totalTests: results.length,
    passed,
    failed,
    criticalFailures,
    results,
  }
}
