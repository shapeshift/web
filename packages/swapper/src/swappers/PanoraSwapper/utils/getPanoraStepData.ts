import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
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
    // Simulation needs a sender holding the sell amount, which a walletless rate doesn't have
    const networkFeeCryptoBaseUnit = from
      ? await adapter
          .getCustomTxFeeData({ from, payload })
          .then(({ fast }) => fast.txFee)
          .catch(() => PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT)
      : PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT

    const stepData: PanoraRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  try {
    const { fast } = await adapter.getCustomTxFeeData({ from: args.from, payload })

    const stepData: PanoraQuoteStepData = {
      transactionData: {
        type: 'aptos',
        payload,
        gasUnitPrice: fast.chainSpecific.gasUnitPrice,
        maxGasAmount: fast.chainSpecific.maxGasAmount,
      },
      networkFeeCryptoBaseUnit: fast.txFee,
    }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getPanoraStepData', error))
  }
}
