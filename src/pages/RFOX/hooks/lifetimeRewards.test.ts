import {
  arbitrumChainId,
  ethChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
  usdcAssetId,
  usdcOnArbitrumOneAssetId,
} from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { RFOX_STAKING_CONFIG } from '../constants'
import type { Epoch, RewardDistribution } from '../types'
import { calculateLifetimeRewards } from './lifetimeRewards'

const address = '0x0000000000000000000000000000000000000001'
const accounts = {
  [ethChainId]: `${ethChainId}:${address}`,
  [arbitrumChainId]: `${arbitrumChainId}:${address}`,
}
const pricing = {
  [thorchainAssetId]: { precision: 8, price: '2' },
  [usdcAssetId]: { precision: 6, price: '1' },
  [usdcOnArbitrumOneAssetId]: { precision: 6, price: '1' },
}
const epoch = (
  number: number,
  distributions: [string, string, Partial<RewardDistribution>?][],
): Epoch => ({
  number,
  startTimestamp: 0,
  endTimestamp: 0,
  distributionTimestamp: 0,
  startBlock: 0,
  endBlock: 0,
  totalRevenue: '0',
  revenue: {},
  burnRate: 0.05,
  rewardAssetPriceUsd: '1',
  distributionStatus: 'complete',
  detailsByStakingContract: Object.fromEntries(
    distributions.map(([assetId, amount, overrides]) => [
      RFOX_STAKING_CONFIG[assetId].stakingContract,
      {
        totalRewardUnits: '0',
        distributionRate: 0.5,
        assetPriceUsd: '1',
        distributionsByStakingAddress: {
          [address]: {
            amount,
            rewardUnits: '0',
            totalRewardUnits: '0',
            txId: '0xpaid',
            rewardAddress: address,
            ...overrides,
          },
        },
      },
    ]),
  ),
})

describe('lifetime rewards across rFOX programs', () => {
  it('combines legacy RUNE, Arbitrum USDC, LP RUNE and Ethereum USDC once each', () => {
    const history = [
      epoch(17, [[foxOnArbitrumOneAssetId, '100000000']]),
      epoch(26, [
        [foxOnArbitrumOneAssetId, '425213296'],
        [uniV2EthFoxArbitrumAssetId, '200000000'],
      ]),
      epoch(27, [[foxAssetId, '10000000']]),
    ]
    expect(calculateLifetimeRewards(history, accounts, pricing)).toBe('441.21')
  })

  it('does not need RUNE pricing for a USDC-only history', () => {
    expect(
      calculateLifetimeRewards([epoch(27, [[foxAssetId, '10000000']])], accounts, {
        [usdcAssetId]: pricing[usdcAssetId],
      }),
    ).toBe('10.00')
  })

  it('does not report a partial or zero total when a rewarded asset price is missing', () => {
    expect(() =>
      calculateLifetimeRewards([epoch(26, [[foxOnArbitrumOneAssetId, '425213296']])], accounts, {}),
    ).toThrow('Reward pricing unavailable')
  })

  it('excludes genesis distributions and returns a real zero without needing prices', () => {
    expect(
      calculateLifetimeRewards(
        [epoch(0, [[foxOnArbitrumOneAssetId, '100000000', { txId: '' }]])],
        accounts,
        {},
      ),
    ).toBe('0.00')
    expect(calculateLifetimeRewards([], accounts, {})).toBe('0.00')
  })

  it('keeps pending distributions consistent with existing lifetime semantics', () => {
    const pending = {
      ...epoch(27, [[foxAssetId, '1000000', { txId: '' }]]),
      distributionStatus: 'pending' as const,
    }
    expect(calculateLifetimeRewards([pending], accounts, pricing)).toBe('1.00')
  })
})
