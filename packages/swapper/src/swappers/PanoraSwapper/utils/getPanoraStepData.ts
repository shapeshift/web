import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getAptosNetworkFeeCryptoBaseUnit } from '../../../utils/aptos'
import { PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT } from './constants'

export type GetPanoraStepDataArgs = StepDataArgs<{ payload: string }>

type PanoraRateStepData = { networkFeeCryptoBaseUnit: string }
type PanoraQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getPanoraStepData(
  args: Extract<GetPanoraStepDataArgs, { type: 'rate' }>,
): Promise<Result<PanoraRateStepData, SwapErrorRight>>
export function getPanoraStepData(
  args: Extract<GetPanoraStepDataArgs, { type: 'quote' }>,
): Promise<Result<PanoraQuoteStepData, SwapErrorRight>>
export async function getPanoraStepData(
  args: GetPanoraStepDataArgs,
): Promise<Result<PanoraRateStepData | PanoraQuoteStepData, SwapErrorRight>> {
  const { sellAsset, payload, from, deps } = args

  const adapter = deps.assertGetAptosChainAdapter(sellAsset.chainId)

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = from
      ? await getAptosNetworkFeeCryptoBaseUnit({ adapter, from, payload })
          .then(({ networkFeeCryptoBaseUnit }) => networkFeeCryptoBaseUnit)
          .catch(() => PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT)
      : PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT

    const stepData: PanoraRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const { networkFeeCryptoBaseUnit, feeData } = await getAptosNetworkFeeCryptoBaseUnit({
      adapter,
      from: args.from,
      payload,
    })

    const stepData: PanoraQuoteStepData = {
      transactionData: {
        type: 'aptos',
        payload,
        gasUnitPrice: feeData.chainSpecific.gasUnitPrice,
        maxGasAmount: feeData.chainSpecific.maxGasAmount,
      },
      networkFeeCryptoBaseUnit,
    }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getPanoraStepData', error))
  }
}
