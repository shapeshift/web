import { fromChainId } from '@shapeshiftoss/caip'
import type { TypedData } from 'eip-712'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, TxBuildData } from '../../../types'
import type { ZrxQuoteResponse } from '../types'

// Rates come from the 0x price endpoint which returns no transaction, only its reported fee
type GetZrxStepDataArgs = StepDataArgs<
  unknown,
  { totalNetworkFee: string },
  {
    transaction: ZrxQuoteResponse['transaction']
    permit2Eip712: NonNullable<ZrxQuoteResponse['permit2']>['eip712'] | undefined
  }
>

export const getZrxStepData = async (
  args: GetZrxStepDataArgs,
): Promise<{ transactionData?: TxBuildData; networkFeeCryptoBaseUnit: string }> => {
  if (args.type === 'rate') return { networkFeeCryptoBaseUnit: args.totalNetworkFee }

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

  const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
    adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
    transactionData,
    from,
    supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
  })

  return { transactionData, networkFeeCryptoBaseUnit }
}
