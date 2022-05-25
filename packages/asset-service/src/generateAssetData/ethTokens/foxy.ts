import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { AssetDataSource, TokenAsset } from '@shapeshiftoss/types'

export const getFoxyToken = (): TokenAsset[] => {
  const assetNamespace = 'erc20'
  const assetReference = '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3' // FOXy contract address

  const result: TokenAsset = {
    assetId: toAssetId({
      chainId,
      assetNamespace,
      assetReference
    }),
    chainId,
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
