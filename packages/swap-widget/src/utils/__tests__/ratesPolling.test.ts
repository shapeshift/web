import {
  btcChainId,
  cosmosChainId,
  ethChainId,
  solanaChainId,
  starknetChainId,
  zecChainId,
} from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { canActOnRates } from '../ratesPolling'

describe('canActOnRates', () => {
  it('fetches rates on chains the widget can sign', () => {
    expect(canActOnRates(ethChainId)).toBe(true)
    expect(canActOnRates(btcChainId)).toBe(true)
    expect(canActOnRates(solanaChainId)).toBe(true)
  })

  it('fetches rates on a chain that can be paid externally', () => {
    expect(canActOnRates(zecChainId)).toBe(true)
  })

  it('skips rates everywhere else', () => {
    expect(canActOnRates(cosmosChainId)).toBe(false)
    expect(canActOnRates(starknetChainId)).toBe(false)
  })
})
