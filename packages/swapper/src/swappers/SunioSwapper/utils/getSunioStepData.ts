import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import type { SunioRoute, SunioTransactionData } from '../types'
import { estimateSunioNetworkFeeCryptoBaseUnit } from './estimateSunioNetworkFee'

type BaseArgs = { route: SunioRoute; sellAmountCryptoBaseUnit: string }

export type GetSunioStepDataArgs = StepDataArgs<BaseArgs>

type SunioRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type SunioQuoteStepData = {
  networkFeeCryptoBaseUnit: string
  sunioTransactionData: SunioTransactionData
}

export function getSunioStepData(
  args: Extract<GetSunioStepDataArgs, { type: 'rate' }>,
): Promise<Result<SunioRateStepData, SwapErrorRight>>
export function getSunioStepData(
  args: Extract<GetSunioStepDataArgs, { type: 'quote' }>,
): Promise<Result<SunioQuoteStepData, SwapErrorRight>>
export async function getSunioStepData(
  args: GetSunioStepDataArgs,
): Promise<Result<SunioRateStepData | SunioQuoteStepData, SwapErrorRight>> {
  const { type, route, sellAsset, sellAmountCryptoBaseUnit, from, input, deps } = args

  const estimateArgs = {
    adapter: deps.assertGetTronChainAdapter(tronChainId),
    route,
    sellAmountCryptoBaseUnit,
    isSellingNativeTrx: sellAsset.assetId === tronAssetId,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
  }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      if (!from) return undefined

      try {
        return await estimateSunioNetworkFeeCryptoBaseUnit({ ...estimateArgs, address: from })
      } catch {
        return undefined
      }
    })()

    const stepData: SunioRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const networkFeeCryptoBaseUnit = await estimateSunioNetworkFeeCryptoBaseUnit({
      ...estimateArgs,
      address: from,
    })

    const stepData: SunioQuoteStepData = {
      networkFeeCryptoBaseUnit,
      sunioTransactionData: { route },
    }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getSunioStepData', error))
  }
}
