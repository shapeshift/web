import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import type { CheckTradeStatusInput, TradeStatus } from '../types'
import { checkSafeTransactionStatus } from '../utils'
import { getLatestThorTxStatusMessage } from './getLatestThorTxStatusMessage'
import { parseThorBuyTxHash } from './parseBuyTxHash'
import type { ThornodeStatusResponse, ThornodeTxResponse } from './types'

type CheckTradeStatusInputExtended = CheckTradeStatusInput & {
  url: string
  nativeChain: 'THOR' | 'MAYA'
}

export const checkTradeStatus = async ({
  txHash,
  chainId,
  address,
  fetchIsSmartContractAddressQuery,
  assertGetEvmChainAdapter,
  url,
  nativeChain,
}: CheckTradeStatusInputExtended): Promise<TradeStatus> => {
  try {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    })

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    // not using monadic axios, this is intentional for simplicity in this non-monadic context
    const [{ data: txData }, { data: txStatusData }] = await Promise.all([
      axios.get<ThornodeTxResponse>(`${url}/tx/${txHash.replace(/^0x/, '')}`),
      axios.get<ThornodeStatusResponse>(`${url}/tx/status/${txHash.replace(/^0x/, '')}`),
    ])

    // We care about txStatusData errors because it drives all of the status logic.
    if ('error' in txStatusData) {
      return { buyTxHash: undefined, status: TxStatus.Unknown, message: undefined }
    }

    // We use planned_out_txs to determine the number of out txs because we don't want to derive
    // swap completion based on the length of out_txs which is populated as the trade executed
    const numOutTxs = txStatusData.planned_out_txs?.length ?? 0
    const lastOutTx = txStatusData.out_txs?.[numOutTxs - 1]

    const buyTxHash = parseThorBuyTxHash(txHash, lastOutTx, nativeChain)

    const hasOutboundL1Tx = lastOutTx !== undefined && lastOutTx.chain !== nativeChain
    const hasOutboundNativeTx = lastOutTx !== undefined && lastOutTx.chain === nativeChain

    if (txStatusData.planned_out_txs?.some(plannedOutTx => plannedOutTx.refund)) {
      return { buyTxHash, status: TxStatus.Failed, message: undefined }
    }

    // We consider the transaction confirmed as soon as we have a buyTxHash
    // For UTXOs, this means that the swap will be confirmed as soon as Txs hit the mempool
    // Which is actually correct, as we update UTXO balances optimistically
    if (!('error' in txData) && buyTxHash && (hasOutboundL1Tx || hasOutboundNativeTx)) {
      return { buyTxHash, status: TxStatus.Confirmed, message: undefined }
    }

    const message = getLatestThorTxStatusMessage(txStatusData, hasOutboundL1Tx)

    return { buyTxHash, status: TxStatus.Pending, message }
  } catch (e) {
    console.error(e)
    return { buyTxHash: undefined, status: TxStatus.Unknown, message: undefined }
  }
}
