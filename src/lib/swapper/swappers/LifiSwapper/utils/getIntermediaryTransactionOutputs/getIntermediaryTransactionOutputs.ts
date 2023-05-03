import type { Route } from '@lifi/sdk'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { IntermediaryTransactionOutput } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'

export const getIntermediaryTransactionOutputs = (
  selectedLifiRoute: Route,
  buyAmountCryptoBaseUnit: BigNumber,
): IntermediaryTransactionOutput[] | undefined => {
  const flatSteps = selectedLifiRoute.steps.flatMap(step =>
    step.type === 'lifi' ? step.includedSteps : step,
  )

  // cant fail half way if there is 1 or less steps to execute
  if (flatSteps.length <= 1) return

  const assets = selectAssets(store.getState())

  const lastStep = flatSteps[flatSteps.length - 1]

  const buyAssetUsdRate = bnOrZero(lastStep.action.toToken.priceUSD)

  return flatSteps
    .slice(0, -1) // last step is the actual buy asset so slice it off
    .map(step => {
      const lifiToken = step.action.toToken
      const assetId = lifiTokenToAssetId(lifiToken)
      const usdRate = bnOrZero(lastStep.action.toToken.priceUSD)
      const rate = usdRate.isZero() ? bn(0) : buyAssetUsdRate.div(usdRate)
      const tokenBuyAmountCryptoPrecision = buyAmountCryptoBaseUnit.times(rate)

      return {
        asset: assets[assetId],
        buyAmountCryptoBaseUnit: tokenBuyAmountCryptoPrecision.toString(),
      }
    })
    .filter((item): item is IntermediaryTransactionOutput => item !== undefined)
}
