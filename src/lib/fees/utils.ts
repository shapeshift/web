import type { Asset } from '@shapeshiftoss/types'
import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'
import { DEFAULT_FEE_BPS } from './constant'

import { readStoredPartnerBps } from '@/hooks/useAffiliateTracking/useAffiliateTracking'

type CalculateFeeUsdArgs = {
  inputAmountUsd: BigNumber.Value
}

export const calculateFeeUsd = ({ inputAmountUsd }: CalculateFeeUsdArgs): BigNumber => {
  const feeBps = bn(DEFAULT_FEE_BPS)
  const feeUsd = bnOrZero(inputAmountUsd).times(feeBps.div(bn(10000)))

  return feeUsd
}

const isRelatedAssetSwap = (sellAsset: Asset, buyAsset: Asset): boolean => {
  const sellAssetKey = sellAsset.relatedAssetKey
  const buyAssetKey = buyAsset.relatedAssetKey

  return (
    (sellAssetKey && buyAssetKey && sellAssetKey === buyAssetKey) ||
    sellAssetKey === buyAsset.assetId ||
    buyAssetKey === sellAsset.assetId
  )
}

export const getAffiliateBps = (sellAsset: Asset, buyAsset: Asset): string => {
  if (isRelatedAssetSwap(sellAsset, buyAsset)) return '0'

  const partnerBps = readStoredPartnerBps()
  return partnerBps ?? DEFAULT_FEE_BPS
}
