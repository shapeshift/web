import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertPrecision } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { BebopSupportedChainId } from '../../types'
import {
  BEBOP_NATIVE_TOKEN_ADDRESS,
  bebopSupportedChainIds,
  chainIdToBebopChain,
} from '../../types'
import { BEBOP_NATIVE_ASSET_ADDRESS } from '../constants'

// Converts an asset to Bebop token format (checksummed address or native token marker)
export const assetIdToBebopToken = (assetId: AssetId): string => {
  const { assetReference, assetNamespace } = fromAssetId(assetId)
  // For native assets, use Bebop's special native token address
  if (assetNamespace === 'slip44') {
    return BEBOP_NATIVE_ASSET_ADDRESS
  }
  // For ERC20 tokens, return checksummed address (required by Bebop API)
  return getAddress(assetReference)
}

// Converts Bebop token to AssetId
export const bebopTokenToAssetId = (token: string, chainId: ChainId): AssetId => {
  const checksummedToken = getAddress(token)
  const isNativeToken = checksummedToken === BEBOP_NATIVE_TOKEN_ADDRESS

  const { assetReference, assetNamespace } = (() => {
    if (!isNativeToken) {
      return {
        assetReference: token,
        assetNamespace:
          chainId === KnownChainIds.BnbSmartChainMainnet
            ? ASSET_NAMESPACE.bep20
            : ASSET_NAMESPACE.erc20,
      }
    }

    // Map native tokens based on chain
    switch (chainId as BebopSupportedChainId) {
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

// Check if chain is supported by Bebop
export const isSupportedChainId = (chainId: ChainId): chainId is BebopSupportedChainId => {
  return bebopSupportedChainIds.includes(chainId as BebopSupportedChainId)
}

// Get Bebop chain name from chainId
export const getBebopChainName = (chainId: ChainId): string => {
  if (!isSupportedChainId(chainId)) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }
  return chainIdToBebopChain[chainId]
}

// Validate trade parameters
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
        details: { chainId: buyAsset.chainId },
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

// Calculate exchange rate
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

// Build Bebop API URL
export const buildBebopApiUrl = (chainName: string, endpoint: string): string => {
  return `https://api.bebop.xyz/router/${chainName}/v1/${endpoint}`
}

// Format amount for Bebop API (requires string without decimals)
export const formatBebopAmount = (amount: string): string => {
  // Bebop expects amounts as integers without decimals
  return bn(amount).toFixed(0)
}

// Check if native ETH is being sold (not supported by Bebop)
export const isNativeEthSell = (sellAsset: Asset): boolean => {
  const { assetNamespace } = fromAssetId(sellAsset.assetId)
  return assetNamespace === 'slip44' && sellAsset.chainId === KnownChainIds.EthereumMainnet
}

// Get slippage tolerance in basis points
export const getSlippageTolerance = (slippagePercentage?: string): number => {
  // Default to 0.3% if not provided
  const defaultSlippage = 0.3
  if (!slippagePercentage) return defaultSlippage

  // Bebop expects slippage as a percentage number (0-50, where 1 = 1%)
  // slippagePercentage is in decimal format (e.g., 0.003 = 0.3%, 0.01 = 1%)
  // Need to multiply by 100 to convert to percentage (0.003 * 100 = 0.3%, 0.01 * 100 = 1%)
  return parseFloat(slippagePercentage) * 100
}
