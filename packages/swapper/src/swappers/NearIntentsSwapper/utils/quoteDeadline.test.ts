import { btcChainId, dogeChainId, ethChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_QUOTE_DEADLINE_MS, UTXO_QUOTE_DEADLINE_MS } from '../constants'
import { getNearIntentsQuoteDeadline } from './helpers'

const asset = (chainId: string): Asset => ({ chainId }) as Asset

describe('getNearIntentsQuoteDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T22:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives a utxo sell leg the long deadline', () => {
    expect(Date.parse(getNearIntentsQuoteDeadline({ sellAsset: asset(btcChainId), buyAsset: asset(ethChainId) }))).toBe(
      Date.now() + UTXO_QUOTE_DEADLINE_MS,
    )
  })

  it('gives a utxo buy leg the long deadline, on any utxo chain', () => {
    expect(Date.parse(getNearIntentsQuoteDeadline({ sellAsset: asset(ethChainId), buyAsset: asset(dogeChainId) }))).toBe(
      Date.now() + UTXO_QUOTE_DEADLINE_MS,
    )
  })

  it('gives everything else the default deadline', () => {
    expect(
      Date.parse(getNearIntentsQuoteDeadline({ sellAsset: asset(ethChainId), buyAsset: asset(solanaChainId) })),
    ).toBe(Date.now() + DEFAULT_QUOTE_DEADLINE_MS)
  })
})
