import type { AssetId } from '../types'

const SHAPESHIFT_APP_URL = 'https://app.shapeshift.com'

export type RedirectParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountBaseUnit?: string
  partnerCode?: string
}

export const buildShapeShiftTradeUrl = (params: RedirectParams): string => {
  const { sellAssetId, buyAssetId, sellAmountBaseUnit, partnerCode } = params

  // CAIP-19 assetIds have format "chainId/assetSubId" e.g. "eip155:1/slip44:60"
  // The first "/" separates chainId from assetSubId
  const buySlashIdx = buyAssetId.indexOf('/')
  const buyChainId = buyAssetId.substring(0, buySlashIdx)
  const buyAssetSubId = buyAssetId.substring(buySlashIdx + 1)

  const sellSlashIdx = sellAssetId.indexOf('/')
  const sellChainId = sellAssetId.substring(0, sellSlashIdx)
  const sellAssetSubId = sellAssetId.substring(sellSlashIdx + 1)

  const amount = sellAmountBaseUnit || '0'
  const partner = partnerCode ? `?partner=${encodeURIComponent(partnerCode)}` : ''

  return `${SHAPESHIFT_APP_URL}/#/trade/${buyChainId}/${buyAssetSubId}/${sellChainId}/${sellAssetSubId}/${amount}${partner}`
}
