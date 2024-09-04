import type { FARMING_ABI } from '@shapeshiftoss/contracts'
import { memoize } from 'lodash'
import type { Address, GetContractReturnType, PublicClient } from 'viem'
import { bnOrZero } from 'lib/bignumber/bignumber'

export const makeTotalLpApr = (foxRewardRatePerToken: string, foxEquivalentPerLPToken: string) =>
  bnOrZero(foxRewardRatePerToken) // Fox Rewards per second for 1 staked LP token
    .div(foxEquivalentPerLPToken) // Equivalent FOX value for 1 LP token
    .times(100) // Decimal to percentage
    .times(3600) // 3600 seconds per hour
    .times(24) // 24 hours per day
    .times(365.25) // 365.25 days per year
    .decimalPlaces(4) // Arbitrary decimal cutoff
    .toString()

// Rate of FOX given per second for all staked addresses)
const getRewardsRate = memoize(
  async (
    farmingRewardsContract: GetContractReturnType<typeof FARMING_ABI, PublicClient, Address>,
  ) => await farmingRewardsContract.read.rewardRate(),
)

const getTotalLpSupply = memoize(
  async (
    farmingRewardsContract: GetContractReturnType<typeof FARMING_ABI, PublicClient, Address>,
  ) => {
    try {
      const totalSupply = await farmingRewardsContract.read.totalSupply()
      return bnOrZero(totalSupply.toString())
    } catch (error) {
      console.error(error)
      const errorMsg = 'totalLpSupply error'
      throw new Error(errorMsg)
    }
  },
)

export const rewardRatePerToken = memoize(
  async (
    farmingRewardsContract: GetContractReturnType<typeof FARMING_ABI, PublicClient, Address>,
  ) => {
    try {
      const rewardRate = await getRewardsRate(farmingRewardsContract)
      const totalSupply = await getTotalLpSupply(farmingRewardsContract)
      return bnOrZero(rewardRate.toString())
        .div(totalSupply)
        .times('1e+18')
        .decimalPlaces(0)
        .toString()
    } catch (error) {
      console.error(error)
      const errorMsg = 'rewardRatePerToken error'
      throw new Error(errorMsg)
    }
  },
)
