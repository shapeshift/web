import { AssetNamespace } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const chainTypeToLabel = (chain: ChainTypes): string => {
  switch (chain) {
    case ChainTypes.Cosmos:
      return 'Cosmos'
    case ChainTypes.Osmosis:
      return 'Osmosis'
    default: {
      return ''
    }
  }
}

export const chainTypeToMainNetNetworkType = (chain: ChainTypes): NetworkTypes => {
  switch (chain) {
    case ChainTypes.Cosmos:
      return NetworkTypes.COSMOSHUB_MAINNET
    case ChainTypes.Osmosis:
      return NetworkTypes.OSMOSIS_MAINNET
    default:
      return NetworkTypes.MAINNET
  }
}

export const chainTypeToAssetNamespace = (chain: ChainTypes): AssetNamespace => {
  switch (chain) {
    case ChainTypes.Cosmos:
    case ChainTypes.Osmosis:
      return AssetNamespace.Slip44
    default:
      return AssetNamespace.ERC20
  }
}
