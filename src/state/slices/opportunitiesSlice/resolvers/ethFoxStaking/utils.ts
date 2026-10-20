import { BigAmount } from '@shapeshiftoss/utils'

import { bnOrZero } from '@/lib/bignumber/bignumber'

export const makeTotalLpApr = (foxRewardRatePerToken: string, foxEquivalentPerLPToken: string) =>
  bnOrZero(foxRewardRatePerToken) // Fox Rewards per second for 1 staked LP token
    .div(foxEquivalentPerLPToken) // Equivalent FOX value for 1 LP token
    .times(100) // Decimal to percentage
    .times(3600) // 3600 seconds per hour
    .times(24) // 24 hours per day
    .times(365.25) // 365.25 days per year
    .decimalPlaces(4) // Arbitrary decimal cutoff
    .toString()

// Rate of FOX given per second for 1 staked LP token
export const rewardRatePerToken = (rewardRate: bigint, totalSupply: bigint): string =>
  BigAmount.fromPrecision({
    value: bnOrZero(rewardRate.toString()).div(bnOrZero(totalSupply.toString())).toFixed(),
    precision: 18,
  }).toBaseUnit()
