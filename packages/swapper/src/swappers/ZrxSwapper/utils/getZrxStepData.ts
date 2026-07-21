import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { TypedData } from 'eip-712'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { TxBuildData } from '../../../types'
import type { ZrxQuoteResponse } from '../types'

export const getZrxStepData = async ({
  adapter,
  chainId,
  transaction,
  permit2Eip712,
  from,
  supportsEIP1559,
}: {
  adapter: EvmChainAdapter
  chainId: ChainId
  transaction: ZrxQuoteResponse['transaction']
  permit2Eip712: NonNullable<ZrxQuoteResponse['permit2']>['eip712'] | undefined
  from: string
  supportsEIP1559: boolean
}): Promise<{ transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }> => {
  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(chainId).chainReference),
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
    adapter,
    transactionData,
    from,
    supportsEIP1559,
  })

  return { transactionData, networkFeeCryptoBaseUnit }
}
