import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { getAddress } from 'viem'

import type { ZrxSupportedChainId } from '../../types'
import { zrxSupportedChainIds } from '../../types'
import { ZRX_NATIVE_ASSET_ADDRESS } from '../constants'

export const baseUrlFromChainId = (zrxBaseUrl: string, chainId: ZrxSupportedChainId): string => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return `${zrxBaseUrl}ethereum/`
    case KnownChainIds.AvalancheMainnet:
      return `${zrxBaseUrl}avalanche/`
    case KnownChainIds.OptimismMainnet:
      return `${zrxBaseUrl}optimism/`
    case KnownChainIds.BnbSmartChainMainnet:
      return `${zrxBaseUrl}bnbsmartchain/`
    case KnownChainIds.PolygonMainnet:
      return `${zrxBaseUrl}polygon/`
    case KnownChainIds.ArbitrumMainnet:
      return `${zrxBaseUrl}arbitrum/`
    case KnownChainIds.BaseMainnet:
      return `${zrxBaseUrl}base/`
    default:
      assertUnreachable(chainId)
  }
}

// converts an asset to zrx token (symbol or contract address)
export const assetIdToZrxToken = (assetId: AssetId): string => {
  const { assetReference, assetNamespace } = fromAssetId(assetId)
  return assetNamespace === 'slip44' ? ZRX_NATIVE_ASSET_ADDRESS : assetReference
}

export const zrxTokenToAssetId = (token: string, chainId: ChainId): AssetId => {
  const isDefaultAddress = getAddress(token) === ZRX_NATIVE_ASSET_ADDRESS

  const { assetReference, assetNamespace } = (() => {
    if (!isDefaultAddress)
      return {
        assetReference: token,
        assetNamespace:
          chainId === KnownChainIds.BnbSmartChainMainnet
            ? ASSET_NAMESPACE.bep20
            : ASSET_NAMESPACE.erc20,
      }
    switch (chainId as ZrxSupportedChainId) {
      case KnownChainIds.EthereumMainnet:
        return {
          assetReference: ASSET_REFERENCE.Ethereum,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.AvalancheMainnet:
        return {
          assetReference: ASSET_REFERENCE.AvalancheC,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.OptimismMainnet:
        return {
          assetReference: ASSET_REFERENCE.Optimism,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.BnbSmartChainMainnet:
        return {
          assetReference: ASSET_REFERENCE.BnbSmartChain,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.PolygonMainnet:
        return {
          assetReference: ASSET_REFERENCE.Polygon,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.ArbitrumMainnet:
        return {
          assetReference: ASSET_REFERENCE.Arbitrum,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      case KnownChainIds.BaseMainnet:
        return {
          assetReference: ASSET_REFERENCE.Base,
          assetNamespace: ASSET_NAMESPACE.slip44,
        }
      default:
        throw Error(`chainId '${chainId}' not supported`)
    }
  })()

  return toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
}

export const isSupportedChainId = (chainId: ChainId): chainId is ZrxSupportedChainId => {
  return zrxSupportedChainIds.includes(chainId as ZrxSupportedChainId)
}
