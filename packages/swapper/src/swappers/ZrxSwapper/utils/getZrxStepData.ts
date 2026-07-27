import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TypedData } from 'eip-712'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { ZrxQuoteResponse } from '../types'

export type GetZrxStepDataArgs = StepDataArgs<
  unknown,
  { totalNetworkFee: string | null },
  {
    transaction: ZrxQuoteResponse['transaction']
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
  if (args.type === 'rate') {
    const stepData: ZrxRateStepData = {
      networkFeeCryptoBaseUnit: bnOrZero(args.totalNetworkFee).toFixed(),
    }

    return Ok(stepData)
  }

  const { sellAsset, transaction, permit2Eip712, from, input, deps } = args

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    // 0x simulate with a valid permit2 signature, which can't be reproduced before signing, so trust their gas limit
    gasLimit: transaction.gas || undefined,
    ...(permit2Eip712 && {
      signatureRequired: {
        type: 'permit2' as const,
        eip712: permit2Eip712 as unknown as TypedData,
      },
    }),
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
      transactionData,
      from,
      supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
    })

    const stepData: ZrxQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getZrxStepData', error))
  }
}
