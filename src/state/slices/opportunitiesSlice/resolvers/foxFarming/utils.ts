import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'

export const fetchPairData = memoize(
  async (
    tokenA: Token,
    tokenB: Token,
    fetchPairData: typeof Fetcher['fetchPairData'],
    provider: providers.Web3Provider,
  ) => await fetchPairData(tokenA, tokenB, provider),
)
