import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useEffect, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import { calculateAPRFromToken0, getEthersProvider } from '../utils'
import { useContract } from './useContract'
import { useCurrentBlockNumber } from './useCurrentBlockNumber'

export const useLpApr = () => {
  const ethersProvider = getEthersProvider()
  const [lpApr, setLpApr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const blockNumber = useCurrentBlockNumber()

  const liquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS
  const uniswapLPContract = useContract(
    ethersProvider,
    liquidityContractAddress,
    IUniswapV2Pair.abi,
  )

  useEffect(() => {
    const ethersProvider = getEthersProvider()
    if (!ethersProvider || !Fetcher || !blockNumber || !uniswapLPContract) return
    ;(async () => {
      const pair = await Fetcher.fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        ethersProvider,
      )

      const apr = await calculateAPRFromToken0({
        token0Decimals: pair.token0.decimals,
        token0Reserves: pair.reserve0,
        blockNumber,
        uniswapLPContract,
      })
      setLpApr(bnOrZero(apr).div(100).toString())
      setLoaded(true)
    })()
  }, [blockNumber, uniswapLPContract])

  return { loaded, lpApr }
}
