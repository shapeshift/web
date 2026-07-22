import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'

import type { GetUnsignedUtxoTransactionArgs } from '../types'
import { getUtxoExecutionContext } from './getUtxoExecutionContext'

export const getUnsignedUtxoTransaction = async (
  args: GetUnsignedUtxoTransactionArgs,
): Promise<SignTx<UtxoChainId>> => {
  const { xpub, accountType } = args

  const { step, adapter, transactionData, feeData } = await getUtxoExecutionContext(args)

  const { accountNumber } = step
  const { to, value, opReturnData } = transactionData

  return adapter.buildSendApiTransaction({
    value,
    xpub,
    to,
    accountNumber,
    skipToAddressValidation: true,
    chainSpecific: {
      accountType,
      opReturnData,
      satoshiPerByte: feeData.chainSpecific.satoshiPerByte,
    },
  })
}
