import { tronChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { createDefaultStatusResponse } from '../../utils'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getSunioTradeQuote } from './getSunioTradeQuote/getSunioTradeQuote'
import { getSunioTradeRate } from './getSunioTradeRate/getSunioTradeRate'
import type { SunioTradeQuoteInput, SunioTradeRateInput } from './types'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const sunioApi: SwapperApi = {
  getTradeQuote: (input, deps) => getSunioTradeQuote(input as SunioTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getSunioTradeRate(input as SunioTradeRateInput, deps),

  getUnsignedTronTransaction,
  getTronTransactionFees,

  checkTradeStatus: async ({ txHash, assertGetTronChainAdapter }) => {
    try {
      // Wait for TronGrid indexing to avoid false "REVERT"
      await sleep(2000)

      const adapter = assertGetTronChainAdapter(tronChainId)
      const tx = await adapter.httpProvider.getTransaction({ txid: txHash })

      if (!tx) {
        return createDefaultStatusResponse(txHash)
      }

      const contractRet = tx.ret?.[0]?.contractRet

      // Tron reports many failure codes (REVERT, OUT_OF_ENERGY, OUT_OF_TIME, ...). A missing
      // contractRet means it isn't mined yet; any non-SUCCESS value is a terminal failure.
      const status = (() => {
        if (!contractRet) return TxStatus.Pending
        if (contractRet === 'SUCCESS') {
          return tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending
        }
        return TxStatus.Failed
      })()

      return {
        status,
        buyTxHash: txHash,
        message: undefined,
      }
    } catch (error) {
      console.error('[Sun.io] Error checking trade status:', error)
      return createDefaultStatusResponse(txHash)
    }
  },
}
