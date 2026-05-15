import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'

import { isGardenPairBlacklisted, lookupGardenAssetByAssetId } from '../../gardenAssetRegistry'
import type { GardenOrder } from '../../types'

export const slippageDecimalToBps = (slippageDecimal: string | undefined): number => {
  if (slippageDecimal === undefined) return 0
  return bnOrZero(slippageDecimal).times(10000).toNumber()
}

export const assetIdToGardenAssetId = (assetId: AssetId): string | undefined =>
  lookupGardenAssetByAssetId(assetId)?.id

export const isSupportedGardenPair = (sellAssetId: AssetId, buyAssetId: AssetId): boolean => {
  const sell = assetIdToGardenAssetId(sellAssetId)
  const buy = assetIdToGardenAssetId(buyAssetId)
  if (!sell || !buy) return false
  if (sell === buy) return false
  return !isGardenPairBlacklisted(sell, buy)
}

export const mapGardenOrderToTxStatus = (
  order: GardenOrder,
): { status: TxStatus; buyTxHash?: string; message?: string } => {
  if (order.destination_swap.redeem_tx_hash) {
    return {
      status: TxStatus.Confirmed,
      buyTxHash: order.destination_swap.redeem_tx_hash,
    }
  }

  if (order.source_swap.refund_tx_hash || order.destination_swap.refund_tx_hash) {
    return { status: TxStatus.Failed, message: 'Swap refunded' }
  }

  if (order.deadline && order.deadline > 0 && Date.now() / 1000 > order.deadline) {
    return { status: TxStatus.Failed, message: 'Order expired' }
  }

  return { status: TxStatus.Pending }
}

export const isNoRouteFoundError = (errorMessage: string | undefined): boolean => {
  if (!errorMessage) return false
  return errorMessage.includes('No order pair found')
}

export const isOutOfRangeError = (errorMessage: string | undefined): boolean => {
  if (!errorMessage) return false
  return errorMessage.includes('expected amount to be within the range')
}

export const isInsufficientLiquidityError = (errorMessage: string | undefined): boolean => {
  if (!errorMessage) return false
  return errorMessage.toLowerCase().includes('insufficient liquidity')
}

export const getGardenSourceChainId = (sellAssetId: AssetId): ChainId => {
  const { chainId } = fromAssetId(sellAssetId)
  return chainId
}
