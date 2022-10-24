import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'plugins/foxPage/utils'

export const ethersProvider = getEthersProvider()

export const fetchPairData = memoize(
  async (
    tokenA: Token,
    tokenB: Token,
    fetchPairData: typeof Fetcher['fetchPairData'],
    provider: providers.Web3Provider,
  ) => await fetchPairData(tokenA, tokenB, provider),
)
