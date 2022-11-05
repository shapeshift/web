import type { Contract } from '@ethersproject/contracts'
import { ethChainId } from '@keepkey/caip'
import type { TokenAmount } from '@uniswap/sdk'
import { providers } from 'ethers'
import memoize from 'lodash/memoize'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

import { TRADING_FEE_RATE } from './const'

const moduleLogger = logger.child({
  namespace: ['Plugins', 'FoxPage', 'Utils'],
})

// TODO: remove this module and use wagmi provider
let maybeEthersProvider: providers.Web3Provider | undefined
// The provider we get from getWeb3Instance is a web3.js Provider
// But uniswap SDK needs a Web3Provider from ethers.js
export const getEthersProvider = () => {
  if (maybeEthersProvider) return maybeEthersProvider

  const provider = getWeb3InstanceByChainId(ethChainId).currentProvider

  maybeEthersProvider = new providers.Web3Provider(
    provider as providers.ExternalProvider, // TODO(gomes): Can we remove this casting?
  )

  return maybeEthersProvider
}

export const getToken0Volume24Hr = async ({
  blockNumber,
  uniswapLPContract,
}: {
  blockNumber: number
  uniswapLPContract: Contract
}) => {
  const currentBlockNumber = blockNumber
  const yesterdayBlockNumber = currentBlockNumber - 6500 // ~6500 blocks per day

  let eventFilter = uniswapLPContract.filters.Swap()
  let events = await uniswapLPContract.queryFilter(
    eventFilter,
    yesterdayBlockNumber,
    currentBlockNumber,
  )

  const token0SwapAmounts = events.map(event => {
    if (!event?.args) return bn(0)
    const { amount0In, amount0Out } = event.args

    return Number(amount0In)
      ? bnOrZero(amount0In.toString())
      : bnOrZero(amount0Out.toString())
          .div(bn(1).minus(TRADING_FEE_RATE)) // Since these are outbound txs, this corrects the value to include trading fees taken out.
          .decimalPlaces(0)
  })

  const token0Volume24hr = token0SwapAmounts.reduce((a: BN, b: BN) => bnOrZero(a).plus(b))
  return token0Volume24hr.decimalPlaces(0).valueOf()
}

export const calculateAPRFromToken0 = memoize(
  async ({
    token0Decimals,
    token0Reserves,
    blockNumber,
    uniswapLPContract,
  }: {
    token0Decimals: number
    token0Reserves: TokenAmount
    blockNumber: number
    uniswapLPContract: Contract
  }) => {
    const token0Volume24Hr = await getToken0Volume24Hr({
      blockNumber,
      uniswapLPContract,
    })

    const token0PoolReservesEquivalent = bnOrZero(token0Reserves.toFixed())
      .times(2) // Double to get equivalent of both sides of pool
      .times(bn(10).pow(token0Decimals))

    const estimatedAPR = bnOrZero(token0Volume24Hr) // 24hr volume in terms of token0
      .div(token0PoolReservesEquivalent) // Total value (both sides) of pool reserves in terms of token0
      .times(TRADING_FEE_RATE) // Trading fee rate of pool
      .times(365.25) // Days in a year
      .times(100) // To get a percentage instead of a decimal
      .decimalPlaces(4)
      .valueOf()
    return estimatedAPR
  },
)

const getTotalLpSupply = memoize(async (farmingRewardsContract: Contract) => {
  try {
    const totalSupply = await farmingRewardsContract.totalSupply()
    return bnOrZero(totalSupply.toString())
  } catch (error) {
    const errorMsg = 'totalLpSupply error'
    moduleLogger.error(error, { fn: 'totalLpSupply' }, errorMsg)
    throw new Error(errorMsg)
  }
})

// Rate of FOX given per second for all staked addresses)
const getRewardsRate = memoize(
  async (farmingRewardsContract: Contract) => await farmingRewardsContract.rewardRate(),
)

export const rewardRatePerToken = memoize(async (farmingRewardsContract: Contract) => {
  try {
    const rewardRate = await getRewardsRate(farmingRewardsContract)
    const totalSupply = await getTotalLpSupply(farmingRewardsContract)
    return bnOrZero(rewardRate.toString())
      .div(totalSupply)
      .times('1e+18')
      .decimalPlaces(0)
      .toString()
  } catch (error) {
    const errorMsg = 'rewardRatePerToken error'
    moduleLogger.error(error, errorMsg)
    throw new Error(errorMsg)
  }
})

export const makeTotalLpApr = (foxRewardRatePerToken: string, foxEquivalentPerLPToken: string) =>
  bnOrZero(foxRewardRatePerToken) // Fox Rewards per second for 1 staked LP token
    .div(foxEquivalentPerLPToken) // Equivalent FOX value for 1 LP token
    .times(100) // Decimal to percentage
    .times(3600) // 3600 seconds per hour
    .times(24) // 24 hours per day
    .times(365.25) // 365.25 days per year
    .decimalPlaces(4) // Arbitrary decimal cutoff
    .toString()
