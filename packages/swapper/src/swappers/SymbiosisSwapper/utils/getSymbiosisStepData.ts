import { fromChainId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeTradeStepBuildFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { TronContractCall } from '../../../utils/tron'
import {
  getTronContractCallFallbackFeeCryptoBaseUnit,
  getTronContractCallNetworkFeeCryptoBaseUnit,
} from '../../../utils/tron'
import { buildSymbiosisTronCallData } from './helpers'
import type { SymbiosisSwapTx } from './types'

type BaseArgs = {
  swapTx: SymbiosisSwapTx
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  tronFallbackEnergy: string
}

export type GetSymbiosisStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type SymbiosisRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type SymbiosisQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getSymbiosisStepData(
  args: Extract<GetSymbiosisStepDataArgs, { type: 'rate' }>,
): Promise<Result<SymbiosisRateStepData, SwapErrorRight>>
export function getSymbiosisStepData(
  args: Extract<GetSymbiosisStepDataArgs, { type: 'quote' }>,
): Promise<Result<SymbiosisQuoteStepData, SwapErrorRight>>
export async function getSymbiosisStepData(
  args: GetSymbiosisStepDataArgs,
): Promise<Result<SymbiosisRateStepData | SymbiosisQuoteStepData, SwapErrorRight>> {
  const {
    swapTx,
    sellAsset,
    sellAmountCryptoBaseUnit,
    spenderAddress,
    tronFallbackEnergy,
    from,
    type,
    input,
    deps,
  } = args

  switch (swapTx.type) {
    case 'evm': {
      const { tx } = swapTx
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

      // Symbiosis supplies no gas limit - the fee helper estimates and sets it
      const transactionData = {
        type: 'evm' as const,
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: tx.to,
        data: tx.data,
        value: tx.value ?? '0',
      }

      const stateOverride = { sellAsset, sellAmountCryptoBaseUnit, spenderAddress }

      if (type === 'rate') {
        // Symbiosis returns no source gas figure, so a failed estimate leaves the rate fee unknown
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
          stateOverride,
        }).catch(() => undefined)

        const stepData: SymbiosisRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
          stateOverride,
        })

        const stepData: SymbiosisQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getSymbiosisStepData', error))
      }
    }
    case 'tron': {
      const { tx } = swapTx

      if (!tx.functionSelector) return Err(makeTradeStepBuildFailedErr('getSymbiosisStepData'))

      const adapter = deps.assertGetTronChainAdapter(sellAsset.chainId)

      const call: TronContractCall = {
        to: tx.to,
        data: buildSymbiosisTronCallData({ functionSelector: tx.functionSelector, data: tx.data }),
        value: tx.value ?? '0',
      }

      if (type === 'rate') {
        const networkFeeCryptoBaseUnit = await getTronContractCallFallbackFeeCryptoBaseUnit({
          adapter,
          energy: tronFallbackEnergy,
          bandwidthBytes: tron.getTronContractCallBandwidthBytes(call.data),
          contractAddress: call.to,
        }).catch(() => undefined)

        const stepData: SymbiosisRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      try {
        const stepData: SymbiosisQuoteStepData = {
          transactionData: { type: 'tron', ...call },
          networkFeeCryptoBaseUnit: await getTronContractCallNetworkFeeCryptoBaseUnit({
            adapter,
            transactionData: call,
            from,
            sellAsset,
            sellAmountCryptoBaseUnit,
            spenderAddress,
            fallbackEnergy: tronFallbackEnergy,
          }),
        }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getSymbiosisStepData', error))
      }
    }
    default:
      return Err(makeTradeStepBuildFailedErr('getSymbiosisStepData'))
  }
}
