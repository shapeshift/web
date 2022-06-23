import { Contract } from '@ethersproject/contracts'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../const'
import { calculateAPRFromToken0, ethersProvider } from '../utils'
import { getCurrentBlockNumber } from './getCurrentBlockNumber'

const lpApr = (async (): Promise<string> => {
  const blockNumber = await getCurrentBlockNumber()

  if (!blockNumber) return ''

  const liquidityContractAddress = UNISWAP_V2_WETH_FOX_POOL_ADDRESS
  const uniswapLPContract = new Contract(
    liquidityContractAddress,
    IUniswapV2Pair.abi,
    ethersProvider,
  )

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

  const lpApr = bnOrZero(apr).div(100).toString()
  return lpApr
})()

export const getLpApr = () => lpApr
