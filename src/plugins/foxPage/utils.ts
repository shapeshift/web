import { Contract } from '@ethersproject/contracts'
import { TokenAmount } from '@uniswap/sdk'
import { providers } from 'ethers'
import { BN, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { getWeb3Instance } from 'lib/web3-instance'

import { TRADING_FEE_RATE } from './const'

const moduleLogger = logger.child({
  namespace: ['Plugins', 'FoxPage', 'Utils'],
})

// The provider we get from getWeb3Instance is a web3.js Provider
// But uniswap SDK needs a Web3Provider from ethers.js
export const getEthersProvider = () => {
  const provider = getWeb3Instance().currentProvider

  const ethersProvider = new providers.Web3Provider(
    provider as providers.ExternalProvider, // TODO(gomes): Can we remove this casting?
  )

  return ethersProvider
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
    if (!event?.args) return bnOrZero(0)
    const { amount0In, amount0Out } = event.args

    return Number(amount0In)
      ? bnOrZero(amount0In.toString())
      : bnOrZero(amount0Out.toString())
          .div(bnOrZero(1).minus(TRADING_FEE_RATE)) // Since these are outbound txs, this corrects the value to include trading fees taken out.
          .decimalPlaces(0)
  })

  const token0Volume24hr = token0SwapAmounts.reduce((a: BN, b: BN) => bnOrZero(a).plus(b))
  return token0Volume24hr.decimalPlaces(0).valueOf()
}

export const calculateAPRFromToken0 = async ({
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
    .times(bnOrZero(10).pow(token0Decimals))

  const estimatedAPR = bnOrZero(token0Volume24Hr) // 24hr volume in terms of token0
    .div(token0PoolReservesEquivalent) // Total value (both sides) of pool reserves in terms of token0
    .times(TRADING_FEE_RATE) // Trading fee rate of pool
    .times(365.25) // Days in a year
    .times(100) // To get a percentage instead of a decimal
    .decimalPlaces(4)
    .valueOf()
  return estimatedAPR
}

export const totalLpSupply = async (farmingRewardsContract: Contract) => {
  try {
    const totalSupply = await farmingRewardsContract.totalSupply()
    return bnOrZero(totalSupply.toString())
  } catch (error) {
    const errorMsg = 'totalLpSupply error'
    moduleLogger.error(error, { fn: 'totalLpSupply' }, errorMsg)
<<<<<<< HEAD
=======
    console.error(error, errorMsg)
>>>>>>> 1e431401 (chore: use moduleLogger.error)
    throw new Error(errorMsg)
  }
}

export const rewardRatePerToken = async (farmingRewardsContract: Contract) => {
  try {
    const rewardRate = await farmingRewardsContract.rewardRate() // Rate of FOX given per second for all staked addresses
    const totalSupply = await totalLpSupply(farmingRewardsContract)
    return bnOrZero(rewardRate.toString())
      .div(totalSupply)
      .times('1e+18')
      .decimalPlaces(0)
      .toString()
  } catch (error) {
    const errorMsg = 'rewardRatePerToken error'
    console.error(error, errorMsg)
    throw new Error(errorMsg)
  }
}
