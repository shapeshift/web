import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useEffect, useMemo, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  UNISWAP_V4_WETH_FOX_FARMING_REWARDS_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import farmingAbi from '../farmingAbi.json'
import { getEthersProvider, makeTotalLpApr, rewardRatePerToken } from '../utils'
import { useCurrentBlockNumber } from './useCurrentBlockNumber'

const ethersProvider = getEthersProvider()

export const useFarmingApr = () => {
  const [farmingAprV2, setFarmingAprV2] = useState<string | null>(null)
  const [farmingAprV4, setfarmingAprV4] = useState<string | null>(null)
  const [isFarmingAprV2Loaded, setIsFarmingAprV2Loaded] = useState(false)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState(false)
  const blockNumber = useCurrentBlockNumber()

  const uniV2LiquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS

  const uniV2LPContract = useMemo(
    () => new Contract(uniV2LiquidityContractAddress, IUniswapV2Pair.abi, ethersProvider),
    [uniV2LiquidityContractAddress],
  )

  const farmingRewardsContractV2 = useMemo(
    () => new Contract(UNISWAP_V2_WETH_FOX_FARMING_REWARDS_ADDRESS, farmingAbi, ethersProvider),
    [],
  )
  const farmingRewardsContractV4 = useMemo(
    () => new Contract(UNISWAP_V4_WETH_FOX_FARMING_REWARDS_ADDRESS, farmingAbi, ethersProvider),
    [],
  )

  useEffect(() => {
    if (
      !ethersProvider ||
      !Fetcher ||
      !blockNumber ||
      !uniV2LPContract ||
      !farmingRewardsContractV2 ||
      !farmingRewardsContractV4
    )
      return
    ;(async () => {
      const foxRewardRatePerTokenV2 = await rewardRatePerToken(farmingRewardsContractV2)
      const foxRewardRatePerTokenV4 = await rewardRatePerToken(farmingRewardsContractV4)

      const pair = await Fetcher.fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        ethersProvider,
      )

      const totalSupplyV2 = await uniV2LPContract.totalSupply()

      const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
        .times(2) // Double to get equivalent of both sides of pool
        .times(`1e+${pair.token1.decimals}`) // convert to base unit value

      const foxEquivalentPerLPToken = token1PoolReservesEquivalent
        .div(bnOrZero(totalSupplyV2.toString()))
        .times(`1e+${pair.token1.decimals}`) // convert to base unit value
        .toString()

      const aprV2 = makeTotalLpApr(foxRewardRatePerTokenV2, foxEquivalentPerLPToken) // Fox Rewards per second for 1 staked LP token
      const aprV4 = makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken) // Fox Rewards per second for 1 staked LP token

      setFarmingAprV2(bnOrZero(aprV2).div(100).toString())
      setfarmingAprV4(bnOrZero(aprV4).div(100).toString())
      setIsFarmingAprV2Loaded(true)
      setIsFarmingAprV4Loaded(true)
    })()
  }, [blockNumber, uniV2LPContract, farmingRewardsContractV2, farmingRewardsContractV4])

  return { isFarmingAprV2Loaded, isFarmingAprV4Loaded, farmingAprV2, farmingAprV4 }
}
