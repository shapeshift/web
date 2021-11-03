import { caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'
import axios from 'axios'
import lodash from 'lodash'

import { tokensToOverride } from './overrides'

type UniswapToken = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
}

type UniswapTokenData = {
  name: string
  logoURI: string
  keywords: string[]
  timestamp: string
  tokens: UniswapToken[]
}

export async function getTokens(): Promise<TokenAsset[]> {
  const { data: uniswapTokenData } = await axios.get<UniswapTokenData>(
    'https://tokens.coingecko.com/uniswap/all.json'
  )

  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20

  const tokens = uniswapTokenData.tokens.map((token) => {
    const overrideToken: TokenAsset | undefined = lodash.find(
      tokensToOverride,
      (override: TokenAsset) => override.tokenId === token.address
    )

    if (overrideToken) return overrideToken

    const tokenId = token.address.toLowerCase()

    const result: TokenAsset = {
      caip19: caip19.toCAIP19({ chain, network, contractType, tokenId }),
      name: token.name,
      precision: token.decimals,
      tokenId,
      contractType: ContractTypes.ERC20,
      color: '#FFFFFF', // TODO
      secondaryColor: '#FFFFFF', // TODO
      icon: token.logoURI,
      sendSupport: true,
      receiveSupport: true,
      symbol: token.symbol
    }
    return result
  })

  return tokens
}
