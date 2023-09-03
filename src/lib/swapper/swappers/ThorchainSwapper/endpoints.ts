import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { getConfig } from 'config'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
  UnsignedTx,
  UtxoFeeData,
} from 'lib/swapper/types'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import { THORCHAIN_AFFILIATE_FEE_BPS } from './utils/constants'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

export const thorchainApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const applyThorSwapAffiliateFees = getConfig().REACT_APP_FEATURE_THOR_SWAP_AFFILIATE_FEES

    const affiliateBps = applyThorSwapAffiliateFees
      ? THORCHAIN_AFFILIATE_FEE_BPS
      : input.affiliateBps

    return await getThorTradeQuote({
      ...input,
      affiliateBps,
    })
  },

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
  }): Promise<UnsignedTx> => {
    const { receiveAddress, affiliateBps } = tradeQuote

    const accountType = accountMetadata?.accountType

    const chainSpecific =
      accountType && xpub
        ? {
            xpub,
            accountType,
            satoshiPerByte: (tradeQuote.steps[0].feeData.chainSpecific as UtxoFeeData).satsPerByte,
          }
        : undefined

    const fromOrXpub = from !== undefined ? { from } : { xpub }
    return await getSignTxFromQuote({
      tradeQuote,
      receiveAddress,
      affiliateBps,
      chainSpecific,
      ...fromOrXpub,
      supportsEIP1559,
    })
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId: buyTxHash } = await getTradeTxs(txHash)
      const status = buyTxHash ? TxStatus.Confirmed : TxStatus.Pending

      return {
        buyTxHash,
        status,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Failed,
        message: undefined,
      }
    }
  },
}
