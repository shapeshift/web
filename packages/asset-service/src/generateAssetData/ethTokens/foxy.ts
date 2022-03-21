import { AssetNamespace, caip2, caip19 } from '@shapeshiftoss/caip'
import { AssetDataSource, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'

export const getFoxyToken = (): TokenAsset[] => {
  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetReference = '0x61fcabb591d63d00e897a67c64658d376fead816' // FOXy contract address

  const result: TokenAsset = {
    caip19: caip19.toCAIP19({
      chain,
      network,
      assetNamespace,
      assetReference
    }),
    caip2: caip2.toCAIP2({ chain, network }),
    dataSource: AssetDataSource.CoinGecko,
    name: 'FOX Yield',
    precision: 18,
    tokenId: assetReference,
    contractType: assetNamespace,
    color: '#CE3885',
    secondaryColor: '#CE3885',
    icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/icons/foxy-icon.png',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'FOXy'
  }

  return [result]
}
