import { thorchainChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { treasuryChainIds } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { getTreasuryAddressFromChainId, normalizeEpochToMs } from './helpers'

describe('getTreasuryAddressFromChainId', () => {
  // Affiliate and fee recipient addresses for every swapper flow through here, so pin the values
  // rather than the wiring - a chain pointing at another chain's treasury misroutes revenue silently
  const expectedTreasuryAddressByChainId: Record<(typeof treasuryChainIds)[number], string> = {
    [KnownChainIds.EthereumMainnet]: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
    [KnownChainIds.OptimismMainnet]: '0x6268d07327f4fb7380732dc6d63d95F88c0E083b',
    [KnownChainIds.AvalancheMainnet]: '0x74d63F31C2335b5b3BA7ad2812357672b2624cEd',
    [KnownChainIds.PolygonMainnet]: '0xB5F944600785724e31Edb90F9DFa16dBF01Af000',
    [KnownChainIds.GnosisMainnet]: '0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3',
    [KnownChainIds.BnbSmartChainMainnet]: '0x8b92b1698b57bEDF2142297e9397875ADBb2297E',
    [KnownChainIds.ArbitrumMainnet]: '0x38276553F8fbf2A027D901F8be45f00373d8Dd48',
    [KnownChainIds.BaseMainnet]: '0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502',
    [KnownChainIds.MonadMainnet]: '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC',
    [KnownChainIds.HyperEvmMainnet]: '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC',
    [KnownChainIds.BobMainnet]: '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC',
    [KnownChainIds.BitcoinMainnet]:
      'bc1q9xrjfet2a05r3jvsxx66rru7pysevk5dvqasdw9eeea3rfqlk33qr4hghh',
    [KnownChainIds.SolanaMainnet]: 'FxXyPB5RH4uHLPPJR5H89zGwZp19juBetmRwrxfsLj2j',
    [KnownChainIds.StarknetMainnet]:
      '0x07ac2252f2da7cbf085e7a5ddc1318243aa818607cdd430dd2e17dd5d487606a',
    [KnownChainIds.TonMainnet]: 'UQAHHeOhXst-zSGGigQ8KgDzz89nACBR4TxXwXNjU4DsriLb',
  }

  it.each(treasuryChainIds)('returns the treasury address for %s', chainId => {
    expect(getTreasuryAddressFromChainId(chainId)).toBe(expectedTreasuryAddressByChainId[chainId])
  })

  it('throws for unsupported chains', () => {
    expect(() => getTreasuryAddressFromChainId(thorchainChainId as EvmChainId)).toThrow(
      '[getTreasuryAddressFromChainId] - Unsupported chainId',
    )
  })
})

describe('normalizeEpochToMs', () => {
  // 2026-08-05T00:00:00Z expressed in each unit
  const epochS = 1785888000
  const epochMs = epochS * 1000

  it('converts unix seconds to ms', () => {
    expect(normalizeEpochToMs(epochS)).toBe(epochMs)
  })

  it('passes milliseconds through', () => {
    expect(normalizeEpochToMs(epochMs)).toBe(epochMs)
  })

  it('converts microseconds to ms', () => {
    expect(normalizeEpochToMs(epochMs * 1000)).toBe(epochMs)
  })

  it('converts nanoseconds to ms', () => {
    expect(normalizeEpochToMs(epochMs * 1e6)).toBe(epochMs)
  })
})
