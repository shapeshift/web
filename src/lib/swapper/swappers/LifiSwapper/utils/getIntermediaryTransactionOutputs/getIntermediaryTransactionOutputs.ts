import type { AmountDisplayMeta } from 'lib/swapper/api'
import { isSome } from 'lib/utils'
import { makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'
import type { LifiStepSubset, StepSubset } from './types'

const isLifiStep = (step: StepSubset): step is LifiStepSubset => step.type === 'lifi'

export const getIntermediaryTransactionOutputs = (
  step: StepSubset,
): AmountDisplayMeta[] | undefined => {
  const tradeSteps = isLifiStep(step) ? step.includedSteps : [step]

  const intermediaryTradeData = tradeSteps.slice(0, -1)

  // exit early if there are no intermediary steps
  if (intermediaryTradeData.length === 0) return

  const assets = selectAssets(store.getState())

  return intermediaryTradeData
    .map(step => {
      const assetId = lifiTokenToAssetId(step.action.toToken)

      const asset =
        assets[assetId] ??
        makeAsset({
          assetId,
          name: step.action.toToken.name,
          symbol: step.action.toToken.symbol,
          precision: step.action.toToken.decimals,
        })

      return {
        asset,
        amountCryptoBaseUnit: step.estimate.toAmountMin,
      }
    })
    .filter(isSome)
}
