import { toAssetId, toChainId } from '@shapeshiftoss/caip'
import { AssetDataSource, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'

export const getFoxyToken = (): TokenAsset[] => {
  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const assetNamespace = 'erc20'
  const assetReference = '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3' // FOXy contract address

  const result: TokenAsset = {
    assetId: toAssetId({
      chain,
      network,
      assetNamespace,
      assetReference
    }),
    chainId: toChainId({ chain, network }),
    dataSource: AssetDataSource.CoinGecko,
    name: 'FOX Yieldy',
    precision: 18,
    tokenId: assetReference,
    contractType: assetNamespace,
    color: '#CE3885',
    secondaryColor: '#CE3885',
    icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'FOXy'
  }

  return [result]
}
