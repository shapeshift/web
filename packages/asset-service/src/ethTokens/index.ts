import axios from 'axios'
import { ContractTypes, TokenData } from '../types'
import lodash from 'lodash'
import { tokensToOverride } from './overrides'

export type CoingeckoTokenData = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
}

export async function getTokens(): Promise<TokenData[]> {
  const { data: uniswapTokenData } = await axios.get(
    'https://tokens.coingecko.com/uniswap/all.json'
  )

  const tokens = uniswapTokenData.tokens.map((token: CoingeckoTokenData) => {
    const overrideToken: TokenData | undefined = lodash.find(
      tokensToOverride,
      (override: TokenData) => override.contractAddress === token.address
    )

    if (overrideToken) return overrideToken

    return {
      displayName: token.name,
      precision: token.decimals,
      contractAddress: token.address,
      contractType: ContractTypes.ERC20,
      color: '#FFFFFF', // TODO
      secondaryColor: '#FFFFFF', // TODO
      icon: token.logoURI,
      explorer: 'https://etherscan.io',
      explorerTxLink: 'https://etherscan.io/tx/',
      sendSupport: true,
      receiveSupport: true,
      symbol: token.symbol
    }
  })

  return tokens
}
