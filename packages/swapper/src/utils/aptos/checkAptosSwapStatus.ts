import { aptosChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../types'
import { createDefaultStatusResponse } from '../../utils'

export const checkAptosSwapStatus = async ({
  txHash,
  assertGetAptosChainAdapter,
}: Pick<CheckTradeStatusInput, 'assertGetAptosChainAdapter'> & {
  txHash: string
}): Promise<TradeStatus> => {
  try {
    const adapter = assertGetAptosChainAdapter(aptosChainId)

    const tx = await adapter.getAptosClient().getTransactionByHash({ transactionHash: txHash })

    if (tx.type === 'pending_transaction') {
      return { status: TxStatus.Pending, buyTxHash: undefined, message: undefined }
    }

    if (tx.type !== 'user_transaction') return createDefaultStatusResponse(txHash)

    return {
      status: tx.success ? TxStatus.Confirmed : TxStatus.Failed,
      buyTxHash: txHash,
      message: tx.success ? undefined : tx.vm_status,
    }
  } catch (e) {
    console.error(e)
    return createDefaultStatusResponse(txHash)
  }
}
