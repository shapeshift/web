import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useEffect, useMemo, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_WETH_FOX_FARMING_REWARDS_V4_ADDRESS,
  UNIV2_WETH_FOX_POOL_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import farmingAbi from '../farmingAbi.json'
import { getEthersProvider, makeTotalLpApr, rewardRatePerToken } from '../utils'
import { useCurrentBlockNumber } from './useCurrentBlockNumber'

// TODO: use wagmi provider
const maybeEthersProvider = (skip?: boolean) => (skip ? null : getEthersProvider())

type UseFarmingAprInput = {
  skip?: boolean
}

export const useFarmingApr = ({ skip }: UseFarmingAprInput = {}) => {
  const [farmingAprV4, setfarmingAprV4] = useState<string | null>(null)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState(false)
  const blockNumber = useCurrentBlockNumber({ skip })

  const uniV2LiquidityContractAddress = UNIV2_WETH_FOX_POOL_ADDRESS

  const uniV2LPContract = useMemo(() => {
    if (skip) return null
    const ethersProvider = maybeEthersProvider(skip)
    if (!ethersProvider) return
    return new Contract(uniV2LiquidityContractAddress, IUniswapV2Pair.abi, ethersProvider)
  }, [skip, uniV2LiquidityContractAddress])

  const farmingRewardsContractV4 = useMemo(() => {
    if (skip) return null
    const ethersProvider = maybeEthersProvider(skip)
    if (!ethersProvider) return
    return new Contract(UNISWAP_WETH_FOX_FARMING_REWARDS_V4_ADDRESS, farmingAbi, ethersProvider)
  }, [skip])

  useEffect(() => {
    if (skip || !Fetcher || !blockNumber || !uniV2LPContract || !farmingRewardsContractV4) return

    const ethersProvider = maybeEthersProvider(skip)
    if (!ethersProvider) return
    ;(async () => {
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

      const aprV4 = makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken) // Fox Rewards per second for 1 staked LP token

      setfarmingAprV4(bnOrZero(aprV4).div(100).toString())
      setIsFarmingAprV4Loaded(true)
    })()
  }, [skip, blockNumber, uniV2LPContract, farmingRewardsContractV4])

  return { isFarmingAprV4Loaded, farmingAprV4 }
}
