import { toAssetId, toChainId } from '@shapeshiftoss/caip'
import { AssetDataSource, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'
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

export async function getUniswapTokens(): Promise<TokenAsset[]> {
  const { data: uniswapTokenData } = await axios.get<UniswapTokenData>(
    'https://tokens.coingecko.com/uniswap/all.json'
  )

  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const assetNamespace = 'erc20'

  return uniswapTokenData.tokens.reduce<TokenAsset[]>((acc, token) => {
    const overrideToken: TokenAsset | undefined = lodash.find(
      tokensToOverride,
      (override: TokenAsset) => override.tokenId === token.address
    )

    if (overrideToken) {
      acc.push(overrideToken)
      return acc
    }

    const assetReference = token.address.toLowerCase()

    if (!assetReference) {
      // if no token address, we can't deal with this asset.
      return acc
    }
    const result: TokenAsset = {
      assetId: toAssetId({ chain, network, assetNamespace, assetReference }),
      chainId: toChainId({ chain, network }),
      dataSource: AssetDataSource.CoinGecko,
      name: token.name,
      precision: token.decimals,
      tokenId: assetReference,
      contractType: assetNamespace,
      color: '#FFFFFF', // TODO
      secondaryColor: '#FFFFFF', // TODO
      icon: token.logoURI,
      sendSupport: true,
      receiveSupport: true,
      symbol: token.symbol
    }
    acc.push(result)
    return acc
  }, [])
}
