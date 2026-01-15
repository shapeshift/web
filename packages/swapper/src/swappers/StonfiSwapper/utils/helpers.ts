import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Err } from '@sniptt/monads'
import { Blockchain } from '@ston-fi/omniston-sdk'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { OmnistonAssetAddress, TonAssetValidationResult } from '../types'

export const isTonAsset = (asset: Asset): boolean => {
  return asset.chainId === KnownChainIds.TonMainnet
}

export const assetToOmnistonAddress = (asset: Asset): OmnistonAssetAddress | null => {
  if (!isTonAsset(asset)) return null

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  if (assetNamespace === 'slip44') {
    return {
      blockchain: Blockchain.TON,
      address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    }
  }

  if (assetNamespace === 'jetton') {
    return { blockchain: Blockchain.TON, address: assetReference }
  }

  return null
}

export const validateTonAssets = (sellAsset: Asset, buyAsset: Asset): TonAssetValidationResult => {
  if (sellAsset.chainId !== KnownChainIds.TonMainnet) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Unsupported sell asset chain: ${sellAsset.chainId}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      ),
    }
  }

  if (buyAsset.chainId !== KnownChainIds.TonMainnet) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Cross-chain swaps not supported`,
          code: TradeQuoteError.CrossChainNotSupported,
        }),
      ),
    }
  }

  const bidAssetAddress = assetToOmnistonAddress(sellAsset)
  const askAssetAddress = assetToOmnistonAddress(buyAsset)

  if (!bidAssetAddress || !askAssetAddress) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Unable to convert assets to Omniston addresses`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      ),
    }
  }

  return {
    isValid: true,
    bidAssetAddress,
    askAssetAddress,
  }
}

export const calculateRate = (
  buyAmountCryptoBaseUnit: string,
  sellAmountCryptoBaseUnit: string,
  buyAssetPrecision: number,
  sellAssetPrecision: number,
): string => {
  if (BigInt(buyAmountCryptoBaseUnit) > 0n && BigInt(sellAmountCryptoBaseUnit) > 0n) {
    return (
      Number(buyAmountCryptoBaseUnit) /
      Math.pow(10, buyAssetPrecision) /
      (Number(sellAmountCryptoBaseUnit) / Math.pow(10, sellAssetPrecision))
    ).toString()
  }
  return '0'
}

export const slippageDecimalToBps = (
  slippageTolerancePercentageDecimal: string | undefined,
  defaultSlippageBps: number,
): number => {
  return slippageTolerancePercentageDecimal
    ? Math.round(parseFloat(slippageTolerancePercentageDecimal) * 10000)
    : defaultSlippageBps
}
