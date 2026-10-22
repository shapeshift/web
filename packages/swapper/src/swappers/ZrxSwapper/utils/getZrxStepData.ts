import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  bufferGasLimit,
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { ZrxQuoteResponse } from '../types'

export type GetZrxStepDataArgs = StepDataArgs<
  unknown,
  { gas: string | null; totalNetworkFee: string | null },
  {
    transaction: ZrxQuoteResponse['transaction']
    sellAmountCryptoBaseUnit: string
    permit2Eip712: NonNullable<ZrxQuoteResponse['permit2']>['eip712'] | undefined
  }
>

type ZrxRateStepData = { networkFeeCryptoBaseUnit: string }
type ZrxQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getZrxStepData(
  args: Extract<GetZrxStepDataArgs, { type: 'rate' }>,
): Promise<Result<ZrxRateStepData, SwapErrorRight>>
export function getZrxStepData(
  args: Extract<GetZrxStepDataArgs, { type: 'quote' }>,
): Promise<Result<ZrxQuoteStepData, SwapErrorRight>>
export async function getZrxStepData(
  args: GetZrxStepDataArgs,
): Promise<Result<ZrxRateStepData | ZrxQuoteStepData, SwapErrorRight>> {
  const { sellAsset, input, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  // 0x's price endpoint returns no tx data, so there's nothing to simulate
  if (args.type === 'rate') {
    const { gas, totalNetworkFee } = args

    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit: gas,
    }).catch(() => bnOrZero(totalNetworkFee).toFixed())

    const stepData: ZrxRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const { sellAmountCryptoBaseUnit, transaction, permit2Eip712, from } = args

  const transactionData: Extract<TxBuildData, { type: 'evm' }> = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    ...(permit2Eip712 && {
      signatureRequired: {
        type: 'permit2' as const,
        eip712: permit2Eip712,
      },
    }),
  }

  try {
    const networkFeeCryptoBaseUnit = await (() => {
      // Permit2 calldata needs the signature, so it can't be simulated before signing
      if (permit2Eip712) {
        if (!transaction.gas || !bnOrZero(transaction.gas).gt(0))
          throw new Error('missing 0x gas limit')

        transactionData.gasLimit = bufferGasLimit(transaction.gas)

        return getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: transactionData.gasLimit,
        })
      }

      return getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData,
        from,
        supportsEIP1559,
        stateOverride: { sellAsset, sellAmountCryptoBaseUnit },
        providerGasLimit: transaction.gas,
      })
    })()

    const stepData: ZrxQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getZrxStepData', error))
  }
}
