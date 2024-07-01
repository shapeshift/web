import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'

import type { ZrxSupportedChainId } from '../../types'
import { zrxSupportedChainIds } from '../../types'

export const baseUrlFromChainId = (chainId: ZrxSupportedChainId): string => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return 'https://0x.shapeshift.com/ethereum/'
    case KnownChainIds.AvalancheMainnet:
      return 'https://0x.shapeshift.com/avalanche/'
    case KnownChainIds.OptimismMainnet:
      return 'https://0x.shapeshift.com/optimism/'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'https://0x.shapeshift.com/bnbsmartchain/'
    case KnownChainIds.PolygonMainnet:
      return 'https://0x.shapeshift.com/polygon/'
    case KnownChainIds.ArbitrumMainnet:
      return 'https://0x.shapeshift.com/arbitrum/'
    case KnownChainIds.BaseMainnet:
      return 'https://0x.shapeshift.com/base/'
    default:
      assertUnreachable(chainId)
  }
}

// converts an asset to zrx token (symbol or contract address)
export const assetToToken = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)
  return assetNamespace === 'slip44' ? asset.symbol : assetReference
}

export const isSupportedChainId = (chainId: ChainId): chainId is ZrxSupportedChainId => {
  return zrxSupportedChainIds.includes(chainId as ZrxSupportedChainId)
}
