import { fromChainId } from '@shapeshiftoss/caip'
import { BigNumber, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  bufferGasLimit,
  getEvmNetworkFeeCryptoBaseUnit,
  isPositiveGasLimit,
} from '../../../utils/evm'
import type { ZrxQuoteResponse } from '../types'

export type GetZrxStepDataArgs = StepDataArgs<
  unknown,
  { totalNetworkFee: string | null },
  {
    transaction: ZrxQuoteResponse['transaction']
    totalNetworkFee: string | null
    sellAmountCryptoBaseUnit: string
    permit2Eip712: NonNullable<ZrxQuoteResponse['permit2']>['eip712'] | undefined
  }
>

type ZrxRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
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
  // 0x's total includes the L1 data fee on OP-stack chains, which pricing their gas limit would drop
  if (args.type === 'rate') {
    const stepData: ZrxRateStepData = {
      networkFeeCryptoBaseUnit: args.totalNetworkFee ?? undefined,
    }

    return Ok(stepData)
  }

  const {
    sellAsset,
    sellAmountCryptoBaseUnit,
    transaction,
    totalNetworkFee,
    permit2Eip712,
    from,
    input,
    deps,
  } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

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
    const networkFeeCryptoBaseUnit = await (async () => {
      // Permit2 calldata needs the signature, so it can't be simulated before signing
      if (permit2Eip712) {
        if (!isPositiveGasLimit(transaction.gas)) throw new Error('missing 0x gas limit')

        transactionData.gasLimit = bufferGasLimit(transaction.gas)

        // 0x's total is their gas cost plus the L1 data fee on OP-stack chains
        const l1FeeCryptoBaseUnit = BigNumber.max(
          bnOrZero(totalNetworkFee).minus(bnOrZero(transaction.gas).times(transaction.gasPrice)),
          0,
        )

        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          supportsEIP1559,
          gasLimit: transactionData.gasLimit,
        })

        return bnOrZero(networkFeeCryptoBaseUnit).plus(l1FeeCryptoBaseUnit).toFixed(0)
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
