import type { Asset, AssetId } from '../types'
import { isEvmChainId } from '../types'

const SHAPESHIFT_APP_URL = 'https://app.shapeshift.com'

export type RedirectParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountBaseUnit?: string
  affiliateAddress?: string
}

/**
 * Build a ShapeShift trade URL using the web app's hash-based route format:
 * https://app.shapeshift.com/#/trade/{buyChainId}/{buyAssetSubId}/{sellChainId}/{sellAssetSubId}/{sellAmountBaseUnit}?affiliate=0x...
 *
 * Asset IDs are CAIP-19 format like "eip155:1/slip44:60" where the first segment is the chainId
 * and the second segment is the asset sub-identifier.
 */
export const buildShapeShiftTradeUrl = (params: RedirectParams): string => {
  const { sellAssetId, buyAssetId, sellAmountBaseUnit, affiliateAddress } = params

  // CAIP-19 assetIds have format "chainId/assetSubId" e.g. "eip155:1/slip44:60"
  // The first "/" separates chainId from assetSubId
  const buySlashIdx = buyAssetId.indexOf('/')
  const buyChainId = buyAssetId.substring(0, buySlashIdx)
  const buyAssetSubId = buyAssetId.substring(buySlashIdx + 1)

  const sellSlashIdx = sellAssetId.indexOf('/')
  const sellChainId = sellAssetId.substring(0, sellSlashIdx)
  const sellAssetSubId = sellAssetId.substring(sellSlashIdx + 1)

  const amount = sellAmountBaseUnit || '0'
  const affiliate = affiliateAddress ? `?affiliate=${encodeURIComponent(affiliateAddress)}` : ''

  return `${SHAPESHIFT_APP_URL}/#/trade/${buyChainId}/${buyAssetSubId}/${sellChainId}/${sellAssetSubId}/${amount}${affiliate}`
}

export const redirectToShapeShift = (params: RedirectParams): void => {
  window.open(buildShapeShiftTradeUrl(params), '_blank', 'noopener,noreferrer')
}

export type ChainType = 'evm' | 'utxo' | 'cosmos' | 'solana' | 'other'

export const getChainTypeFromAsset = (asset: Asset): ChainType => {
  const chainId = asset.chainId

  if (isEvmChainId(chainId)) return 'evm'
  if (chainId.startsWith('bip122:')) return 'utxo'
  if (chainId.startsWith('cosmos:')) return 'cosmos'
  if (chainId.startsWith('solana:')) return 'solana'

  return 'other'
}

export const canExecuteInWidget = (sellAsset: Asset, buyAsset: Asset): boolean => {
  const sellChainType = getChainTypeFromAsset(sellAsset)
  const buyChainType = getChainTypeFromAsset(buyAsset)

  return sellChainType === 'evm' && buyChainType === 'evm'
}
