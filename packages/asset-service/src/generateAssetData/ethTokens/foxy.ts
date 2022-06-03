import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const getFoxyToken = (): Asset[] => {
  const assetNamespace = 'erc20'
  const assetReference = '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3' // FOXy contract address

  const result: Asset = {
    assetId: toAssetId({
      chainId,
      assetNamespace,
      assetReference
    }),
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    chainId,
    name: 'FOX Yieldy',
    precision: 18,
    color: '#CE3885',
    icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
    symbol: 'FOXy',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/'
  }

  return [result]
}
