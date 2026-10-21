import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { PortalsTx } from './fetchPortalsTradeOrder'
import { fetchPortalsTradeEstimate } from './fetchPortalsTradeOrder'

type BaseArgs = {
  tx: PortalsTx
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
}

export type GetPortalsStepDataArgs = StepDataArgs<
  BaseArgs,
  {
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
  const { tx, sellAsset, sellAmountCryptoBaseUnit, spenderAddress, input, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
  }

  const stateOverride = {
    sellAsset,
    sellAmountCryptoBaseUnit,
    spenderAddress,
  }

  if (args.type === 'rate') {
    // Portals only carry a tx gas limit on the bridge routes their estimate endpoint zeroes
    const getProviderGasLimit = async () => {
      if (tx.gasLimit && bnOrZero(tx.gasLimit).gt(0)) return tx.gasLimit

      const quoteEstimateResponse = await fetchPortalsTradeEstimate({
        inputToken: args.inputToken,
        outputToken: args.outputToken,
        inputAmount: args.inputAmount,
        slippageTolerancePercentage: args.slippageTolerancePercentage,
        swapperConfig: deps.config,
      })

      const estimatedGasLimit = quoteEstimateResponse.context.gasLimit.toString()

      if (bnOrZero(estimatedGasLimit).lte(0)) throw new Error('no Portals gas limit')

      return estimatedGasLimit
    }

    try {
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData,
        from: tx.from,
        supportsEIP1559,
        stateOverride,
      }).catch(async () =>
        getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: await getProviderGasLimit(),
        }),
      )

      const stepData: PortalsRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    } catch (error) {
      return Err(makeNetworkFeeEstimationFailedErr('getPortalsStepData', error))
    }
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from: args.from,
      supportsEIP1559,
      stateOverride,
    })

    const stepData: PortalsQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getPortalsStepData', error))
  }
}
