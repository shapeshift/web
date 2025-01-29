import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable, bn, convertPrecision } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { ZrxFees, ZrxSupportedChainId } from '../../types'
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
      return assertUnreachable(chainId)
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

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}) => {
  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

export const calculateRate = ({
  buyAmount,
  sellAmount,
  buyAsset,
  sellAsset,
}: {
  buyAmount: string
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
}) => {
  // For the rate to be valid, both amounts must be converted to the same precision
  return convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()
}

export const calculateBuyAmountBeforeFeesCryptoBaseUnit = ({
  buyAmount,
  fees,
  buyAsset,
  sellAsset,
}: {
  buyAmount: string
  fees: ZrxFees
  buyAsset: Asset
  sellAsset: Asset
}) => {
  // The integrator fee is set to the buy asset, but paranoia
  if (
    fees.integratorFee !== null &&
    fees.integratorFee.token !== assetIdToZrxToken(buyAsset.assetId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unhandled integrator fee asset '${fees.integratorFee.token}'`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  // We can safely add the integrator fee now we know its the correct asset.
  const integratorFeeCryptoBaseUnit = fees.integratorFee?.amount ?? '0'

  return bn(buyAmount).plus(integratorFeeCryptoBaseUnit).toFixed()
}

export const getProtocolFees = ({
  fees,
  sellAsset,
  assetsById,
}: {
  fees: ZrxFees
  sellAsset: Asset
  assetsById: AssetsByIdPartial
}) => {
  if (!fees.zeroExFee) return {}

  const assetId = zrxTokenToAssetId(fees.zeroExFee.token, sellAsset.chainId)

  return {
    [assetId]: {
      requiresBalance: false,
      amountCryptoBaseUnit: fees.zeroExFee.amount,
      asset: assetsById[assetId],
    },
  }
}
