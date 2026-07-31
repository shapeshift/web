import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { RATE_SIM_TIMEOUT_MS, simulateWithStateOverrides } from '../../../utils/tenderly'
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
      // No placeholder estimation for provider built routes - Tenderly sim (approval state-overridden)
      // with the Portals estimate endpoint as fallback
      const gasLimit = await (async () => {
        const tenderlySimulation = await simulateWithStateOverrides(
          {
            chainId: sellAsset.chainId,
            from: tx.from,
            to: tx.to,
            data: tx.data as Hex,
            value: tx.value,
            sellAsset,
            spenderAddress: getAddress(args.target),
            timeoutMs: RATE_SIM_TIMEOUT_MS,
          },
          {
            apiKey: deps.config.VITE_TENDERLY_API_KEY,
            accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
            projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
          },
        )

        if (tenderlySimulation.success) return tenderlySimulation.gasLimit.toString()

        const quoteEstimateResponse = await fetchPortalsTradeEstimate({
          inputToken: args.inputToken,
          outputToken: args.outputToken,
          inputAmount: args.inputAmount,
          slippageTolerancePercentage: args.slippageTolerancePercentage,
          swapperConfig: deps.config,
        })

        return quoteEstimateResponse.context.gasLimit.toString()
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
