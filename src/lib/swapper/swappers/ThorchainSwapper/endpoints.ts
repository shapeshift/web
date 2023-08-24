import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx2,
} from 'lib/swapper/api'
import type { ThorUtxoSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import { THORCHAIN_AFFILIATE_FEE_BPS } from './utils/constants'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

export const thorchainApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote2[], SwapErrorRight>> => {
    const { receiveAddress } = input

    const applyThorSwapAffiliateFees = getConfig().REACT_APP_FEATURE_THOR_SWAP_AFFILIATE_FEES

    const affiliateBps = applyThorSwapAffiliateFees
      ? THORCHAIN_AFFILIATE_FEE_BPS
      : input.affiliateBps

    const quoteResult = await getThorTradeQuote(input)

    return quoteResult.map<TradeQuote2[]>(quotes => {
      return quotes.map(quote => ({
        id: uuid(),
        receiveAddress,
        affiliateBps,
        ...quote,
      }))
    })
  },

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
    slippageTolerancePercentageDecimal,
  }): Promise<UnsignedTx2> => {
    const { receiveAddress, affiliateBps } = tradeQuote

    const accountType = accountMetadata?.accountType

    const chainSpecific =
      accountType && xpub
        ? {
            xpub,
            accountType,
            satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
              .chainSpecific.satsPerByte,
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
      slippageTolerancePercentage: slippageTolerancePercentageDecimal,
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
