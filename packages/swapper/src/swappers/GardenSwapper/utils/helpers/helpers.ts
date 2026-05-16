import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  baseChainId,
  bscChainId,
  btcChainId,
  ethChainId,
  fromAssetId,
  hyperEvmChainId,
  ltcChainId,
  megaethChainId,
  monadChainId,
  starknetChainId,
} from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { lookupGardenAssetByAssetId } from '../../gardenAssetRegistry'
import type { GardenOrder } from '../../types'

export const GardenSupportedSourceChainIds: readonly ChainId[] = [
  btcChainId,
  ltcChainId,
  ethChainId,
  baseChainId,
  bscChainId,
  arbitrumChainId,
  monadChainId,
  hyperEvmChainId,
  megaethChainId,
  starknetChainId,
]

const gardenSupportedSourceChainIdSet = new Set(GardenSupportedSourceChainIds)

export const assetIdToGardenAssetId = (assetId: AssetId): string | undefined =>
  lookupGardenAssetByAssetId(assetId)?.id

export const isSupportedGardenPair = (sellAssetId: AssetId, buyAssetId: AssetId): boolean => {
  if (!gardenSupportedSourceChainIdSet.has(fromAssetId(sellAssetId).chainId)) return false
  const sell = assetIdToGardenAssetId(sellAssetId)
  const buy = assetIdToGardenAssetId(buyAssetId)
  if (!sell || !buy) return false
  if (sell === buy) return false
  return true
}

export const mapGardenOrderToTxStatus = (
  order: GardenOrder,
): {
  status: TxStatus
  buyTxHash?: string
  message?: string
  actualBuyAmountCryptoBaseUnit?: string
} => {
  if (order.destination_swap.redeem_tx_hash) {
    return {
      status: TxStatus.Confirmed,
      buyTxHash: order.destination_swap.redeem_tx_hash,
      actualBuyAmountCryptoBaseUnit: order.destination_swap.filled_amount,
    }
  }

  if (order.source_swap.refund_tx_hash || order.destination_swap.refund_tx_hash) {
    return { status: TxStatus.Failed, message: 'Swap refunded' }
  }

  return { status: TxStatus.Pending }
}

export const isNoRouteFoundError = (errorMessage: string | undefined): boolean =>
  errorMessage !== undefined && errorMessage.includes('No order pair found')

export const isOutOfRangeError = (errorMessage: string | undefined): boolean =>
  errorMessage !== undefined && errorMessage.includes('expected amount to be within the range')

export const isInsufficientLiquidityError = (errorMessage: string | undefined): boolean =>
  errorMessage !== undefined && errorMessage.toLowerCase().includes('insufficient liquidity')
