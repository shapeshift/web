import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { useEffect, useMemo, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNIV2_WETH_FOX_POOL_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import { calculateAPRFromToken0, getEthersProvider } from '../utils'
import { useCurrentBlockNumber } from './useCurrentBlockNumber'

// TODO: use wagmi provider
const maybeEthersProvider = (skip?: boolean) => (skip ? null : getEthersProvider())

const fetchPairData = memoize(
  async (
    tokenA: Token,
    tokenB: Token,
    fetchPairData: typeof Fetcher['fetchPairData'],
    provider: providers.Web3Provider,
  ) => await fetchPairData(tokenA, tokenB, provider),
)

type UseLpAprInput = {
  skip?: boolean
}

export const useLpApr = ({ skip }: UseLpAprInput = {}) => {
  const [lpApr, setLpApr] = useState<string | null>(null)
  const [isLpAprLoaded, setIsLpAprLoaded] = useState(false)
  const blockNumber = useCurrentBlockNumber({ skip })

  const liquidityContractAddress = UNIV2_WETH_FOX_POOL_ADDRESS
  const uniswapLPContract = useMemo(() => {
    if (skip) return null
    const ethersProvider = maybeEthersProvider(skip)
    if (!ethersProvider) return
    return new Contract(liquidityContractAddress, IUniswapV2Pair.abi, ethersProvider)
  }, [skip, liquidityContractAddress])

  useEffect(() => {
    if (skip || !Fetcher || !blockNumber || !uniswapLPContract) return
    const ethersProvider = maybeEthersProvider(skip)
    if (!ethersProvider) return
    ;(async () => {
      const pair = await fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        Fetcher.fetchPairData,
        ethersProvider,
      )

      const apr = await calculateAPRFromToken0({
        token0Decimals: pair.token0.decimals,
        token0Reserves: pair.reserve0,
        blockNumber,
        uniswapLPContract,
      })
      setLpApr(bnOrZero(apr).div(100).toString())
      setIsLpAprLoaded(true)
    })()
  }, [blockNumber, skip, uniswapLPContract])

  return { isLpAprLoaded, lpApr }
}
