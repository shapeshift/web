import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import farmingAbi from '../farmingAbi.json'
import { ethersProvider, rewardRatePerToken } from '../utils'

const farmingApr = (async (): Promise<string> => {
  const liquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS
  const uniswapLPContract = new Contract(
    liquidityContractAddress,
    IUniswapV2Pair.abi,
    ethersProvider,
  )
  const farmingRewardsContract = new Contract(
    UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS,
    farmingAbi,
    ethersProvider,
  )

  const foxRewardRatePerToken = await rewardRatePerToken(farmingRewardsContract)
  const pair = await Fetcher.fetchPairData(
    new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
    new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
    ethersProvider,
  )

  const totalSupply = await uniswapLPContract.totalSupply()

  const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
    .times(2) // Double to get equivalent of both sides of pool
    .times(`1e+${pair.token1.decimals}`) // convert to base unit value

  const foxEquivalentPerLPToken = token1PoolReservesEquivalent
    .div(bnOrZero(totalSupply.toString()))
    .times(`1e+${pair.token1.decimals}`) // convert to base unit value

  const apr = bnOrZero(foxRewardRatePerToken) // Fox Rewards per second for 1 staked LP token
    .div(foxEquivalentPerLPToken) // Equivalent FOX value for 1 LP token
    .times(100) // Decimal to percentage
    .times(3600) // 3600 seconds per hour
    .times(24) // 24 hours per day
    .times(365.25) // 365.25 days per year
    .decimalPlaces(4) // Arbitrary decimal cutoff
    .toString()

  const farmingApr = bnOrZero(apr).div(100).toString()

  return farmingApr
})()

export const getFarmingApr = () => farmingApr
