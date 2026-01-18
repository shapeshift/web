import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertPrecision } from '@shapeshiftoss/utils'
import { Err } from '@sniptt/monads'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { DedustAssetAddress, DedustAssetValidationResult } from '../types'
import { DEDUST_DEFAULT_SLIPPAGE_BPS } from './constants'

export const isTonAsset = (asset: Asset): boolean => {
  return asset.chainId === KnownChainIds.TonMainnet
}

export const assetToDedustAddress = (asset: Asset): DedustAssetAddress | null => {
  if (!isTonAsset(asset)) return null

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  if (assetNamespace === 'slip44') {
    return {
      type: 'native',
      address: 'native',
    }
  }

  if (assetNamespace === 'jetton') {
    return { type: 'jetton', address: assetReference }
  }

  return null
}

export const validateTonAssets = (
  sellAsset: Asset,
  buyAsset: Asset,
): DedustAssetValidationResult => {
  if (sellAsset.chainId !== KnownChainIds.TonMainnet) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[DeDust] Unsupported sell asset chain: ${sellAsset.chainId}`,
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
          message: `[DeDust] Cross-chain swaps not supported`,
          code: TradeQuoteError.CrossChainNotSupported,
        }),
      ),
    }
  }

  const sellAssetAddress = assetToDedustAddress(sellAsset)
  const buyAssetAddress = assetToDedustAddress(buyAsset)

  if (!sellAssetAddress || !buyAssetAddress) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[DeDust] Unable to convert assets to DeDust addresses`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      ),
    }
  }

  return {
    isValid: true,
    sellAssetAddress,
    buyAssetAddress,
  }
}

export const calculateRate = (
  buyAmountCryptoBaseUnit: string,
  sellAmountCryptoBaseUnit: string,
  buyAssetPrecision: number,
  sellAssetPrecision: number,
): string => {
  if (bn(buyAmountCryptoBaseUnit).gt(0) && bn(sellAmountCryptoBaseUnit).gt(0)) {
    return convertPrecision({
      value: buyAmountCryptoBaseUnit,
      inputExponent: buyAssetPrecision,
      outputExponent: sellAssetPrecision,
    })
      .dividedBy(bn(sellAmountCryptoBaseUnit))
      .toFixed()
  }
  return '0'
}

export const slippageDecimalToBps = (
  slippageTolerancePercentageDecimal: string | undefined,
  defaultSlippageBps: number = DEDUST_DEFAULT_SLIPPAGE_BPS,
): number => {
  if (!slippageTolerancePercentageDecimal) {
    return defaultSlippageBps
  }

  const parsed = parseFloat(slippageTolerancePercentageDecimal)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return defaultSlippageBps
  }

  return Math.round(parsed * 10000)
}

export const calculateMinBuyAmount = (
  buyAmountCryptoBaseUnit: string,
  slippageBps: number,
): string => {
  const slippageMultiplier = bn(1).minus(bn(slippageBps).div(10000))
  return bn(buyAmountCryptoBaseUnit).times(slippageMultiplier).integerValue().toFixed()
}
