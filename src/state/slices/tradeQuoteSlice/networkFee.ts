import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tempoAssetId, tempoChainId, tempoPathUsdAssetId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { convertPrecision } from '@shapeshiftoss/utils'

export const getEffectiveNetworkFeeAssetId = (step: TradeQuoteStep): AssetId => {
  const rawNetworkFeeAssetId = step.feeData.networkFeeAssetId ?? step.sellAsset.assetId

  if (step.sellAsset.chainId !== tempoChainId) return rawNetworkFeeAssetId
  if (rawNetworkFeeAssetId !== tempoAssetId) return rawNetworkFeeAssetId

  const { assetNamespace } = fromAssetId(step.sellAsset.assetId)
  return assetNamespace === 'erc20' ? step.sellAsset.assetId : tempoPathUsdAssetId
}

export const getEffectiveNetworkFeeCryptoBaseUnit = ({
  step,
  feeAssetPrecision,
}: {
  step: TradeQuoteStep
  feeAssetPrecision: number
}): string | undefined => {
  const networkFeeCryptoBaseUnit = step.feeData.networkFeeCryptoBaseUnit
  if (!networkFeeCryptoBaseUnit) return networkFeeCryptoBaseUnit

  const rawNetworkFeeAssetId = step.feeData.networkFeeAssetId ?? step.sellAsset.assetId

  if (step.sellAsset.chainId !== tempoChainId) return networkFeeCryptoBaseUnit
  if (rawNetworkFeeAssetId !== tempoAssetId) return networkFeeCryptoBaseUnit

  return convertPrecision({
    value: networkFeeCryptoBaseUnit,
    inputExponent: 18,
    outputExponent: feeAssetPrecision,
  }).toFixed(0)
}
