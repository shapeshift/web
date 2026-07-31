import type { mayachain, SignTx, thorchain } from '@shapeshiftoss/chain-adapters'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'

import type { GetUnsignedCosmosSdkTransactionArgs } from '../../types'
import { getCosmosSdkExecutionContext } from './getCosmosSdkExecutionContext'

export const getUnsignedCosmosSdkTransaction = async (
  args: GetUnsignedCosmosSdkTransactionArgs,
): Promise<SignTx<CosmosSdkChainId>> => {
  const { from } = args

  const { step, adapter, transactionData, feeData } = await getCosmosSdkExecutionContext(args)

  const { accountNumber } = step
  const chainSpecific = { gas: feeData.chainSpecific.gasLimit, fee: feeData.txFee }

  if (transactionData.type === 'cosmossdk_msg_deposit') {
    const { value, memo, coin } = transactionData

    if (!('buildDepositTransaction' in adapter)) {
      throw new Error('adapter does not support deposit transactions')
    }

    const depositAdapter = adapter as thorchain.ChainAdapter | mayachain.ChainAdapter

    const { txToSign } = await depositAdapter.buildDepositTransaction({
      accountNumber,
      from,
      value,
      memo,
      chainSpecific: { ...chainSpecific, coin },
    })

    return txToSign
  }

  const { to, value, memo } = transactionData

  const { txToSign } = await adapter.buildSendApiTransaction({
    accountNumber,
    from,
    to,
    value,
    memo,
    chainSpecific,
  })

  return txToSign
}
