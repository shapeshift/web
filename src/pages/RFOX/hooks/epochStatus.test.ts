import { describe, expect, it } from 'vitest'

import type { CurrentEpochMetadata } from '../types'
import { isCurrentEpoch } from './epochStatus'

const metadata: CurrentEpochMetadata = {
  epoch: 27,
  epochStartTimestamp: Date.UTC(2026, 9, 1),
  epochEndTimestamp: Date.UTC(2026, 10, 1) - 1,
  treasuryAddress: '',
  burnRate: 0.05,
  distributionRateByStakingContract: {},
  ipfsHashByEpoch: {},
}

describe('current epoch validity', () => {
  it('accepts both boundaries and rejects dates outside the published window', () => {
    expect(isCurrentEpoch(metadata, metadata.epochStartTimestamp)).toBe(true)
    expect(isCurrentEpoch(metadata, metadata.epochEndTimestamp)).toBe(true)
    expect(isCurrentEpoch(metadata, metadata.epochStartTimestamp - 1)).toBe(false)
    expect(isCurrentEpoch(metadata, metadata.epochEndTimestamp + 1)).toBe(false)
  })

  it('does not reuse October rates in November', () => {
    expect(isCurrentEpoch(metadata, Date.UTC(2026, 10, 2))).toBe(false)
  })

  it.each([NaN, Infinity])('rejects invalid timestamps %s', epochEndTimestamp => {
    expect(isCurrentEpoch({ ...metadata, epochEndTimestamp }, Date.UTC(2026, 9, 15))).toBe(false)
  })
})
