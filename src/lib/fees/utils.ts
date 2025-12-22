import type { Asset } from '@shapeshiftoss/types'
import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'
import { DEFAULT_FEE_BPS } from './constant'

type CalculateFeeUsdArgs = {
  inputAmountUsd: BigNumber.Value
}

export const calculateFeeUsd = ({ inputAmountUsd }: CalculateFeeUsdArgs): BigNumber => {
  const feeBps = bn(DEFAULT_FEE_BPS)
  const feeUsd = bnOrZero(inputAmountUsd).times(feeBps.div(bn(10000)))

  return feeUsd
}

export const getAffiliateBps = (sellAsset: Asset, buyAsset: Asset): string => {
  const sellAssetKey = sellAsset.relatedAssetKey
  const buyAssetKey = buyAsset.relatedAssetKey

  // Both assets have the same relatedAssetKey - they're in the same asset group
  if (sellAssetKey && buyAssetKey && sellAssetKey === buyAssetKey) {
    return '0'
  }

  // One of them IS the relatedAssetKey of the other
  // e.g., sellAsset is ETH (assetId = 'eip155:1/slip44:60')
  // and buyAsset is Arb ETH (relatedAssetKey = 'eip155:1/slip44:60')
  if (sellAssetKey === buyAsset.assetId || buyAssetKey === sellAsset.assetId) {
    return '0'
  }

  return DEFAULT_FEE_BPS
}
