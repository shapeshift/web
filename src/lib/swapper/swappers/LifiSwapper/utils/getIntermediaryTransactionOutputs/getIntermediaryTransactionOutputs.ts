import type { IntermediaryTransactionOutput } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { lifiChainIdToChainId } from '../lifiChainIdtoChainId/lifiChainIdToChainId'
import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'
import type { LifiStepSubset, StepSubset } from './types'

const isLifiStep = (step: StepSubset): step is LifiStepSubset => step.type === 'lifi'

export const getIntermediaryTransactionOutputs = (
  selectedLifiRouteSteps: StepSubset[],
): IntermediaryTransactionOutput[] | undefined => {
  const tradeSteps = selectedLifiRouteSteps.flatMap(step =>
    isLifiStep(step) ? step.includedSteps : step,
  )

  const intermediaryTradeData = tradeSteps.slice(0, -1)

  // exit early if there are no intermediary steps
  if (intermediaryTradeData.length === 0) return

  const assets = selectAssets(store.getState())

  return intermediaryTradeData
    .map(step => {
      const assetId = lifiTokenToAssetId(step.action.toToken)

      const asset = assets[assetId] ?? {
        chainId: lifiChainIdToChainId(step.action.toToken.chainId),
        symbol: step.action.toToken.symbol,
        precision: step.action.toToken.decimals,
      }

      return {
        asset,
        buyAmountCryptoBaseUnit: step.estimate.toAmountMin,
      }
    })
    .filter((item): item is IntermediaryTransactionOutput => item !== undefined)
}
