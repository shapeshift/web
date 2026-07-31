import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { estimateGasWithStateOverride, getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { PortalsTx } from './fetchPortalsTradeOrder'
import { fetchPortalsTradeEstimate } from './fetchPortalsTradeOrder'

type BaseArgs = {
  tx: PortalsTx
}

export type GetPortalsStepDataArgs = StepDataArgs<
  BaseArgs,
  {
    target: string
    inputToken: string
    outputToken: string
    inputAmount: string
    slippageTolerancePercentage: number
  }
>

type PortalsRateStepData = { networkFeeCryptoBaseUnit: string }
type PortalsQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getPortalsStepData(
  args: Extract<GetPortalsStepDataArgs, { type: 'rate' }>,
): Promise<Result<PortalsRateStepData, SwapErrorRight>>
export function getPortalsStepData(
  args: Extract<GetPortalsStepDataArgs, { type: 'quote' }>,
): Promise<Result<PortalsQuoteStepData, SwapErrorRight>>
export async function getPortalsStepData(
  args: GetPortalsStepDataArgs,
): Promise<Result<PortalsRateStepData | PortalsQuoteStepData, SwapErrorRight>> {
  const { tx, sellAsset, input, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (args.type === 'rate') {
    try {
      // No placeholder estimation for provider built routes - overridden estimation (approval
      // state need not exist yet) with the Portals estimate endpoint as fallback
      const gasLimit = await (async () => {
        try {
          return await estimateGasWithStateOverride({
            sellAsset,
            sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            from: tx.from,
            spenderAddress: getAddress(args.target),
            to: tx.to,
            data: tx.data,
            value: tx.value,
          })
        } catch {
          const quoteEstimateResponse = await fetchPortalsTradeEstimate({
            inputToken: args.inputToken,
            outputToken: args.outputToken,
            inputAmount: args.inputAmount,
            slippageTolerancePercentage: args.slippageTolerancePercentage,
            swapperConfig: deps.config,
          })

          return quoteEstimateResponse.context.gasLimit.toString()
        }
      })()

      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        supportsEIP1559,
        gasLimit,
      })

      const stepData: PortalsRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    } catch (error) {
      return Err(makeNetworkFeeEstimationFailedErr('getPortalsStepData', error))
    }
  }

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
    // Portals simulate and pad their gas limit, so no additional buffer
    gasLimit: tx.gasLimit,
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from: args.from,
      supportsEIP1559,
    })

    const stepData: PortalsQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getPortalsStepData', error))
  }
}
