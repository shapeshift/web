import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'

import type { AffiliateFee } from '../../types'

export type AffiliateFeeStrategy = 'buy_asset' | 'sell_asset' | 'fixed_asset'

type BuildAffiliateFeeParams = {
  strategy: AffiliateFeeStrategy
  affiliateBps: string
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  fixedAsset?: Asset
  fixedAssetId?: AssetId
  isEstimate?: boolean
}

export const buildAffiliateFee = (params: BuildAffiliateFeeParams): AffiliateFee | undefined => {
  const {
    strategy,
    affiliateBps,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    buyAmountCryptoBaseUnit,
    fixedAsset,
    fixedAssetId,
    isEstimate,
  } = params

  if (bnOrZero(affiliateBps).lte(0)) return undefined

  const bpsDecimal = bn(affiliateBps).div(10000)

  switch (strategy) {
    case 'buy_asset': {
      const feeAmount = bnOrZero(buyAmountCryptoBaseUnit).times(bpsDecimal).toFixed(0)
      return {
        assetId: buyAsset.assetId,
        amountCryptoBaseUnit: feeAmount,
        asset: buyAsset,
        isEstimate,
      }
    }
    case 'sell_asset': {
      const feeAmount = bnOrZero(sellAmountCryptoBaseUnit).times(bpsDecimal).toFixed(0)
      return {
        assetId: sellAsset.assetId,
        amountCryptoBaseUnit: feeAmount,
        asset: sellAsset,
        isEstimate,
      }
    }
    case 'fixed_asset': {
      if (!fixedAsset || !fixedAssetId) return undefined
      return {
        assetId: fixedAssetId,
        amountCryptoBaseUnit: '0',
        asset: fixedAsset,
        isEstimate: true,
      }
    }
    default:
      return undefined
  }
}
